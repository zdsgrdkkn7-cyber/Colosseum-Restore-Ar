/* Rev20.1 — Borrado explícito de la base aislada de PRUEBAS. */
(()=>{
"use strict";
const DB="colosseumRestoration_PRUEBAS",STORE="reports";
function clearReports(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};
  req.onerror=()=>reject(req.error||Error("No se pudo abrir la base de pruebas"));
  req.onsuccess=()=>{
   const db=req.result;
   try{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=()=>{db.close();reject(tx.error||Error("No se pudo borrar la base"));};
    tx.onabort=()=>{db.close();reject(tx.error||Error("Operación cancelada"));};
   }catch(e){db.close();reject(e);}
  };
 });
}
function init(){
 const btn=document.getElementById("clearTestDatabaseBtn");if(!btn)return;
 btn.addEventListener("click",async()=>{
  if(!confirm("ATENCIÓN: se eliminarán TODOS los reportes, fotos, carpetas y borrador de la BASE DE PRUEBAS de este dispositivo.\n\nLa versión oficial y Google Drive NO se modificarán.\n\n¿Continuar?"))return;
  const typed=prompt("Para confirmar, escribí BORRAR PRUEBAS:");
  if(typed!=="BORRAR PRUEBAS"){alert("Borrado cancelado.");return;}
  btn.disabled=true;
  try{
   await clearReports();
   localStorage.removeItem("colosseumFolders_PRUEBAS_V1");
   localStorage.removeItem("cr_draft_PRUEBAS");
   alert("Base de pruebas vaciada. La aplicación se recargará.");
   location.reload();
  }catch(e){alert("No se pudo borrar la base: "+e.message);btn.disabled=false;}
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
