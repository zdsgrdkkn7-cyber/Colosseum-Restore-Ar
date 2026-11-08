/* Rev20.1 — Exportación ZIP separada, solo lectura. No altera reportes ni fotografías. */
(()=>{
"use strict";
const DB="colosseumRestoration_PRUEBAS",STORE="reports";
const $=id=>document.getElementById(id);
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error("No se pudo abrir la base"));});}
function getAll(db){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.onabort=()=>reject(tx.error||Error("Lectura interrumpida"));});}
function status(s){const el=$("zipExportStatus");if(el)el.textContent=s;}
async function exportZip(){
 if(!window.zip?.ZipWriter||!window.ColosseumMediaV201)throw Error("No se cargaron los módulos ZIP. Comprobá tu conexión e intentá nuevamente.");
 const db=await openDB();let records;
 try{records=await getAll(db);}finally{db.close();}
 if(!records.length)throw Error("No hay reportes en la base de pruebas. No se generó ningún ZIP.");
 status("Preparando "+records.length+" reportes…");
 const writer=new zip.ZipWriter(new zip.BlobWriter("application/zip"),{level:0});
 const filenames=new Set(),manifest={format:"colosseum-split-backup",version:1,createdAt:new Date().toISOString(),database:DB,store:STORE,records:[],photoCount:0,folderPreferences:null};
 try{
  try{manifest.folderPreferences=JSON.parse(localStorage.getItem("colosseumFolders_PRUEBAS_V1")||"null");}catch{}
  for(let i=0;i<records.length;i++){
   status("Procesando reporte "+(i+1)+" de "+records.length+"…");
   const result=await ColosseumMediaV201.split([records[i]]);
   manifest.records.push(result.manifest.records[0]);
   for(const file of result.files){
    if(filenames.has(file.filename))continue;
    await writer.add("photos/"+file.filename,new zip.BlobReader(file.blob),{level:0});
    filenames.add(file.filename);
   }
  }
  manifest.photoCount=filenames.size;
  const check=ColosseumMediaV201.verify(manifest,[...filenames].map(filename=>({filename})));
  if(!check.ok)throw Error("Faltan "+check.missing.length+" fotografías. Se canceló el respaldo.");
  await writer.add("database.json",new zip.TextReader(JSON.stringify(manifest)),{level:0});
  status("Finalizando ZIP…");
  const blob=await writer.close();
  const stamp=new Date().toISOString().slice(0,10),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="Colosseum_Rev20_Pruebas_"+stamp+".zip";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),120000);
  status("ZIP listo: "+records.length+" reportes y "+filenames.size+" fotografías. Guardalo en Archivos.");
 }catch(error){try{await writer.close();}catch{}throw error;}
}
function init(){const btn=$("exportSplitZipBtn");if(!btn)return;btn.addEventListener("click",async()=>{if(!confirm("Generar un ZIP de la BASE DE PRUEBAS con database.json y fotografías separadas?\n\nEsta operación solo lee datos. No modifica reportes ni sube nada a Drive."))return;btn.disabled=true;try{await exportZip();}catch(e){status("Error: "+e.message);alert("No se pudo generar el ZIP: "+e.message);}finally{btn.disabled=false;}});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
