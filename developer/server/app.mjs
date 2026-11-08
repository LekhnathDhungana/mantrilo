import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApiError, insist, secret, equal, hash, cleanText, plans, getPlan, allowance, publicWorkspace, usage, currentPeriod, log, chargeRequest, accountingPolicy, proposedAddons } from './domain.mjs';
import { catalog } from './fixtures.mjs';
import { calculate, OPERATIONS, ENGINE_VERSION } from './astrology/engine.mjs';
import { chargeCalculation, sandboxLimit } from './astrology/accounting.mjs';

function cookies(request) {return Object.fromEntries((request.headers.cookie||'').split(';').map(part=>part.trim().split('=')).filter(pair=>pair.length===2));}
async function body(request) {
 let raw='';for await(const chunk of request){raw+=chunk;insist(Buffer.byteLength(raw)<16384,413,'request_too_large','Request is too large.');}
 if(!raw)return {};try{return JSON.parse(raw);}catch{throw new ApiError(400,'invalid_json','Expected JSON request body.');}
}
export class DemoSessions {
 constructor(){this.sessions=new Map();}
 async createDemo(role='customer'){const token=secret();this.sessions.set(hash(token),{uid:role==='admin'?'demo_admin':'demo_owner',email:role==='admin'?'admin@demo.invalid':'developer@demo.invalid',admin:role==='admin',expiresAt:Date.now()+8*3600e3});return token;}
 async get(token){const session=this.sessions.get(hash(token||''));return session&&session.expiresAt>Date.now()?session:null;}
 async delete(token){this.sessions.delete(hash(token||''));}
 async customerByEmail(){throw new ApiError(409,'demo_only','Customer provisioning requires Firebase mode.');}
}
export async function seedDemo(store){for(const [uid,name] of [['demo_owner','My first workspace'],['demo_admin','Mantrilo demo administration']]){await store.ensureWorkspace(`workspace_${uid}`,uid,name);await store.putUser(uid,{workspaceId:`workspace_${uid}`,role:'owner'});}}
export function createConsoleServer({store,sessions,mode='demo',appOrigin='http://localhost:4190',secureCookies=false,firebaseConfig=null,staticRoot=path.resolve('dist'),astrologySandboxLimit=sandboxLimit()}) {
 const cookie=(name,value,maxAge)=>`${name}=${value}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secureCookies?'; Secure':''}`;
 const sessionName=secureCookies?'__Host-mantrilo_session':'mantrilo_session';
 const csrfName=secureCookies?'__Host-mantrilo_csrf':'mantrilo_csrf';
 return createServer(async(request,response)=>{
  const requestId=randomUUID(),started=performance.now();let actor=null,workspaceId=null,operation='/api/console';
  response.setHeader('X-Request-Id',requestId);response.setHeader('X-Robots-Tag','noindex, nofollow');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');response.setHeader('Cache-Control','no-store');response.setHeader('Cross-Origin-Resource-Policy','same-origin');response.setHeader('X-Frame-Options','DENY');
  function send(status,data){response.setHeader('Content-Type','application/json; charset=utf-8');response.writeHead(status);response.end(JSON.stringify({...data,requestId,responseTimeMs:Math.round((performance.now()-started)*10)/10}));}
  try {
   const url=new URL(request.url,'http://localhost'),route=url.pathname,method=request.method;
   if(route==='/healthz')return send(200,{ok:true});
   if(route.startsWith('/api/')){
    const jar=cookies(request);
    if(!['GET','HEAD'].includes(method)&&route!=='/api/v1/astrology/calculate'){
     insist(request.headers.origin===appOrigin,403,'origin_denied','The request origin is not allowed.');
     insist(equal(jar[csrfName],request.headers['x-csrf-token']),403,'csrf_failed','Refresh the page and try again.');
    }
    if(route==='/api/auth/config'&&method==='GET')return send(200,{mode,firebase:firebaseConfig,registration:false});
    if(route==='/api/auth/csrf'&&method==='GET'){const token=secret();response.setHeader('Set-Cookie',cookie(csrfName,token,8*3600));return send(200,{csrfToken:token});}
    if(route==='/api/auth/demo'&&method==='POST'){
     insist(mode==='demo'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress),404,'not_found','Not found.');
     const input=await body(request);insist(['admin','customer'].includes(input.role),400,'invalid_role','Choose a demo role.');const token=await sessions.createDemo(input.role);response.setHeader('Set-Cookie',cookie(sessionName,token,8*3600));return send(200,{ok:true,demo:true});
    }
    if(route==='/api/auth/session'&&method==='POST'){
     insist(mode==='firebase',409,'firebase_required','Firebase login is not configured in local demo mode.');
     const input=await body(request);insist(typeof input.idToken==='string'&&input.idToken.length<10000,400,'token_required','A Firebase sign-in token is required.');
     let token;try{token=await sessions.create(input.idToken);}catch(error){if(error instanceof ApiError)throw error;throw new ApiError(401,'invalid_login','Sign in again to create a session.');}
     response.setHeader('Set-Cookie',cookie(sessionName,token,5*24*3600));return send(200,{ok:true});
    }
    // The only executable catalog endpoints are explicitly local demo fixtures.
    if(route==='/api/demo/catalog'&&method==='GET'){
     insist(mode==='demo',503,'catalog_unconfigured','No production catalog service is configured.');
     const rawKey=(request.headers.authorization||'').replace(/^Bearer /,'');insist(rawKey.startsWith('mtr_sbx_'),401,'invalid_api_key','Provide an active sandbox API key.');
     const keyHash=hash(rawKey),index=await store.findKey(keyHash);insist(index,401,'invalid_api_key','The API key is invalid or revoked.');
     workspaceId=index.workspaceId;operation='/api/demo/catalog';
     const type=url.searchParams.get('type')||'text';insist(Object.hasOwn(catalog,type),400,'invalid_type','Choose text, audio, or books.');
     const result=await store.transact(workspaceId,w=>chargeRequest(w,keyHash,`demo/catalog/${type}`,requestId));
     return send(200,{data:catalog[type],demo:true,usage:{contentRequests:1,audioBytes:0,astrologyCredits:0,billable:false,remaining:allowance(getPlan((await store.getWorkspace(workspaceId)).plan)).requests-result.meter.contentRequests}});
    }
    if(route==='/api/v1/astrology/calculate'&&method==='POST'){
     operation='/api/v1/astrology/calculate';
     const rawKey=(request.headers.authorization||'').replace(/^Bearer /,'');insist(rawKey.startsWith('mtr_sbx_'),401,'invalid_api_key','Provide an active sandbox API key.');
     const keyHash=hash(rawKey),index=await store.findKey(keyHash);insist(index,401,'invalid_api_key','The API key is invalid or revoked.');workspaceId=index.workspaceId;
     const current=await store.getWorkspace(workspaceId);insist(current?.keys.some(key=>key.hash===keyHash&&key.status==='active'&&key.environment==='sandbox'),401,'invalid_api_key','The API key is invalid or revoked.');
     const data=calculate(await body(request));
     const cost=await store.transact(workspaceId,w=>chargeCalculation(w,{keyHash,operation:data.operation,requestId,limit:astrologySandboxLimit}));return send(200,{data,usage:cost,calculated:true});
    }
    actor=await sessions.get(jar[sessionName]);insist(actor,401,'session_required','Sign in to continue.');
    if(route==='/api/auth/logout'&&method==='POST'){await sessions.delete(jar[sessionName]);response.setHeader('Set-Cookie',cookie(sessionName,'',0));return send(200,{ok:true});}
    const profile=await store.getUser(actor.uid);insist(profile?.workspaceId,403,'workspace_not_assigned','An administrator must assign your account to a workspace.');workspaceId=profile.workspaceId;
    const workspace=await store.getWorkspace(workspaceId);insist(workspace&&workspace.ownerUid===actor.uid,403,'workspace_denied','Workspace access is not allowed.');
    if(route==='/api/me'&&method==='GET')return send(200,{user:{uid:actor.uid,email:actor.email,admin:actor.admin===true},workspace:publicWorkspace(workspace),mode,period:currentPeriod(),usage:usage(workspace),plan:getPlan(workspace.plan),allowance:{...allowance(getPlan(workspace.plan)),astrologyCredits:astrologySandboxLimit},accountingPolicy,integrations:{catalog:false,astrology:true,billing:false,audio:false},billingPeriod:null});
    if(route==='/api/config'&&method==='GET'){const config=await store.getConfig();return send(200,{plans,astrology:proposedAddons.map(addon=>({...addon,credits:config.credits[addon.id],combined:plans.find(p=>p.name===addon.plan).price+addon.price})),accountingPolicy});}
    if(route==='/api/keys'&&method==='GET')return send(200,{keys:publicWorkspace(workspace).keys});
    if(route==='/api/keys'&&method==='POST'){
     const input=await body(request),name=cleanText(input.name,'Key name',80),environment=input.environment;
     insist(['sandbox','production'].includes(environment),400,'invalid_environment','Choose sandbox or production.');
     const rawKey=`mtr_${environment==='sandbox'?'sbx':'live'}_${secret()}`,keyHash=hash(rawKey);
     const key={id:randomUUID(),name,environment,prefix:rawKey.slice(0,16),hash:keyHash,status:'active',createdAt:new Date().toISOString(),lastUsedAt:null};
     await store.transact(workspaceId,w=>{insist(environment!=='production'||getPlan(w.plan).price>0,403,'production_plan_required','Production keys require an active paid content plan.');insist(w.keys.length<50,409,'key_capacity','The workspace key-record capacity has been reached. Contact your administrator.');w.keys.push(key);log(w,{type:'key_created',message:`Created ${environment} key: ${name}`,status:201});});
     const {hash:_hash,...metadata}=key;return send(201,{key:metadata,secret:rawKey,notice:'Copy this secret now. It cannot be retrieved again.'});
    }
    if(/^\/api\/keys\/[^/]+$/.test(route)&&method==='DELETE'){
     const id=route.split('/').at(-1);await store.transact(workspaceId,w=>{const key=w.keys.find(k=>k.id===id);insist(key,404,'key_missing','API key not found.');key.status='revoked';log(w,{type:'key_revoked',message:`Revoked key: ${key.name}`,status:200});});return send(200,{ok:true});
    }
    if(route==='/api/catalog'&&method==='GET'){
     insist(mode==='demo',503,'catalog_unconfigured','Production catalog data is not configured.');const type=url.searchParams.get('type')||'text';insist(Object.hasOwn(catalog,type),400,'invalid_type','Choose text, audio, or books.');
     const query=(url.searchParams.get('q')||'').slice(0,200).toLowerCase();return send(200,{data:catalog[type].filter(record=>JSON.stringify(record).toLowerCase().includes(query)),demo:true});
    }
    if(route==='/api/astrology'&&method==='GET')return send(200,{status:'available',scope:'sandbox',engineVersion:ENGINE_VERSION,availableOperations:OPERATIONS,allowance:astrologySandboxLimit,used:usage(workspace).astrologyCredits,balance:Math.max(0,astrologySandboxLimit-usage(workspace).astrologyCredits),creditCost:1,canPurchase:false,notice:'Real server-side calculations. One nonbillable sandbox astrology credit per successful calculation; content and audio meters are unaffected. Paid add-on purchases remain disabled.'});
    if(route==='/api/astrology/calculate'&&method==='POST'){
     operation='/api/astrology/calculate';const data=calculate(await body(request));
     const cost=await store.transact(workspaceId,w=>chargeCalculation(w,{operation:data.operation,requestId,limit:astrologySandboxLimit}));return send(200,{data,usage:cost,calculated:true});
    }
    if(route==='/api/usage'&&method==='GET'){
     const from=url.searchParams.get('from')||`${currentPeriod()}-01`,to=url.searchParams.get('to')||new Date().toISOString().slice(0,10);
     const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
     insist(valid(from)&&valid(to)&&from<=to&&(Date.parse(to)-Date.parse(from))<=93*864e5,400,'invalid_date_range','Choose a valid range of up to 94 days.');
     const daily=Object.values(workspace.usage).flatMap(m=>Object.entries(m.daily)).filter(([day])=>day>=from&&day<=to).map(([day,value])=>({day,...value})).sort((a,b)=>a.day.localeCompare(b.day));
     return send(200,{daily,logs:workspace.logs.filter(l=>l.at.slice(0,10)>=from&&l.at.slice(0,10)<=to),endpoints:daily.reduce((totals,day)=>{for(const [endpoint,count] of Object.entries(day.endpoints||{}))totals[endpoint]=(totals[endpoint]||0)+count;return totals;},{}),policy:accountingPolicy,from,to,logLimit:200});
    }
    if(route==='/api/products'&&method==='POST'){
     const input=await body(request),name=cleanText(input.name,'Product name',80),environment=input.environment,type=input.type;
     insist(['sandbox','production'].includes(environment)&&['app','website'].includes(type),400,'invalid_product','Choose a product type and environment.');
     const product={id:randomUUID(),name,type,environment,createdAt:new Date().toISOString()};
     await store.transact(workspaceId,w=>{const p=getPlan(w.plan),limit=allowance(p).products;insist(environment!=='production'||p.price>0,403,'testing_only','Sandbox is for testing only.');insist(w.products.length<100,409,'record_capacity','Product-record capacity reached.');insist(limit===null||w.products.length<limit,409,'product_limit','Your plan’s customer-product limit has been reached.');w.products.push(product);log(w,{type:'product_created',message:`Registered product: ${name}`,status:201});});return send(201,{product});
    }
    if(/^\/api\/products\/[^/]+$/.test(route)&&method==='DELETE'){
     const id=route.split('/').at(-1);await store.transact(workspaceId,w=>{insist(w.products.some(p=>p.id===id),404,'product_missing','Product not found.');w.products=w.products.filter(p=>p.id!==id);log(w,{type:'product_deleted',message:'Removed a registered product.',status:200});});return send(200,{ok:true});
    }
    if(route==='/api/settings'&&method==='PATCH'){
     const input=await body(request),name=cleanText(input.name,'Workspace name',80);insist(typeof input.emailNotifications==='boolean'&&Number.isInteger(input.usageAlertThreshold)&&input.usageAlertThreshold>=10&&input.usageAlertThreshold<=100,400,'invalid_preferences','Choose a whole-number usage alert threshold from 10 to 100.');
     await store.transact(workspaceId,w=>{w.name=name;w.preferences={emailNotifications:input.emailNotifications,usageAlertThreshold:input.usageAlertThreshold};log(w,{type:'settings_updated',message:'Updated workspace preferences.',status:200});});return send(200,{ok:true,notice:'Preferences saved. Email notification delivery is not configured.'});
    }
    if(route==='/api/billing'&&method==='GET')return send(200,{plan:getPlan(workspace.plan),addon:null,monthlyTotal:getPlan(workspace.plan).price,period:null,invoices:[],renewalAt:null,setupRequired:true,provider:null,notice:'Subscription management is not configured. No checkout or entitlement upgrades are active.'});
    if(route.startsWith('/api/admin/')){
     insist(actor.admin===true,403,'admin_required','Administrator permission is required.');
     if(route==='/api/admin/workspaces'&&method==='GET')return send(200,{workspaces:(await store.listWorkspaces()).map(w=>({id:w.id,name:w.name,plan:w.plan,createdAt:w.createdAt,products:w.products.length,usage:usage(w)})),limit:100});
     if(route==='/api/admin/workspaces'&&method==='POST'){
      const input=await body(request),name=cleanText(input.name,'Workspace name',80),email=cleanText(input.email,'Customer email',200),user=await sessions.customerByEmail(email);
      insist(!(await store.getUser(user.uid)),409,'workspace_exists','This user already has a workspace.');const id=`workspace_${user.uid}`;await store.ensureWorkspace(id,user.uid,name);await store.putUser(user.uid,{workspaceId:id,role:'owner'});return send(201,{ok:true});
     }
     if(route==='/api/admin/astrology'&&method==='GET')return send(200,{config:await store.getConfig(),proposals:proposedAddons});
     if(route==='/api/admin/astrology'&&method==='PATCH'){
      const input=await body(request);for(const addon of proposedAddons)insist(Number.isInteger(input.credits?.[addon.id])&&input.credits[addon.id]>0&&input.credits[addon.id]<=1e7,400,'invalid_credits','Proposed credit allowances must be positive whole numbers up to 10,000,000.');
      await store.updateConfig({credits:input.credits,costsConfirmed:false,billingConfigured:false,updatedAt:new Date().toISOString(),updatedBy:actor.uid});return send(200,{ok:true,notice:'Proposed allowances saved. Purchases remain disabled.'});
     }
     throw new ApiError(404,'not_found','Administrator operation not found.');
    }
    throw new ApiError(404,'not_found','API operation not found.');
   }
   insist(['GET','HEAD'].includes(method),405,'method_not_allowed','Method not allowed.');
   if(route==='/robots.txt'){response.setHeader('Content-Type','text/plain');response.end('User-agent: *\nDisallow: /\n');return;}
   let file=path.resolve(staticRoot,'.'+decodeURIComponent(route));insist(file===staticRoot||file.startsWith(staticRoot+path.sep),404,'not_found','Not found.');
   if(route==='/')file=path.join(staticRoot,'index.html');else if(!path.extname(file))file+='.html';
   let data;try{await stat(file);data=await readFile(file);}catch{response.statusCode=404;file=path.join(staticRoot,'404.html');try{data=await readFile(file);}catch{data=Buffer.from('Not found');}}
   const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ico':'image/x-icon','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');response.end(method==='HEAD'?undefined:data);
  } catch(error){
   if(workspaceId&&error instanceof ApiError&&error.status>=400){try{await store.transact(workspaceId,w=>log(w,{type:'error',endpoint:operation,status:error.status,code:error.code,requestId,cost:{contentRequests:0,audioBytes:0,astrologyCredits:0},billable:false}));}catch{/* Never log request bodies, keys, tokens or personal inputs. */}}
   send(error instanceof ApiError?error.status:500,{error:{code:error instanceof ApiError?error.code:'internal_error',message:error instanceof ApiError?error.message:'The service could not complete this request. Check backend configuration and try again.'}});
  }
 });
}
