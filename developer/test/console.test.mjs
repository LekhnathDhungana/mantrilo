import test from 'node:test';
import assert from 'node:assert/strict';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';
import { hash, currentPeriod, plans, proposedAddons, secret } from '../server/domain.mjs';
import { bootstrapAdmin } from '../server/bootstrap.mjs';
async function fixture(t,mode='demo'){
 const store=new MemoryStore(),sessions=new DemoSessions();await seedDemo(store);
 const server=createConsoleServer({store,sessions,mode,appOrigin:'http://localhost:4190',staticRoot:'/tmp/nonexistent-console-test'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 function client(){const jar=new Map();let csrf='';return {jar,async call(path,method='GET',data,extra={}){
  if(method!=='GET'&&!csrf){const r=await this.call('/api/auth/csrf');csrf=r.body.csrfToken;}
  const response=await fetch(base+path,{method,headers:{Origin:'http://localhost:4190',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(method!=='GET'?{'X-CSRF-Token':csrf,'Content-Type':'application/json'}:{}),...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});
  for(const cookie of response.headers.getSetCookie()){const [entry]=cookie.split(';');const index=entry.indexOf('=');jar.set(entry.slice(0,index),entry.slice(index+1));}
  return {status:response.status,body:await response.json(),headers:response.headers};
 },async login(role='customer'){return this.call('/api/auth/demo','POST',{role});}};}
 return {store,sessions,server,base,client};
}

test('unauthenticated routes, CSRF, origin checking and logout invalidation',async t=>{
 const f=await fixture(t),c=f.client();assert.equal((await c.call('/api/me')).status,401);
 assert.equal((await c.login()).status,200);assert.equal((await c.call('/api/me')).body.user.admin,false);
 assert.equal((await c.call('/api/keys','POST',{name:'blocked',environment:'sandbox'},{Origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await c.call('/api/keys','POST',{name:'blocked',environment:'sandbox'},{'X-CSRF-Token':'wrong'})).status,403);
 const oldSession=c.jar.get('mantrilo_session');assert.ok(oldSession);assert.equal((await c.call('/api/auth/logout','POST')).status,200);
 c.jar.set('mantrilo_session',oldSession);assert.equal((await c.call('/api/me')).status,401);
});
test('one-time key disclosure, hashes, ownership isolation, and revocation',async t=>{
 const f=await fixture(t),owner=f.client();await owner.login();
 const result=await owner.call('/api/keys','POST',{name:'My server',environment:'sandbox'});assert.equal(result.status,201);assert.match(result.body.secret,/^mtr_sbx_/);
 const raw=result.body.secret,id=result.body.key.id,list=await owner.call('/api/keys');assert.ok(!JSON.stringify(list.body).includes(raw));assert.ok(!JSON.stringify(list.body).includes('"hash"'));
 assert.ok(!JSON.stringify(await f.store.getWorkspace('workspace_demo_owner')).includes(raw));
 await f.store.ensureWorkspace('other-workspace','other-owner','Other');await f.store.putUser('other-owner',{workspaceId:'other-workspace'});
 const token=secret();f.sessions.sessions.set(hash(token),{uid:'other-owner',email:'other@demo.invalid',admin:false,expiresAt:Date.now()+100000});const other=f.client();other.jar.set('mantrilo_session',token);
 assert.equal((await other.call(`/api/keys/${id}`,'DELETE')).status,404);assert.deepEqual((await other.call('/api/keys')).body.keys,[]);
 assert.equal((await owner.call('/api/demo/catalog?type=books','GET',undefined,{Authorization:`Bearer ${raw}`})).status,200);
 assert.equal((await owner.call(`/api/keys/${id}`,'DELETE')).status,200);
 assert.equal((await owner.call('/api/demo/catalog','GET',undefined,{Authorization:`Bearer ${raw}`})).status,401);
 const me=(await owner.call('/api/me')).body;assert.equal(me.usage.contentRequests,1);assert.equal(me.usage.audioBytes,0);assert.equal(me.usage.astrologyCredits,0);
});
test('concurrent quota reservations cannot exceed remaining allowance; failures cost zero',async t=>{
 const f=await fixture(t),c=f.client();await c.login();const created=await c.call('/api/keys','POST',{name:'Concurrency',environment:'sandbox'});
 await f.store.transact('workspace_demo_owner',w=>{w.usage[currentPeriod()]={contentRequests:999,audioBytes:0,astrologyCredits:0,daily:{},endpoints:{}};});
 const responses=await Promise.all(Array.from({length:16},()=>c.call('/api/demo/catalog?type=text','GET',undefined,{Authorization:`Bearer ${created.body.secret}`})));
 assert.equal(responses.filter(r=>r.status===200).length,1);assert.equal(responses.filter(r=>r.status===429).length,15);
 const me=(await c.call('/api/me')).body;assert.equal(me.usage.contentRequests,1000);assert.ok(me.workspace.logs.filter(l=>l.type==='error').every(l=>l.cost.contentRequests===0));
 assert.ok(!JSON.stringify(me.workspace.logs).includes(created.body.secret));
});
test('paid product limits and Sandbox production restriction are server-side',async t=>{
 const f=await fixture(t),c=f.client();await c.login();assert.equal((await c.call('/api/products','POST',{name:'Not paid',type:'app',environment:'production'})).status,403);
 assert.equal((await c.call('/api/keys','POST',{name:'Live',environment:'production'})).status,403);
 await f.store.transact('workspace_demo_owner',w=>{w.plan='Starter';});
 const records=await Promise.all([c.call('/api/products','POST',{name:'One',type:'app',environment:'production'}),c.call('/api/products','POST',{name:'Two',type:'website',environment:'production'})]);
 assert.deepEqual(records.map(r=>r.status).sort(),[201,409]);
});
test('administrator actions reject customers; provisional settings cannot enable purchases',async t=>{
 const f=await fixture(t),customer=f.client(),admin=f.client();await customer.login();await admin.login('admin');
 assert.equal((await customer.call('/api/admin/workspaces')).status,403);
 assert.equal((await customer.call('/api/admin/astrology','PATCH',{credits:{starter:1,growth:1,business:1}})).status,403);
 assert.equal((await admin.call('/api/admin/workspaces')).status,200);
 assert.equal((await admin.call('/api/admin/astrology','PATCH',{credits:{starter:2500,growth:10000,business:40000},billingConfigured:true,costsConfirmed:true})).status,200);
 const config=(await admin.call('/api/admin/astrology')).body.config;assert.equal(config.credits.starter,2500);assert.equal(config.billingConfigured,false);assert.equal(config.costsConfirmed,false);
 const publicConfig=(await customer.call('/api/config')).body;assert.deepEqual(publicConfig.astrology.map(a=>a.combined),[78,228,598]);assert.equal((await customer.call('/api/astrology')).body.canPurchase,false);
 const bill=(await customer.call('/api/billing')).body;assert.equal(bill.monthlyTotal,0);assert.deepEqual(bill.invoices,[]);assert.equal(bill.period,null);
});
test('settings persist, date filters validate, errors do not expose input details',async t=>{
 const f=await fixture(t),c=f.client();await c.login();
 assert.equal((await c.call('/api/settings','PATCH',{name:'Updated workspace',emailNotifications:true,usageAlertThreshold:75})).status,200);
 assert.equal((await c.call('/api/me')).body.workspace.name,'Updated workspace');
 assert.equal((await c.call('/api/usage?from=2026-02-30&to=2026-03-01')).status,400);
 assert.equal((await c.call('/api/not-supported?birth=private-exact-birth-detail')).status,404);
 assert.ok(!JSON.stringify((await c.call('/api/me')).body.workspace.logs).includes('private-exact-birth-detail'));
});
test('Firebase mode exposes no demo login or simulated catalog',async t=>{
 const f=await fixture(t,'firebase'),c=f.client();assert.equal((await c.login()).status,404);assert.equal((await c.call('/api/demo/catalog')).status,503);
});
test('content prices and proposed totals match the requested contract',()=>{
 assert.deepEqual(plans.map(p=>[p.price,p.requests,p.audio,p.products]),[[0,'1,000','Sample audio only','Testing only'],[49,'50,000','10 GB','1'],[149,'250,000','50 GB','3'],[399,'1,000,000','200 GB','10']]);assert.deepEqual(proposedAddons.map(a=>a.price),[29,79,199]);
});
test('administrator bootstrap is idempotent and never resets an existing password',async()=>{
 let record=null,creations=0,claimUpdates=0;const auth={async getUserByEmail(){if(record)return record;throw Object.assign(new Error('missing'),{code:'auth/user-not-found'});},async createUser(input){creations++;record={uid:'admin-test',email:input.email,customClaims:{existing:true}};return record;},async setCustomUserClaims(uid,claims){claimUpdates++;record.customClaims=claims;}};
 const store=new MemoryStore();await assert.rejects(()=>bootstrapAdmin({auth,store}),/MANTRILO_INITIAL_ADMIN_PASSWORD/);
 assert.equal((await bootstrapAdmin({auth,store,password:secret()})).created,true);
 assert.equal((await bootstrapAdmin({auth,store})).created,false);assert.equal(creations,1);assert.equal(claimUpdates,2);assert.equal(record.customClaims.admin,true);assert.equal(record.customClaims.existing,true);assert.equal((await store.listWorkspaces()).length,1);
});
