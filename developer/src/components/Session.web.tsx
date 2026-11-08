import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ConsoleError } from '../lib/api';
import type { Session, AuthConfig } from '../lib/types';
type State={session:Session|null;config:AuthConfig|null;loading:boolean;error:string;refresh:()=>Promise<void>};
const Context=createContext<State|null>(null);
export function useConsole(){const state=useContext(Context);if(!state)throw new Error('Console provider missing');return state;}
export default function SessionProvider({children}:{children:ReactNode}) {
 const [session,setSession]=useState<Session|null>(null),[config,setConfig]=useState<AuthConfig|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=useCallback(async()=>{try{const [configuration,current]=await Promise.all([api<AuthConfig>('/api/auth/config'),api<Session>('/api/me').catch(error=>{if(error instanceof ConsoleError&&error.status===401)return null;throw error;})]);setConfig(configuration);setSession(current);setError('');}catch(error){setError(error instanceof Error?error.message:'Console service unavailable.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void Promise.resolve().then(refresh);const expired=()=>setSession(null);window.addEventListener('mantrilo:session-expired',expired);return()=>window.removeEventListener('mantrilo:session-expired',expired);},[refresh]);
 return <Context.Provider value={{session,config,loading,error,refresh}}>{children}</Context.Provider>;
}
