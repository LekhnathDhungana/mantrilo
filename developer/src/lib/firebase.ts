import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import type { AuthConfig } from './types';
let emulatorConnected=false;
export function clientAuth(config:NonNullable<AuthConfig['firebase']>) {
 const app=getApps()[0]||initializeApp(config);
 let auth;try{auth=initializeAuth(app,{persistence:inMemoryPersistence});}catch{auth=getAuth(app);}
 if(config.authEmulatorHost&&!emulatorConnected){connectAuthEmulator(auth,`http://${config.authEmulatorHost}`,{disableWarnings:true});emulatorConnected=true;}
 return auth;
}
export async function login(config:NonNullable<AuthConfig['firebase']>,email:string,password:string) {const auth=clientAuth(config);try{const credential=await signInWithEmailAndPassword(auth,email,password);return await credential.user.getIdToken();}finally{await signOut(auth);}}
export async function resetPassword(config:NonNullable<AuthConfig['firebase']>,email:string) {await sendPasswordResetEmail(clientAuth(config),email);}
