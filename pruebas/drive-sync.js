/* Colosseum Rev20.5 — respaldo manual en Drive, solo base PRUEBAS.
   Publica el manifiesto AL FINAL; no sobrescribe reportes locales.
   Recupera reportes y fotos directamente en IndexedDB, con confirmaciones. */
(()=>{
"use strict";
const DB="colosseumRestoration_PRUEBAS",STORE="reports",FOLDER="Colosseum Restore - PRUEBAS",PHOTO_FOLDER="photos",MANIFEST="database.json";
const CLIENT_ID="406713503360-1sgm1cu6c4rm1gujse69basbh6s9h5o0.apps.googleusercontent.com";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const $=id=>document.getElementById(id);
let client=null,token=null,expires=0,busy=false;
const SESSION_KEY="colosseum_drive_token_PRUEBAS_v1";
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
function status(s){if($("driveConnectionStatus"))$("driveConnectionStatus").textContent=s;}
function connected(){return !!token&&Date.now()<expires-60000;}
function buttons(){if($("driveConnectBtn"))$("driveConnectBtn").textContent=connected()?"RENOVAR CONEXIÓN":"CONECTAR GOOGLE DRIVE";if($("driveDisconnectBtn"))$("driveDisconnectBtn").hidden=!token;for(const id of ["driveUploadBtn","driveDownloadBtn"])if($(id))$(id).disabled=!connected()||busy;}
function auth(){if(!window.google?.accounts?.oauth2)throw Error("No cargó Google Identity Services");if(client)return;client=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:r=>{if(r.error){status("Autorización fallida: "+r.error);return;}token=r.access_token;expires=Date.now()+(Number(r.expires_in)||3600)*1000;saveSession();status("Conectado. Podés subir o recuperar un respaldo de PRUEBAS.");buttons();}});}
async function api(url,opts={}){
 if(!connected())throw Error("La sesión de Google venció. Tocá CONECTAR GOOGLE DRIVE.");
 const res=await fetch(url,{...opts,headers:{Authorization:"Bearer "+token,...opts.headers}});
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
 if(!confirm("Subir "+reports.length+" reportes de PRUEBAS a Google Drive?\n\nSe copiarán los datos y fotos. No se modificará la base local."))return;
 status("Buscando carpeta de Drive…");const root=await folder(FOLDER,null,true),photos=await folder(PHOTO_FOLDER,root,true);
 const manifest={format:"colosseum-split-backup",version:1,createdAt:new Date().toISOString(),database:DB,store:STORE,records:[],photoCount:0};
 try{manifest.folderPreferences=JSON.parse(localStorage.getItem("colosseumFolders_PRUEBAS_V1")||"null");}catch{}
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
async function download(){
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
  alert("La base ya está actualizada.\n"+unchanged+" reportes sin cambios.\n0 fotografías descargadas.");
  return;
 }
 if(!confirm("RECUPERAR CAMBIOS DE DRIVE\n\nNuevos: "+newCount+"\nActualizados: "+updated+"\nSin cambios: "+unchanged+"\nFotos para descargar: "+missing.size+"\n\n¿Continuar?"))return;
 if(missing.size){
  const photos=await folder(PHOTO_FOLDER,root,false);let i=0;
  for(const [name,ref] of missing){
   status("Descargando foto necesaria "+(++i)+"/"+missing.size+"…");
   const found=await list(photos,name);if(!found.length)throw Error("Falta en Drive: "+name);
   const blob=await (await api("https://www.googleapis.com/drive/v3/files/"+found[0].id+"?alt=media")).blob();
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
 await window.ColosseumImportRecords(records,manifest.folderPreferences);
 status("Comparación completa: "+unchanged+" sin cambios; "+missing.size+" fotos descargadas.");
}
async function run(action){if(busy)return;busy=true;buttons();try{await action();}catch(e){status("Error: "+e.message);alert("Google Drive: "+e.message);}finally{busy=false;buttons();}}
function init(){
 restoreSession();
 const connect=$("driveConnectBtn");if(!connect)return;
 connect.onclick=()=>{try{auth();client.requestAccessToken({prompt:connected()?"":"consent"});}catch(e){status(e.message);}};
 $("driveDisconnectBtn").onclick=()=>{if(token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});token=null;expires=0;clearSession();status("Desconectado. Datos locales intactos.");buttons();};
 $("driveUploadBtn").onclick=()=>run(upload);
 $("driveDownloadBtn").onclick=()=>run(download);
 buttons();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
