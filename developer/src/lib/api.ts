let csrfToken: string | null = null;
export class ConsoleError extends Error { constructor(public status:number,public code:string,message:string){super(message);} }
export async function api<T>(path:string,options:RequestInit={}):Promise<T> {
 const headers=new Headers(options.headers);headers.set('Accept','application/json');
 if(options.body)headers.set('Content-Type','application/json');
 if(options.method&&!['GET','HEAD'].includes(options.method)){
  if(!csrfToken){const response=await fetch('/api/auth/csrf',{credentials:'same-origin'});const data=await response.json();if(!response.ok)throw new Error('Could not establish a secure request.');csrfToken=data.csrfToken;}
  headers.set('X-CSRF-Token',csrfToken!);
 }
 const response=await fetch(path,{...options,headers,credentials:'same-origin',cache:'no-store'});
 let data;try{data=await response.json();}catch{throw new Error('The console backend is unavailable. Start the same-origin console server.');}
 if(!response.ok){if(response.status===401&&path!=='/api/me'&&!path.startsWith('/api/demo/'))window.dispatchEvent(new Event('mantrilo:session-expired'));if(data.error?.code==='csrf_failed')csrfToken=null;throw new ConsoleError(response.status,data.error?.code||'request_failed',data.error?.message||'Request failed.');}
 return data;
}
export const mutate = <T>(path:string,method:string,data?:unknown)=>api<T>(path,{method,...(data===undefined?{}:{body:JSON.stringify(data)})});
