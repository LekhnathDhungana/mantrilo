import { insist, usage, currentPeriod, log } from '../domain.mjs';
export const DEFAULT_SANDBOX_CREDITS=100;
export function sandboxLimit(value=process.env.MANTRILO_ASTROLOGY_SANDBOX_CREDITS){const number=value===undefined?DEFAULT_SANDBOX_CREDITS:Number(value);if(!Number.isInteger(number)||number<1||number>100000)throw new Error('Invalid astrology sandbox allowance.');return number;}
export function chargeCalculation(workspace,{keyHash,operation,requestId,limit}){
 if(keyHash){const key=workspace.keys.find(key=>key.hash===keyHash&&key.status==='active');insist(key,401,'invalid_api_key','The API key is invalid or revoked.');insist(key.environment==='sandbox',403,'sandbox_only','Calculation API access currently requires a sandbox API key.');key.lastUsedAt=new Date().toISOString();}
 const period=currentPeriod(),meter=usage(workspace,period),day=new Date().toISOString().slice(0,10),endpoint=`astrology/${operation}`;
 insist(meter.astrologyCredits<limit,429,'astrology_quota_exceeded','The monthly sandbox astrology credit allowance has been reached.');
 meter.astrologyCredits+=1;meter.daily[day]||={contentRequests:0,audioBytes:0,astrologyCredits:0};meter.daily[day].astrologyCredits+=1;meter.daily[day].endpoints||={};meter.daily[day].endpoints[endpoint]=(meter.daily[day].endpoints[endpoint]||0)+1;meter.endpoints[endpoint]=(meter.endpoints[endpoint]||0)+1;workspace.usage[period]=meter;
 // Never include calculation inputs or results in general request logs.
 log(workspace,{type:'request',endpoint,status:200,requestId,cost:{contentRequests:0,audioBytes:0,astrologyCredits:1},billable:false});
 return {contentRequests:0,audioBytes:0,astrologyCredits:1,billable:false,scope:'sandbox',remaining:limit-meter.astrologyCredits};
}
