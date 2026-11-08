import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
export function useLoad<T>(path:string){
 const [state,setState]=useState<{path:string;data:T|null;error:string;pending:boolean}>({path:'',data:null,error:'',pending:true});
 const reload=useCallback(async()=>{setState({path,data:null,error:'',pending:true});try{setState({path,data:await api<T>(path),error:'',pending:false});}catch(e){setState({path,data:null,error:e instanceof Error?e.message:'Could not load this information.',pending:false});}},[path]);
 useEffect(()=>{let active=true;api<T>(path).then(data=>{if(active)setState({path,data,error:'',pending:false});}).catch(e=>{if(active)setState({path,data:null,error:e instanceof Error?e.message:'Could not load this information.',pending:false});});return()=>{active=false;};},[path]);
 return {data:state.path===path?state.data:null,error:state.path===path?state.error:'',loading:state.path!==path||state.pending,reload};
}
export const formatDate=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Not recorded';
export const formatBytes=(bytes:number)=>bytes>=1e9?`${(bytes/1e9).toFixed(2)} GB`:bytes>=1e6?`${(bytes/1e6).toFixed(1)} MB`:`${bytes.toLocaleString()} B`;
export function PageTitle({eyebrow,title,copy,action}:{eyebrow:string;title:string;copy:string;action?:ReactNode}){useEffect(()=>{document.title=`${title} | Mantrilo Console`;},[title]);return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></div>{action}</div>;}
export function Empty({icon='↳',title,children}:{icon?:string;title:string;children:ReactNode}){return <div className="empty"><span aria-hidden="true">{icon}</span><h3>{title}</h3><p>{children}</p></div>;}
export function ErrorNotice({message}:{message:string}){return message?<div className="notice error" role="alert">{message}</div>:null;}
export function Loading(){return <div className="loading" role="status">Loading workspace data…</div>;}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>;}
export function CopyButton({text,label='Copy'}:{text:string;label?:string}){const [status,setStatus]=useState('');async function copy(){try{await navigator.clipboard.writeText(text);setStatus('Copied');}catch{setStatus('Copy unavailable; select the text.');}}return <span className="copy-control"><button className="button subtle small-button" onClick={copy}>{label}</button>{status&&<small role="status">{status}</small>}</span>;}
export function Meter({label,value,limit,displayLimit,note}:{label:string;value:number;limit:number;displayLimit?:string;note:string}){const percent=limit?Math.min(100,value/limit*100):0;return <article className="metric-card"><span className="metric-label">{label}</span><div className="metric-value">{label==='Audio delivered'?formatBytes(value):value.toLocaleString()}<span> / {displayLimit||limit.toLocaleString()}</span></div><div className="meter-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={Math.max(1,limit,value)}><i style={{width:`${percent}%`}}/></div><p>{note}</p></article>;}
