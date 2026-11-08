import * as Astronomy from 'astronomy-engine';
import { ApiError, insist } from '../domain.mjs';

export const ENGINE_VERSION='mantrilo-astro-1';
export const OPERATIONS=[
 {id:'positions',name:'Planetary positions',description:'Geocentric Sun, Moon, Mercury, Venus, Mars, Jupiter, and Saturn; tropical and sidereal longitudes, rashis, nakshatras, and apparent motion.',sandboxCreditCost:1},
 {id:'panchang',name:'Instant Panchang elements',description:'Tithi, nakshatra and pada, yoga number, karana, and Sun/Moon rashis at a specified instant. Not a sunrise-based daily almanac.',sandboxCreditCost:1},
];
export const RASHIS=['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'];
export const NAKSHATRAS=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
export const normalize=angle=>{const value=angle%360;return value<0?value+360:Object.is(value,-0)?0:value;};
const rounded=value=>Math.round(value*1e6)/1e6;
const angleOutput=value=>{const result=rounded(normalize(value));return result===360?0:result;};
export function validateInput(input){
 insist(input&&typeof input==='object'&&!Array.isArray(input),400,'invalid_input','Provide a JSON object.');
 insist(Object.keys(input).every(key=>['operation','datetime','ayanamsaDegrees'].includes(key)),400,'unsupported_field','This version accepts only operation, datetime, and optional ayanamsaDegrees.');
 insist(OPERATIONS.some(operation=>operation.id===input.operation),400,'invalid_operation','Choose positions or panchang.');
 const value=input.datetime;
 insist(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value),400,'invalid_datetime','Use an ISO date-time with seconds and an explicit UTC offset, for example 2026-11-07T12:00:00Z.');
 const [year,month,day,hour,minute,second]=value.slice(0,19).split(/[-T:]/).map(Number);
 const parts=new Date(Date.UTC(year,month-1,day,hour,minute,second));
 insist(parts.getUTCFullYear()===year&&parts.getUTCMonth()===month-1&&parts.getUTCDate()===day&&hour<=23&&minute<=59&&second<=59,400,'invalid_datetime','The date-time contains an invalid calendar date or time.');
 const offset=value.match(/([+-])(\d{2}):(\d{2})$/);
 insist(!offset||(Number(offset[2])<=14&&Number(offset[3])<=59&&(Number(offset[2])!==14||Number(offset[3])===0)),400,'invalid_datetime','UTC offsets must be within ±14:00.');
 const date=new Date(value);
 insist(!Number.isNaN(date.valueOf())&&date.getUTCFullYear()>=1900&&date.getUTCFullYear()<=2100,400,'date_out_of_range','This version accepts UTC dates from 1900 through 2100.');
 const custom=input.ayanamsaDegrees;
 insist(custom===undefined||(typeof custom==='number'&&Number.isFinite(custom)&&custom>=0&&custom<=60),400,'invalid_ayanamsa','A custom ayanamsa must be a number between 0 and 60 degrees.');
 return {operation:input.operation,date,ayanamsaDegrees:custom};
}
export function ayanamsaAt(date,custom){
 if(custom!==undefined)return {model:'user_supplied',degrees:custom,approximate:false,note:'Caller-supplied offset for this instant; its external accuracy has not been verified.'};
 const years=(date.valueOf()-Date.UTC(2000,0,1,12))/86400000/365.25;
 return {model:'lahiri_linear_approximation',degrees:23.85709+(50.29/3600)*years,approximate:true,note:'Starter sidereal model: 23.85709° at J2000 plus 50.29 arcseconds per Julian year. Not an exact Swiss Ephemeris Lahiri implementation; classifications can differ near boundaries.'};
}
export function classify(longitude){
 const value=normalize(longitude),rashiIndex=Math.floor(value/30),nakshatraIndex=Math.floor(value*27/360),pada=Math.min(4,Math.floor((value-nakshatraIndex*360/27)/(360/108))+1);
 return {rashi:{number:rashiIndex+1,name:RASHIS[rashiIndex],degreesWithin:Math.min(29.999999,rounded(value-rashiIndex*30))},nakshatra:{number:nakshatraIndex+1,name:NAKSHATRAS[nakshatraIndex],pada}};
}
function coordinates(body,date){
 if(body==='Moon'){const moon=Astronomy.EclipticGeoMoon(date);return {longitude:moon.lon,latitude:moon.lat,distanceAU:moon.dist};}
 const vector=Astronomy.GeoVector(body,date,true),ecliptic=Astronomy.Ecliptic(vector);
 return {longitude:ecliptic.elon,latitude:ecliptic.elat,distanceAU:Math.hypot(vector.x,vector.y,vector.z)};
}
function planet(body,date,ayanamsa){
 const position=coordinates(body,date),sidereal=normalize(position.longitude-ayanamsa.degrees);
 const before=coordinates(body,new Date(date.valueOf()-3600000)).longitude,after=coordinates(body,new Date(date.valueOf()+3600000)).longitude;
 const speed=normalize(after-before+180)-180;
 return {body,tropicalLongitudeDegrees:angleOutput(position.longitude),siderealLongitudeDegrees:angleOutput(sidereal),latitudeDegrees:rounded(position.latitude),distanceAU:Math.round(position.distanceAU*1e9)/1e9,motion:{degreesPerDay:rounded(speed*12),retrograde:speed<0},...classify(sidereal)};
}
export function panchangFromLongitudes(sunTropical,moonTropical,ayanamsa){
 const elongation=normalize(moonTropical-sunTropical),tithiIndex=Math.floor(elongation/12),halfIndex=Math.floor(elongation/6),moonSidereal=normalize(moonTropical-ayanamsa),sunSidereal=normalize(sunTropical-ayanamsa);
 const moving=['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti'];
 const karanaName=halfIndex===0?'Kimstughna':halfIndex>=57?['Shakuni','Chatushpada','Naga'][halfIndex-57]:moving[(halfIndex-1)%7];
 return {elongationDegrees:angleOutput(elongation),tithi:{number:tithiIndex+1,numberWithinPaksha:tithiIndex%15+1,paksha:tithiIndex<15?'Shukla':'Krishna'},nakshatra:classify(moonSidereal).nakshatra,yoga:{number:Math.floor(normalize(sunSidereal+moonSidereal)*27/360)+1},karana:{halfTithiNumber:halfIndex+1,name:karanaName},sunRashi:classify(sunSidereal).rashi,moonRashi:classify(moonSidereal).rashi};
}
export function calculate(input){
 const {operation,date,ayanamsaDegrees}=validateInput(input),ayanamsa=ayanamsaAt(date,ayanamsaDegrees);
 const base={engineVersion:ENGINE_VERSION,datetimeUtc:date.toISOString(),referenceFrame:'geocentric_true_ecliptic_of_date',ayanamsa:{...ayanamsa,degrees:rounded(ayanamsa.degrees)},limitations:['Sidereal default uses an approximate offset; use a verified custom offset if exact tradition matching is required.','No houses, ascendant, Rahu/Ketu, dashas, predictive interpretation, sunrise-based day assignment, or transition/end times in this version.']};
 try {
  if(operation==='positions')return {...base,operation,planets:['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].map(body=>planet(body,date,ayanamsa))};
  const sun=coordinates('Sun',date),moon=coordinates('Moon',date);
  return {...base,operation,basis:'at_requested_instant_not_local_sunrise',panchang:panchangFromLongitudes(sun.longitude,moon.longitude,ayanamsa.degrees)};
 }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(422,'calculation_failed','The astronomical calculation could not be completed for these inputs.');}
}
