/* Colosseum Rev20.7 — respaldo manual en Drive, base oficial.
   Publica el manifiesto AL FINAL; no sobrescribe reportes locales.
   Recupera reportes y fotos directamente en IndexedDB, con confirmaciones. */
(()=>{
"use strict";
const DB="colosseumRestoration",STORE="reports",FOLDER="Colosseum Restore - OFICIAL",PHOTO_FOLDER="photos",MANIFEST="database.json";
const CLIENT_ID="406713503360-1sgm1cu6c4rm1gujse69basbh6s9h5o0.apps.googleusercontent.com";
// drive.file mantiene la escritura de respaldos propios; drive.readonly permite recuperar fotos cargadas externamente.
const SCOPE="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";
const $=id=>document.getElementById(id);
let client=null,token=null,expires=0,busy=false;
let automaticTimer=null,autoRetry=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function retryNetwork(fn){let error;for(let attempt=0;attempt<3;attempt++){try{return await fn();}catch(e){error=e;if(attempt<2&&(/Load failed|Failed to fetch|NetworkError|fetch|HTTP 429|HTTP 5\d\d/i.test(String(e)))){await sleep(700*(attempt+1));continue;}throw e;}}throw error;}
function scheduleAutomaticImport(delay=400){if(automaticTimer)clearTimeout(automaticTimer);automaticTimer=setTimeout(()=>{automaticTimer=null;if(!connected()||busy)return;void run(()=>download(true),true);},delay);}
const SESSION_KEY="colosseum_drive_token_OFICIAL_v2";
function restoreSession(){
 try{
  const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
  if(saved&&typeof saved.token==="string"&&Number(saved.expires)>Date.now()+60000){
   token=saved.token;expires=Number(saved.expires);
   status("Conexión con Drive restaurada en esta sesión.");
  }else sessionStorage.removeItem(SESSION_KEY);
 }catch{sessionStorage.removeItem(SESSION_KEY);}
}
function saveSession(){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({token,expires}));}catch{}}
function clearSession(){try{sessionStorage.removeItem(SESSION_KEY);}catch{}}
function status(s){if($("driveActivityStatus"))$("driveActivityStatus").textContent=s;}
function connected(){return !!token&&Date.now()<expires-60000;}
function buttons(){
 const active=connected(),toggle=$("driveConnectBtn"),indicator=$("driveConnectionStatus");
 if(toggle){toggle.textContent=active?"DESCONECTAR":"CONECTAR";toggle.disabled=busy;}
 if(indicator){indicator.textContent=active?"● Conectado":"● Desconectado";indicator.style.color=active?"#65d887":"#ff6767";}
 for(const id of ["exportDatabaseBtn","importDatabaseBtn"]){
  const el=$(id);if(!el)continue;
  el.disabled=busy;
  el.title=active?(id==="exportDatabaseBtn"?"Subir base a Google Drive":"Recuperar base desde Google Drive"):(id==="exportDatabaseBtn"?"Exportar ZIP al dispositivo":"Importar ZIP o JSON del dispositivo");
 }
}
function auth(){if(!window.google?.accounts?.oauth2)throw Error("No cargó Google Identity Services");if(client)return;client=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:r=>{if(r.error){status("Autorización fallida: "+r.error);return;}token=r.access_token;expires=Date.now()+(Number(r.expires_in)||3600)*1000;saveSession();status("Conectado. Revisando cambios en Drive…");buttons();scheduleAutomaticImport();}});}
async function api(url,opts={}){
 if(!connected())throw Error("La sesión de Google venció. Tocá CONECTAR GOOGLE DRIVE.");
 const res=await retryNetwork(()=>fetch(url,{...opts,headers:{Authorization:"Bearer "+token,...opts.headers}}));
 if(!res.ok){let details="";try{details=(await res.text()).slice(0,250);}catch{}throw Error("Drive HTTP "+res.status+": "+details);}
 return res;
}
const q=s=>encodeURIComponent(s);
async function list(parent,name,mime){
 const terms=["trashed = false","name = '"+name.replace(/'/g,"\\'")+"'"];
 if(parent)terms.push("'"+parent+"' in parents");
 if(mime)terms.push("mimeType = '"+mime+"'");
 const u="https://www.googleapis.com/drive/v3/files?q="+q(terms.join(" and "))+"&fields="+q("nextPageToken,files(id,name,mimeType,size)")+"&page_size=100";
 const data=await (await api(u)).json();return data.files||[];
}
async function createFolder(name,parent){
 const metadata={name,mimeType:"application/vnd.google-apps.folder"};if(parent)metadata.parents=[parent];
 return (await (await api("https://www.googleapis.com/drive/v3/files?fields=id,name",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(metadata)})).json()).id;
}
async function folder(name,parent,create){
 const found=await list(parent,name,"application/vnd.google-apps.folder");if(found.length)return found[0].id;
 if(!create)throw Error("No existe la carpeta "+name+" en esta cuenta. Primero subí un respaldo.");
 return createFolder(name,parent);
}
async function uploadBlob(name,blob,mime,parent,id){
 // Multipart upload with binary Blob; photos are not re-encoded.
 const metadata={name,mimeType:mime};if(!id)metadata.parents=[parent];
 const boundary="colosseum_"+Math.random().toString(36).slice(2);
 const body=new Blob(["--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",JSON.stringify(metadata),"\r\n--"+boundary+"\r\nContent-Type: "+mime+"\r\n\r\n",blob,"\r\n--"+boundary+"--"],{type:"multipart/related; boundary="+boundary});
 const method=id?"PATCH":"POST",url="https://www.googleapis.com/upload/drive/v3/files"+(id?"/"+id:"")+"?uploadType=multipart&fields=id,name";
 return (await (await api(url,{method,headers:{"Content-Type":"multipart/related; boundary="+boundary},body})).json()).id;
}
async function readDB(){const db=await new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"id"});};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});try{return await new Promise((ok,no)=>{const tx=db.transaction(STORE,"readonly"),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}finally{db.close();}}
async function upload(){
 const reports=await readDB();if(!reports.length)throw Error("La base de pruebas está vacía.");
 if(!confirm("Subir "+reports.length+" reportes de la versión OFICIAL a Google Drive?\n\nSe copiarán los datos y fotos. No se modificará la base local."))return;
 status("Buscando carpeta de Drive…");const root=await folder(FOLDER,null,true),photos=await folder(PHOTO_FOLDER,root,true);
 const manifest={format:"colosseum-split-backup",version:1,createdAt:new Date().toISOString(),database:DB,store:STORE,records:[],photoCount:0};
 try{manifest.folderPreferences=JSON.parse(localStorage.getItem("colosseumFoldersV1")||"null");}catch{}
 const done=new Set();
 for(let i=0;i<reports.length;i++){
  status("Subiendo fotos del reporte "+(i+1)+"/"+reports.length+"…");
  const part=await ColosseumMediaV201.split([reports[i]]);
  manifest.records.push(part.manifest.records[0]);
  for(const f of part.files){
   if(done.has(f.filename))continue;
   const found=await list(photos,f.filename);
   if(!found.length)await uploadBlob(f.filename,f.blob,f.mime,photos);
   done.add(f.filename);
  }
 }
 manifest.photoCount=done.size;
 if(!ColosseumMediaV201.verify(manifest,[...done].map(filename=>({filename}))).ok)throw Error("Verificación de referencias fallida");
 status("Publicando database.json…");
 // A manifest is only published after all its referenced images have uploaded.
 const old=await list(root,MANIFEST);
 await uploadBlob(MANIFEST,new Blob([JSON.stringify(manifest)],{type:"application/json"}),"application/json",root,old[0]?.id);
 status("Respaldo subido: "+reports.length+" reportes, "+done.size+" fotografías. Carpeta: "+FOLDER+".");
}
// Rev20.9.5: sincronización puntual y no destructiva al guardar un reporte.
const autoPending=new Set();let autoRunning=false;
async function silentRefresh(){
 if(connected())return true;
 try{auth();}catch{return false;}
 return new Promise(resolve=>{
  let finished=false;
  const finish=value=>{if(finished)return;finished=true;resolve(value);};
  const old=client.callback;
  client.callback=r=>{
   if(r?.access_token){token=r.access_token;expires=Date.now()+(Number(r.expires_in)||3600)*1000;saveSession();buttons();finish(true);}
   else finish(false);
  };
  try{client.requestAccessToken({prompt:""});}catch{finish(false);}
  setTimeout(()=>finish(false),8000);
 });
}
async function syncOneReport(reportId){
 if(!connected()&&!(await silentRefresh())){
  status("Reporte guardado localmente. Conectá Google Drive para sincronizar.");
  return;
 }
 const reports=await readDB(),report=reports.find(r=>String(r.id)===String(reportId));
 if(!report)return;
 status("Sincronizando reporte con Google Drive…");
 // No crear carpetas ni manifiestos automáticamente: evitamos usar otra cuenta por error.
 const root=await folder(FOLDER,null,false);
 const files=await list(root,MANIFEST);
 if(!files.length)throw Error("No existe database.json; hacé primero un respaldo manual.");
 const manifest=await (await api("https://www.googleapis.com/drive/v3/files/"+files[0].id+"?alt=media")).json();
 if(manifest.format!=="colosseum-split-backup"||manifest.version!==1||!Array.isArray(manifest.records))throw Error("Manifiesto de Drive incompatible.");
 const part=await ColosseumMediaV201.split([report]);
 const entry=part.manifest.records[0];
 const photos=await folder(PHOTO_FOLDER,root,false);
 for(const file of part.files){
  const existing=await list(photos,file.filename);
  if(!existing.length)await uploadBlob(file.filename,file.blob,file.mime,photos);
 }
 // Preservar todos los registros remotos ajenos a este guardado.
 const i=manifest.records.findIndex(r=>String(r.id)===String(reportId));
 if(i>=0){
  const remote=manifest.records[i];
  if(remote.updatedAt&&report.updatedAt&&Date.parse(remote.updatedAt)>Date.parse(report.updatedAt)){
   status("Conflicto: Drive tiene una versión más reciente. No se sobrescribió.");
   return;
  }
  manifest.records[i]=entry;
 }else manifest.records.push(entry);
 manifest.createdAt=new Date().toISOString();
 manifest.photoCount=new Set(manifest.records.flatMap(r=>Object.values(r.photos||{}).filter(v=>v&&v.filename).map(v=>v.filename))).size;
 await uploadBlob(MANIFEST,new Blob([JSON.stringify(manifest)],{type:"application/json"}),"application/json",root,files[0].id);
 status("Reporte sincronizado con Google Drive.");
}
async function processAutoQueue(){
 if(autoRunning)return;
 autoRunning=true;
 try{
  while(autoPending.size){
   const id=autoPending.values().next().value;autoPending.delete(id);
   try{await syncOneReport(id);}
   catch(e){status("Guardado local correcto. Drive pendiente: "+e.message);}
  }
 }finally{autoRunning=false;}
}
function onReportSaved(id){autoPending.add(id);void processAutoQueue();}
async function download(automatic=false){
 status("Consultando database.json…");
 const root=await folder(FOLDER,null,false);
 const m=await list(root,MANIFEST);if(!m.length)throw Error("No se encontró database.json.");
 const manifest=await (await api("https://www.googleapis.com/drive/v3/files/"+m[0].id+"?alt=media")).json();
 if(manifest.format!=="colosseum-split-backup"||manifest.version!==1||!Array.isArray(manifest.records)||manifest.records.length>10000)throw Error("Formato de respaldo incompatible.");
 const keys=["frontBefore","frontAfter","backBefore","backAfter"];
 const local=await readDB(),byId=new Map(local.map(r=>[r.id,r])),seen=new Set();
 const photoCache=new Map(),needed=new Map(),pending=[];
 const stable=value=>{
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object"&&!(value instanceof Blob))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
 };
 const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
 const localPhoto=async value=>{
  if(typeof value==="string"&&value.startsWith("data:")){
   const match=/^data:([^;,]+)?;base64,([\s\S]*)$/.exec(value);if(!match)throw Error("Foto local incompatible");
   const raw=atob(match[2]),bytes=new Uint8Array(raw.length);
   for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   return {sha256:await hash(bytes),mime:match[1]||"application/octet-stream",size:bytes.length,data:value};
  }
  if(value instanceof Blob)return {sha256:await hash(await value.arrayBuffer()),mime:value.type||"application/octet-stream",size:value.size,data:value};
  throw Error("Formato de foto local desconocido");
 };
 for(let i=0;i<manifest.records.length;i++){
  const remote=manifest.records[i];
  if(!remote||(typeof remote.id!=="string"&&typeof remote.id!=="number")||seen.has(remote.id))throw Error("ID de reporte inválido o duplicado.");
  seen.add(remote.id);
  const previous=byId.get(remote.id),localCopy=previous?{...previous,photos:{...(previous.photos||{})}}:null;
  const remoteCopy={...remote,photos:{...(remote.photos||{})}};
  status("Comparando reportes "+(i+1)+"/"+manifest.records.length+"…");
  for(const key of keys){
   const ref=remoteCopy.photos[key];
   if(ref){
    if(!ref.filename||!ref.sha256||!/^[a-f0-9]{64}\.(jpg|png|webp|gif|bin)$/.test(ref.filename)||ref.filename.split(".")[0]!==ref.sha256)throw Error("Referencia de fotografía inválida.");
   }
   const old=localCopy?.photos[key];
   if(old){
    const info=await localPhoto(old);
    if(!photoCache.has(info.sha256))photoCache.set(info.sha256,info.data);
    localCopy.photos[key]={fileId:null,filename:info.sha256+"."+({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}[info.mime]||"bin"),sha256:info.sha256,mime:info.mime,size:info.size};
   }
   if(ref&&!photoCache.has(ref.sha256))needed.set(ref.filename,ref);
  }
  if(localCopy&&JSON.stringify(stable(localCopy))===JSON.stringify(stable(remoteCopy)))continue;
  if(automatic&&previous){const remoteTime=Date.parse(remote.updatedAt||"")||0,localTime=Date.parse(previous.updatedAt||"")||0;if(!remoteTime||remoteTime<=localTime)continue;}
  pending.push(remote);
 }
 const newCount=pending.filter(r=>!byId.has(r.id)).length,updated=pending.length-newCount,unchanged=manifest.records.length-pending.length;
 // Only fetch photos referenced by records that will actually be imported.
 const missing=new Map();
 for(const record of pending)for(const key of keys){
  const ref=record.photos?.[key];if(ref&&!photoCache.has(ref.sha256))missing.set(ref.filename,ref);
 }
 if(!pending.length){
  status("Drive actualizado: "+unchanged+" reportes sin cambios. No se descargaron fotografías.");
  if(!automatic)alert("La base ya está actualizada.\n"+unchanged+" reportes sin cambios.\n0 fotografías descargadas.");
  return;
 }
 if(!automatic&&!confirm("RECUPERAR CAMBIOS DE DRIVE\n\nNuevos: "+newCount+"\nActualizados: "+updated+"\nSin cambios: "+unchanged+"\nFotos para descargar: "+missing.size+"\n\n¿Continuar?"))return;
 if(missing.size){
  const photos=await folder(PHOTO_FOLDER,root,false);let i=0;
  for(const [name,ref] of missing){
   status("Descargando foto necesaria "+(++i)+"/"+missing.size+"…");
   const found=await list(photos,name);if(!found.length)throw Error("Falta en Drive: "+name);
   const blob=await retryNetwork(async()=> (await api("https://www.googleapis.com/drive/v3/files/"+found[0].id+"?alt=media")).blob());
   const bytes=new Uint8Array(await blob.arrayBuffer());
   if(await hash(bytes)!==ref.sha256)throw Error("Foto dañada: "+name);
   let binary="";for(let j=0;j<bytes.length;j+=8192)binary+=String.fromCharCode(...bytes.subarray(j,j+8192));
   photoCache.set(ref.sha256,"data:"+(ref.mime||"application/octet-stream")+";base64,"+btoa(binary));
  }
 }
 const records=pending.map(original=>{
  const record={...original,photos:{...(original.photos||{})}};
  for(const key of keys){
   const ref=record.photos[key];if(!ref)continue;
   const data=photoCache.get(ref.sha256);if(!data)throw Error("Falta fotografía: "+ref.filename);
   record.photos[key]=data;
  }
  return record;
 });
 status("Importando únicamente los cambios…");
 if(automatic){
  // Only new records or strictly newer remote revisions are applied automatically.
  // Existing local revisions are kept if they are as new as the remote copy.
  const db=await new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);for(const record of records)store.put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
  status("Sincronización automática: "+newCount+" nuevos, "+updated+" actualizados.");
 }else await window.ColosseumImportRecords(records,manifest.folderPreferences);
 status("Comparación completa: "+unchanged+" sin cambios; "+missing.size+" fotos descargadas.");
}
async function run(action,automatic=false){if(busy)return;busy=true;buttons();try{await action();autoRetry=0;}catch(e){status("Error de Drive: "+e.message);if(automatic){if(connected()&&autoRetry<2){autoRetry++;scheduleAutomaticImport(2500*autoRetry);}}else alert("Google Drive: "+e.message);}finally{busy=false;buttons();}}
window.ColosseumDrive=Object.freeze({connected,upload:()=>run(upload),download:()=>run(download),onReportSaved});
function init(){
 restoreSession();
 const connect=$("driveConnectBtn");if(!connect)return;
 connect.onclick=()=>{
  if(connected()){
   if(token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});
   token=null;expires=0;clearSession();
   status("Sesión desconectada. Los datos locales siguen intactos.");buttons();
  }else{
   try{auth();client.requestAccessToken({prompt:"consent"});}catch(e){status(e.message);}
  }
 };
 buttons();
 if(connected())scheduleAutomaticImport(800);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&connected())scheduleAutomaticImport(1200);});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
