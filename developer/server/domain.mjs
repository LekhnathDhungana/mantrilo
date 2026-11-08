import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import plans from '../../shared/content-plans.json' with { type: 'json' };
export { plans };
export const INITIAL_ADMIN_EMAIL = 'bebaslekhnath@gmail.com';
export const proposedAddons = [
  {id:'starter',name:'Starter Astrology',plan:'Starter',price:29,credits:2000},
  {id:'growth',name:'Growth Astrology',plan:'Growth',price:79,credits:10000},
  {id:'business',name:'Business Astrology',plan:'Business',price:199,credits:40000},
];
export class ApiError extends Error { constructor(status,code,message) { super(message); this.status=status;this.code=code; } }
export function insist(condition,status,code,message) { if (!condition) throw new ApiError(status,code,message); }
export const hash = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export const equal = (a,b) => typeof a==='string' && typeof b==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function cleanText(value,name,max=120) { insist(typeof value==='string'&&value.trim().length>0&&value.trim().length<=max,400,'invalid_input',`${name} is required and must be at most ${max} characters.`);return value.trim(); }
export const getPlan = name => plans.find(plan=>plan.name===name) || plans[0];
export function allowance(plan) { return {requests:Number(plan.requests.replaceAll(',','')),audioBytes:plan.price?Number(plan.audio.split(' ')[0])*1e9:0,products:plan.price?Number(plan.products):null,astrologyCredits:0}; }
export const currentPeriod = (date = new Date()) => date.toISOString().slice(0,7);
export function newWorkspace(id,ownerUid,name) { return {id,ownerUid,name,plan:'Sandbox',astrologyAddon:null,createdAt:new Date().toISOString(),products:[],keys:[],usage:{},logs:[],preferences:{emailNotifications:false,usageAlertThreshold:80}}; }
export function log(workspace,entry) { workspace.logs.unshift({id:randomUUID(),at:new Date().toISOString(),...entry});workspace.logs=workspace.logs.slice(0,200); }
export function publicWorkspace(workspace) { const copy=structuredClone(workspace);copy.keys=copy.keys.map(({hash: _hash,...key})=>key);return copy; }
export function usage(workspace,period=currentPeriod()) { return workspace.usage[period] || {contentRequests:0,audioBytes:0,astrologyCredits:0,daily:{},endpoints:{}}; }
export function chargeRequest(workspace,keyHash,endpoint,requestId) {
 const key=workspace.keys.find(key=>key.hash===keyHash&&key.status==='active');
 insist(key,401,'invalid_api_key','The API key is invalid or revoked.');
 insist(key.environment==='sandbox',403,'sandbox_only','This demo endpoint accepts sandbox keys only.');
 const plan=getPlan(workspace.plan), limits=allowance(plan), period=currentPeriod(), today=new Date().toISOString().slice(0,10);
 const meter=usage(workspace,period);
 insist(meter.contentRequests<limits.requests,429,'quota_exceeded','The monthly content request allowance has been reached.');
 meter.contentRequests+=1;
 meter.daily[today] ||= {contentRequests:0,audioBytes:0,astrologyCredits:0};
 meter.daily[today].contentRequests+=1;
 meter.daily[today].endpoints ||= {};meter.daily[today].endpoints[endpoint]=(meter.daily[today].endpoints[endpoint]||0)+1;
 meter.endpoints[endpoint]=(meter.endpoints[endpoint]||0)+1;
 workspace.usage[period]=meter;key.lastUsedAt=new Date().toISOString();
 log(workspace,{type:'request',endpoint,status:200,requestId,cost:{contentRequests:1,audioBytes:0,astrologyCredits:0},billable:false});
 return {meter,period};
}
export const accountingPolicy = 'Demo catalog reads consume one demo content request after successful authentication and quota reservation. Errors, key management, console browsing, and unavailable operations consume no credits. Demo usage is never billed. The calculation engine separately consumes one nonbillable sandbox astrology credit per successful calculation. Invalid inputs, authentication failures and quota rejections consume zero. Paid astrology credit accounting and production content/audio accounting are not active.';
