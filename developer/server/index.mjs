import { createConsoleServer, DemoSessions, seedDemo } from './app.mjs';
import { MemoryStore, FirestoreStore } from './store.mjs';
import { firebaseServices, FirebaseSessions } from './firebase.mjs';
const mode=process.env.MANTRILO_MODE||(process.env.NODE_ENV==='production'?'firebase':'demo');
const port=Number(process.env.PORT||4190);
try {
 if(!['demo','firebase'].includes(mode))throw new Error('Invalid mode');
 if(mode==='firebase'&&(process.env.NODE_ENV==='production'||process.env.K_SERVICE)&&(process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIRESTORE_EMULATOR_HOST))throw new Error('Emulators are local only.');
 if(mode==='demo'&&(process.env.NODE_ENV==='production'||process.env.K_SERVICE))throw new Error('Demo mode is local only.');
 const appOrigin=process.env.MANTRILO_APP_ORIGIN||`http://localhost:${port}`;
 if(mode==='firebase'&&process.env.NODE_ENV==='production'&&!appOrigin.startsWith('https://'))throw new Error('Production requires a confirmed HTTPS origin.');
 let store,sessions;
 if(mode==='demo'){store=new MemoryStore();sessions=new DemoSessions();await seedDemo(store);}else{const {auth,db}=firebaseServices();store=new FirestoreStore(db);sessions=new FirebaseSessions(auth,db);}
 const firebaseConfig=mode==='firebase'&&process.env.FIREBASE_WEB_API_KEY?{apiKey:process.env.FIREBASE_WEB_API_KEY,authDomain:process.env.FIREBASE_AUTH_DOMAIN,projectId:process.env.FIREBASE_PROJECT_ID,appId:process.env.FIREBASE_WEB_APP_ID,authEmulatorHost:process.env.FIREBASE_AUTH_EMULATOR_HOST||null}:null;
 const server=createConsoleServer({store,sessions,mode,appOrigin,secureCookies:appOrigin.startsWith('https://'),firebaseConfig});
 server.requestTimeout=15000;server.headersTimeout=10000;
 server.listen(port,mode==='demo'?'127.0.0.1':'0.0.0.0',()=>console.log(`Mantrilo Developer Console: ${mode==='demo'?appOrigin:'server ready'} (${mode} mode)`));
} catch {console.error('Console startup failed. Check mode, origin, Firebase project and application credentials. Demo mode is only allowed locally.');process.exitCode=1;}
