import test from 'node:test';
import assert from 'node:assert/strict';
import * as Astronomy from 'astronomy-engine';
import { calculate, classify, normalize, panchangFromLongitudes, validateInput } from '../server/astrology/engine.mjs';
import { createConsoleServer, DemoSessions, seedDemo } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';

// USNO equinox reference: https://aa.usno.navy.mil/api/seasons?year=2024
const instant='2024-03-20T03:06:00Z';
test('planetary positions are real, bounded and reproducible near the March equinox',()=>{
 const result=calculate({operation:'positions',datetime:instant});assert.equal(result.planets.length,7);assert.equal(result.ayanamsa.model,'lahiri_linear_approximation');assert.equal(result.ayanamsa.approximate,true);
 const sun=result.planets.find(p=>p.body==='Sun');assert.ok(Math.min(sun.tropicalLongitudeDegrees,360-sun.tropicalLongitudeDegrees)<0.05);assert.ok(sun.distanceAU>0.98&&sun.distanceAU<1.02);
 for(const p of result.planets){assert.ok(p.tropicalLongitudeDegrees>=0&&p.tropicalLongitudeDegrees<360);assert.ok(p.siderealLongitudeDegrees>=0&&p.siderealLongitudeDegrees<360);assert.ok(p.rashi.number>=1&&p.rashi.number<=12);assert.ok(p.nakshatra.pada>=1&&p.nakshatra.pada<=4);assert.ok(Number.isFinite(p.motion.degreesPerDay));}
 assert.deepEqual(result,calculate({operation:'positions',datetime:instant}));
});
test('offset timestamps describe the same instant; custom ayanamsa changes sidereal output only',()=>{
 const a=calculate({operation:'positions',datetime:instant,ayanamsaDegrees:0}),b=calculate({operation:'positions',datetime:'2024-03-20T08:36:00+05:30',ayanamsaDegrees:0});assert.deepEqual(a,b);
 const c=calculate({operation:'positions',datetime:instant,ayanamsaDegrees:24});assert.equal(c.ayanamsa.model,'user_supplied');
 for(let i=0;i<a.planets.length;i++){assert.equal(a.planets[i].tropicalLongitudeDegrees,c.planets[i].tropicalLongitudeDegrees);assert.ok(Math.abs(normalize(a.planets[i].siderealLongitudeDegrees-c.planets[i].siderealLongitudeDegrees)-24)<0.00001);}
});
test('instant Panchang elongation agrees with the library MoonPhase helper',()=>{
 const result=calculate({operation:'panchang',datetime:instant});const expected=Astronomy.MoonPhase(new Date(instant));assert.ok(Math.abs(result.panchang.elongationDegrees-expected)<0.02);assert.equal(result.basis,'at_requested_instant_not_local_sunrise');
 const other=calculate({operation:'panchang',datetime:instant,ayanamsaDegrees:0});assert.deepEqual(result.panchang.tithi,other.panchang.tithi);assert.deepEqual(result.panchang.karana,other.panchang.karana);
});
test('zodiac, nakshatra, tithi, and karana boundaries wrap correctly',()=>{
 assert.equal(classify(0).rashi.name,'Mesha');assert.equal(classify(30).rashi.number,2);assert.equal(classify(360).rashi.number,1);assert.equal(classify(-1).rashi.number,12);assert.equal(classify(29.9999999).rashi.number,1);assert.ok(classify(29.9999999).rashi.degreesWithin<30);
 assert.equal(classify(360/27).nakshatra.number,2);assert.equal(classify(360/108).nakshatra.pada,2);
 assert.equal(panchangFromLongitudes(0,0,0).tithi.number,1);assert.equal(panchangFromLongitudes(0,180,0).tithi.paksha,'Krishna');assert.equal(panchangFromLongitudes(0,359.9,0).tithi.number,30);
 assert.equal(panchangFromLongitudes(0,0,0).karana.name,'Kimstughna');assert.equal(panchangFromLongitudes(0,6,0).karana.name,'Bava');assert.equal(panchangFromLongitudes(0,342,0).karana.name,'Shakuni');assert.equal(panchangFromLongitudes(0,348,0).karana.name,'Chatushpada');assert.equal(panchangFromLongitudes(0,354,0).karana.name,'Naga');
});
test('invalid calendar dates, ambiguous offsets, unsupported fields and invalid models are rejected',()=>{
 for(const datetime of ['2024-02-30T00:00:00Z','2024-13-01T00:00:00Z','2024-01-01T24:00:00Z','2024-01-01','2024-01-01T00:00:00','2024-01-01T00:00:00+14:30','1899-12-31T12:00:00Z','2101-01-01T00:00:00Z'])assert.throws(()=>validateInput({operation:'positions',datetime}));
 assert.throws(()=>calculate({operation:'positions',datetime:instant,ayanamsaDegrees:NaN}));assert.throws(()=>calculate({operation:'positions',datetime:instant,ayanamsaDegrees:-1}));assert.throws(()=>calculate({operation:'horoscope',datetime:instant}));assert.throws(()=>calculate({operation:'positions',datetime:instant,latitude:27}));
});
async function fixture(t,limit=100){
 const store=new MemoryStore(),sessions=new DemoSessions();await seedDemo(store);const server=createConsoleServer({store,sessions,astrologySandboxLimit:limit,appOrigin:'http://localhost:4190'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
 const csrfResponse=await fetch(base+'/api/auth/csrf'),csrf=await csrfResponse.json(),jar=new Map();const retain=response=>{for(const cookie of response.headers.getSetCookie()){const entry=cookie.split(';')[0],i=entry.indexOf('=');jar.set(entry.slice(0,i),entry.slice(i+1));}};retain(csrfResponse);
 async function call(path,method='GET',data,headers={}){const response=await fetch(base+path,{method,headers:{Origin:'http://localhost:4190',Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'Content-Type':'application/json','X-CSRF-Token':csrf.csrfToken,...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});retain(response);return {status:response.status,body:await response.json()};}
 await call('/api/auth/demo','POST',{role:'customer'});return {store,call,base};
}
test('session calculations consume only astrology credits and never log the requested date or result',async t=>{
 const f=await fixture(t);const status=await f.call('/api/astrology');assert.equal(status.body.status,'available');assert.equal(status.body.canPurchase,false);assert.equal(status.body.availableOperations.length,2);
 const result=await f.call('/api/astrology/calculate','POST',{operation:'panchang',datetime:'2001-02-03T04:05:06Z'});assert.equal(result.status,200);assert.equal(result.body.calculated,true);assert.equal(result.body.usage.remaining,99);assert.equal(result.body.usage.billable,false);
 const me=(await f.call('/api/me')).body;assert.equal(me.usage.astrologyCredits,1);assert.equal(me.usage.contentRequests,0);assert.equal(me.usage.audioBytes,0);assert.equal(me.integrations.astrology,true);assert.ok(!JSON.stringify(me.workspace.logs).includes('2001-02-03'));assert.ok(!JSON.stringify(me.workspace.logs).includes('tithi'));
 const invalid=await f.call('/api/astrology/calculate','POST',{operation:'positions',datetime:'bad'});assert.equal(invalid.status,400);assert.equal((await f.call('/api/me')).body.usage.astrologyCredits,1);
});
test('API-key calculations work without cookies/CSRF and revoked keys are rejected',async t=>{
 const f=await fixture(t);const created=await f.call('/api/keys','POST',{name:'Astrology integration',environment:'sandbox'});
 const request=()=>fetch(f.base+'/api/v1/astrology/calculate',{method:'POST',headers:{Authorization:`Bearer ${created.body.secret}`,'Content-Type':'application/json'},body:JSON.stringify({operation:'positions',datetime:instant})});
 const response=await request();assert.equal(response.status,200);assert.equal((await response.json()).data.planets.length,7);
 await f.call(`/api/keys/${created.body.key.id}`,'DELETE');assert.equal((await request()).status,401);
 assert.equal((await f.call('/api/me')).body.usage.astrologyCredits,1);
});
test('parallel calculations cannot bypass the sandbox astrology credit limit',async t=>{
 const f=await fixture(t,2);const responses=await Promise.all(Array.from({length:8},()=>f.call('/api/astrology/calculate','POST',{operation:'panchang',datetime:instant})));
 assert.equal(responses.filter(r=>r.status===200).length,2);assert.equal(responses.filter(r=>r.status===429).length,6);const me=(await f.call('/api/me')).body;assert.equal(me.usage.astrologyCredits,2);assert.equal(me.usage.contentRequests,0);assert.equal((await f.call('/api/astrology')).body.balance,0);
});
