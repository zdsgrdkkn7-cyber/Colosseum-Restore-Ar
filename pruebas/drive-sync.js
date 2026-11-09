/* Colosseum Rev20.2 — respaldo manual en Drive, solo base PRUEBAS.
   Publica el manifiesto AL FINAL; no sobrescribe reportes locales.
   Recupera reportes y fotos directamente en IndexedDB, con confirmaciones. */
(()=>{
"use strict";
const DB="colosseumRestoration_PRUEBAS",STORE="reports",FOLDER="Colosseum Restore - PRUEBAS",PHOTO_FOLDER="photos",MANIFEST="database.json";
const CLIENT_ID="406713503360-1sgm1cu6c4rm1gujse69basbh6s9h5o0.apps.googleusercontent.com";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const $=id=>document.getElementById(id);
let client=null,token=null,expires=0,busy=false;
function status(s){if($("driveConnectionStatus"))$("driveConnectionStatus").textContent=s;}
function connected(){return !!token&&Date.now()<expires-60000;}
function buttons(){if($("driveConnectBtn"))$("driveConnectBtn").textContent=connected()?"RENOVAR CONEXIÓN":"CONECTAR GOOGLE DRIVE";if($("driveDisconnectBtn"))$("driveDisconnectBtn").hidden=!token;for(const id of ["driveUploadBtn","driveDownloadBtn"])if($(id))$(id).disabled=!connected()||busy;}
function auth(){if(!window.google?.accounts?.oauth2)throw Error("No cargó Google Identity Services");if(client)return;client=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:r=>{if(r.error){status("Autorización fallida: "+r.error);return;}token=r.access_token;expires=Date.now()+(Number(r.expires_in)||3600)*1000;status("Conectado. Podés subir o recuperar un respaldo de PRUEBAS.");buttons();}});}
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
 status("Buscando respaldo…");
 const root=await folder(FOLDER,null,false),photos=await folder(PHOTO_FOLDER,root,false);
 const m=await list(root,MANIFEST);if(!m.length)throw Error("No se encontró database.json.");
 const manifest=await (await api("https://www.googleapis.com/drive/v3/files/"+m[0].id+"?alt=media")).json();
 if(manifest.format!=="colosseum-split-backup"||manifest.version!==1||!Array.isArray(manifest.records))throw Error("Formato de respaldo incompatible.");
 if(manifest.records.length>10000)throw Error("Demasiados reportes.");
 const names=new Set();
 for(const r of manifest.records)for(const key of ["frontBefore","frontAfter","backBefore","backAfter"]){
  const ref=r.photos?.[key];if(!ref)continue;
  if(!ref.filename||!ref.sha256||!/^[a-f0-9]{64}\\.(jpg|png|webp|gif|bin)$/.test(ref.filename)||ref.sha256!==ref.filename.split(".")[0])throw Error("Referencia de fotografía inválida.");
  names.add(ref.filename);
 }
 if(typeof window.ColosseumImportRecords!=="function")throw Error("No cargó el módulo de importación.");
 if(!confirm("RECUPERAR DESDE DRIVE\\n\\n"+manifest.records.length+" reportes y "+names.size+" fotografías.\\n\\nSe descargarán directamente a Colosseum PRUEBAS, sin generar ZIP. Se verificará cada fotografía y podrás confirmar los cambios antes de importarlos.\\n\\n¿Continuar?"))return;
 const cache=new Map();let i=0;
 for(const name of names){
  status("Descargando y verificando foto "+(++i)+"/"+names.size+"…");
  const found=await list(photos,name);if(!found.length)throw Error("Falta en Drive: "+name);
  const blob=await (await api("https://www.googleapis.com/drive/v3/files/"+found[0].id+"?alt=media")).blob();
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  const hash=Array.from(digest,x=>x.toString(16).padStart(2,"0")).join("");
  if(hash!==name.split(".")[0])throw Error("Foto dañada: "+name);
  let binary="";for(let j=0;j<bytes.length;j+=8192)binary+=String.fromCharCode(...bytes.subarray(j,j+8192));
  cache.set(name,btoa(binary));
 }
 const records=manifest.records.map(original=>{
  const record={...original,photos:{...(original.photos||{})}};
  for(const key of ["frontBefore","frontAfter","backBefore","backAfter"]){
   const ref=record.photos[key];if(!ref)continue;
   if(!cache.has(ref.filename))throw Error("Foto no descargada: "+ref.filename);
   record.photos[key]="data:"+(ref.mime||"application/octet-stream")+";base64,"+cache.get(ref.filename);
  }
  return record;
 });
 status("Fotografías verificadas. Preparando importación…");
 await window.ColosseumImportRecords(records,manifest.folderPreferences);
 status("Recuperación de Drive finalizada o cancelada. Revisá Historial.");
}
async function run(action){if(busy)return;busy=true;buttons();try{await action();}catch(e){status("Error: "+e.message);alert("Google Drive: "+e.message);}finally{busy=false;buttons();}}
function init(){
 const connect=$("driveConnectBtn");if(!connect)return;
 connect.onclick=()=>{try{auth();client.requestAccessToken({prompt:connected()?"":"consent"});}catch(e){status(e.message);}};
 $("driveDisconnectBtn").onclick=()=>{if(token&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});token=null;expires=0;status("Desconectado. Datos locales intactos.");buttons();};
 $("driveUploadBtn").onclick=()=>run(upload);
 $("driveDownloadBtn").onclick=()=>run(download);
 buttons();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
