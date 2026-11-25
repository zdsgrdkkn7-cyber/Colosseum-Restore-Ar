/* Colosseum Rev20.9 — respaldo manual en Drive, base local móvil; respaldo en carpeta OFICIAL.
   Publica el manifiesto AL FINAL; no sobrescribe reportes locales.
   Recupera reportes y fotos directamente en IndexedDB, con confirmaciones. */
(()=>{
"use strict";
const DB="colosseumRestoration_PRUEBAS",STORE="reports",FOLDER="Colosseum Restore - OFICIAL",PHOTO_FOLDER="photos",MANIFEST="database.json";
const CLIENT_ID="406713503360-1sgm1cu6c4rm1gujse69basbh6s9h5o0.apps.googleusercontent.com";
const SCOPE="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";
const $=id=>document.getElementById(id);
let client=null,token=null,expires=0,busy=false;
const SESSION_KEY="colosseum_drive_token_OFFICIAL_v2";
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
function auth(){if(!window.google?.accounts?.oauth2)throw Error("No cargó Google Identity Services");if(client)return;client=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:r=>{if(r.error){status("Autorización fallida: "+r.error);return;}token=r.access_token;expires=Date.now()+(Number(r.expires_in)||3600)*1000;saveSession();status("Conectado. Podés subir o recuperar un respaldo OFICIAL.");buttons();}});}
let wake=null;
async function keepAwake(){if(!busy||document.visibilityState!=="visible"||wake&&!wake.released)return;try{wake=await navigator.wakeLock?.request("screen");}catch{}}
document.addEventListener("visibilitychange",()=>{if(busy)keepAwake();});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const CACHE_DB="colosseumTransferCache_V1";
async function cacheOp(mode,fn){
 const db=await new Promise((ok,no)=>{const r=indexedDB.open(CACHE_DB,1);r.onupgradeneeded=()=>r.result.createObjectStore("photos");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
 try{return await new Promise((ok,no)=>{const tx=db.transaction("photos",mode),r=fn(tx.objectStore("photos"));tx.oncomplete=()=>ok(r.result);tx.onabort=()=>no(tx.error);tx.onerror=()=>no(tx.error);});}finally{db.close();}
}
async function cachedPhoto(key){try{return await cacheOp("readonly",s=>s.get(key));}catch{return null;}}
async function savePhoto(key,blob){try{await cacheOp("readwrite",s=>s.put(blob,key));}catch{}}
async function api(url,opts={}){
 if(!connected())throw Error("La sesión de Google venció. Tocá CONECTAR GOOGLE DRIVE.");
 let res;
 const safe=!opts.method||opts.method==="GET"||opts.method==="PATCH";
 for(let attempt=0;;attempt++){
  if(!connected())throw Error("La sesión de Google venció. Reconectá Drive y retomá.");
  try{res=await fetch(url,{...opts,headers:{Authorization:"Bearer "+token,...opts.headers}});}
  catch(e){if(!safe||attempt>=3)throw e;await pause(1000*2**attempt);continue;}
  if(safe&&attempt<3&&(res.status===429||res.status>=500)){await pause(1000*2**attempt);continue;}
  break;
 }
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
 if(!confirm("Subir "+reports.length+" reportes locales a Google Drive OFICIAL?\n\nSe copiarán los datos y fotos. No se modificará la base local."))return;
 status("Buscando carpeta de Drive…");const root=await folder(FOLDER,null,true),photos=await folder(PHOTO_FOLDER,root,true);
 const manifest={format:"colosseum-split-backup",version:1,createdAt:new Date().toISOString(),database:DB,store:STORE,records:[],photoCount:0};
 try{manifest.folderPreferences=JSON.parse(localStorage.getItem("colosseumFolders_PRUEBAS_V1")||"null");}catch{}
 const done=new Set();let existing=0,uploaded=0;
 for(let i=0;i<reports.length;i++){
  status("Reporte "+(i+1)+"/"+reports.length+" · existentes "+existing+" · nuevas "+uploaded+"…");
  const part=await ColosseumMediaV201.split([reports[i]]);
  manifest.records.push(part.manifest.records[0]);
  for(const f of part.files){
   if(done.has(f.filename))continue;
   const found=await list(photos,f.filename);
   if(!found.length){
    for(let attempt=0;;attempt++){
     try{await uploadBlob(f.filename,f.blob,f.mime,photos);uploaded++;break;}
     catch(e){if(attempt>=3||!connected()||/HTTP 4(?!29)/.test(e.message))throw e;await pause(1000*2**attempt);if((await list(photos,f.filename)).length){uploaded++;break;}}
    }
   }else existing++;
   done.add(f.filename);
   status("Reporte "+(i+1)+"/"+reports.length+" · existentes "+existing+" · nuevas "+uploaded);
  }
 }
 manifest.photoCount=done.size;
 if(!ColosseumMediaV201.verify(manifest,[...done].map(filename=>({filename}))).ok)throw Error("Verificación de referencias fallida");
 status("Publicando database.json…");
 // A manifest is only published after all its referenced images have uploaded.
 const old=await list(root,MANIFEST);
 const manifestBlob=new Blob([JSON.stringify(manifest)],{type:"application/json"});
 status("Publicando database.json ("+Math.ceil(manifestBlob.size/1024)+" KB)…");
 const savedId=await uploadBlob(MANIFEST,manifestBlob,"application/json",root,old[0]?.id);
 const saved=await (await api("https://www.googleapis.com/drive/v3/files/"+savedId+"?fields=id,size")).json();
 if(saved.id!==savedId||Number(saved.size)!==manifestBlob.size)throw Error("No se pudo verificar el tamaño del JSON publicado.");
 status("Respaldo subido: "+reports.length+" reportes, "+done.size+" fotografías. Carpeta: "+FOLDER+".");
}
async function download(){
 status("Consultando database.json…");
 const root=await folder(FOLDER,null,false);
 const m=await list(root,MANIFEST);if(!m.length)throw Error("No se encontró database.json.");
 const manifest=await (await api("https://www.googleapis.com/drive/v3/files/"+m[0].id+"?alt=media")).json();
 if(manifest.format!=="colosseum-split-backup"||manifest.version!==1||!Array.isArray(manifest.records)||manifest.records.length>10000)throw Error("Formato de respaldo incompatible.");
 const {cloneReport,slots,isRef}=ColosseumMediaV201;
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
  const previous=byId.get(remote.id),localCopy=previous?cloneReport(previous):null;
  const remoteCopy=cloneReport(remote);
  status("Comparando reportes "+(i+1)+"/"+manifest.records.length+"…");
  const localSlots=new Map(localCopy?slots(localCopy).map(s=>[s.path,s]):[]);
  for(const {owner,key,path} of slots(remoteCopy)){
   const ref=owner[key];
   if(ref&&!isRef(ref)&&path.startsWith("restorationDetails.")&&typeof ref==="string"&&ref.startsWith("data:"))continue;
   if(ref){
    if(!ref.filename||!ref.sha256||!/^[a-f0-9]{64}\.(jpg|png|webp|gif|bin)$/.test(ref.filename)||ref.filename.split(".")[0]!==ref.sha256)throw Error("Referencia de fotografía inválida.");
   }
   const localSlot=localSlots.get(path),old=localSlot?.owner[localSlot.key];
   if(old){
    const info=await localPhoto(old);
    if(!photoCache.has(info.sha256))photoCache.set(info.sha256,info.data);
    localSlot.owner[localSlot.key]={fileId:null,filename:info.sha256+"."+({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}[info.mime]||"bin"),sha256:info.sha256,mime:info.mime,size:info.size};
   }
   if(ref&&!photoCache.has(ref.sha256))needed.set(ref.filename,ref);
  }
  if(localCopy&&JSON.stringify(stable(localCopy))===JSON.stringify(stable(remoteCopy)))continue;
  pending.push(remote);
 }
 const newCount=pending.filter(r=>!byId.has(r.id)).length,updated=pending.length-newCount,unchanged=manifest.records.length-pending.length;
 // Only fetch photos referenced by records that will actually be imported.
 const missing=new Map();
 for(const record of pending)for(const {owner,key} of slots(record)){
  const ref=owner[key];if(isRef(ref)&&!photoCache.has(ref.sha256))missing.set(ref.filename,ref);
 }
 if(!pending.length){
  status("Drive actualizado: "+unchanged+" reportes sin cambios. No se descargaron fotografías.");
  alert("La base ya está actualizada.\n"+unchanged+" reportes sin cambios.\n0 fotografías descargadas.");
  return;
 }
 if(!confirm("RECUPERAR CAMBIOS DE DRIVE\n\nNuevos: "+newCount+"\nActualizados: "+updated+"\nSin cambios: "+unchanged+"\nFotos para descargar: "+missing.size+"\n\n¿Continuar?"))return;
 const unavailable=new Map();
 if(missing.size){
  let photos=null;
  try{photos=await folder(PHOTO_FOLDER,root,false);}
  catch(e){status("No se encontró la carpeta photos; se recuperarán los reportes completos disponibles.");}
  let i=0;
  for(const [name,ref] of missing){
   status("Verificando fotografía "+(++i)+"/"+missing.size+"…");
   try{
    if(!photos)throw Error("Carpeta photos no disponible");
    let blob=await cachedPhoto(root+":"+ref.sha256);
    if(blob&&await hash(await blob.arrayBuffer())!==ref.sha256)blob=null;
    if(!blob){
    let found=await list(photos,name);
    if(!found.length){
     // Older imported manifests inserted a separator in the SHA-256 filename.
     // Original Drive photos use the unseparated 64-character digest.
     const extension=name.slice(name.lastIndexOf("."));
     const canonical=ref.sha256+extension;
     if(canonical!==name)found=await list(photos,canonical);
    }
    if(!found.length)throw Error("Archivo no encontrado (se probaron ambos formatos de nombre)");
    blob=await (await api("https://www.googleapis.com/drive/v3/files/"+found[0].id+"?alt=media")).blob();
    }
    const bytes=new Uint8Array(await blob.arrayBuffer());
    if(await hash(bytes)!==ref.sha256)throw Error("Verificación de integridad fallida");
    await savePhoto(root+":"+ref.sha256,blob);
    let binary="";for(let j=0;j<bytes.length;j+=8192)binary+=String.fromCharCode(...bytes.subarray(j,j+8192));
    photoCache.set(ref.sha256,"data:"+(ref.mime||"application/octet-stream")+";base64,"+btoa(binary));
   }catch(e){
    unavailable.set(name,e.message);
   }
  }
 }
 const skipped=[];
 const records=[];
 for(const original of pending){
  const absent=slots(original).map(({owner,key})=>owner[key]).filter(ref=>isRef(ref)&&!photoCache.has(ref.sha256));
  if(absent.length){
   skipped.push({id:original.id,client:original.clientName||original.client||original.customer||original.cliente||"",card:original.cardName||original.card||original.carta||"",files:absent.map(ref=>ref.filename)});
   continue; // Never import an incomplete report or overwrite existing local photos.
  }
  const record=cloneReport(original);
  for(const {owner,key} of slots(record)){
   const ref=owner[key];if(isRef(ref))owner[key]=photoCache.get(ref.sha256);
  }
  records.push(record);
 }
 status("Importando únicamente los cambios…");
 if(records.length)await window.ColosseumImportRecords(records,manifest.folderPreferences);
 const summary="Recuperados: "+records.length+" reportes.\\nSin cambios: "+unchanged+".\\nPendientes por fotos: "+skipped.length+".";
 if(skipped.length){
  const details=skipped.map(item=>"• ID "+item.id+(item.client?" | "+item.client:"")+(item.card?" | "+item.card:"")+"\\n  "+item.files.join(", ")).join("\\n");
  console.warn("Colosseum: reportes pendientes por fotos en Drive",skipped);
  status("Recuperados "+records.length+"; pendientes por fotos "+skipped.length+". Revisá el detalle.");
  alert(summary+"\\n\\nReportes pendientes (no se modificaron):\\n"+details.slice(0,2200));
 }else{
  status("Recuperación completa: "+records.length+" reportes; "+unchanged+" sin cambios.");
  alert(summary);
 }
}
async function run(action){if(busy)return;busy=true;buttons();const key="colosseumTransferPending_V1";try{localStorage.setItem(key,action===upload?"export":"import");}catch{}try{await keepAwake();await action();try{localStorage.removeItem(key);}catch{}}catch(e){status("Interrumpido: "+e.message+" · Volvé a iniciar la transferencia para retomar.");alert("Google Drive: "+e.message+"\nPodés retomar desde el mismo botón.");}finally{busy=false;try{await wake?.release();}catch{}wake=null;buttons();}}
window.ColosseumDrive=Object.freeze({connected,upload:()=>run(upload),download:()=>run(download)});
function init(){
 restoreSession();
 try{const pending=localStorage.getItem("colosseumTransferPending_V1");if(pending)status("Transferencia anterior interrumpida. Reconectá si hace falta y tocá "+(pending==="export"?"EXPORTAR":"IMPORTAR")+" para retomar.");}catch{}
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
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
