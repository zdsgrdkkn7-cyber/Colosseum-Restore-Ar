/* Colosseum Restoration — Backup/Import Rev18.8.0.
   Compatible with IndexedDB colosseumRestoration v1 / reports. */
(() => {
  "use strict";
  const DB = "colosseumRestoration", STORE = "reports", FORMAT = "colosseum-restoration-backup", VERSION = 1;
  const $ = id => document.getElementById(id);
  function openDB() {
    return new Promise((resolve,reject) => {
      const req = indexedDB.open(DB,1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:"id"});
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || Error("No se pudo abrir la base"));
    });
  }
  const bytesToBase64 = bytes => {
    let result = "";
    for(let i=0;i<bytes.length;i+=8192) result += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(result);
  };
  const base64ToBytes = text => {
    const raw = atob(text), bytes = new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i);
    return bytes;
  };
  async function encode(value) {
    if(value instanceof Blob) return {__colosseumType:"Blob",mime:value.type,bytes:bytesToBase64(new Uint8Array(await value.arrayBuffer()))};
    if(value instanceof Date) return {__colosseumType:"Date",value:value.toISOString()};
    if(value instanceof ArrayBuffer) return {__colosseumType:"ArrayBuffer",bytes:bytesToBase64(new Uint8Array(value))};
    if(ArrayBuffer.isView(value)) return {__colosseumType:"Uint8Array",bytes:bytesToBase64(new Uint8Array(value.buffer,value.byteOffset,value.byteLength))};
    if(Array.isArray(value)) return Promise.all(value.map(encode));
    if(value && typeof value==="object"){
      const obj={};
      for(const [k,v] of Object.entries(value)) obj[k]=await encode(v);
      return obj;
    }
    return value;
  }
  function decode(value) {
    if(Array.isArray(value)) return value.map(decode);
    if(value && typeof value==="object") {
      if(value.__colosseumType==="Blob") return new Blob([base64ToBytes(value.bytes)],{type:value.mime||""});
      if(value.__colosseumType==="Date") return new Date(value.value);
      if(value.__colosseumType==="ArrayBuffer") return base64ToBytes(value.bytes).buffer;
      if(value.__colosseumType==="Uint8Array") return base64ToBytes(value.bytes);
      const obj={};
      for(const [k,v] of Object.entries(value)) obj[k]=decode(v);
      return obj;
    }
    return value;
  }
  async function allReports() {
    const db=await openDB();
    try {
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readonly");
        const req=tx.objectStore(STORE).getAll();
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error);
        tx.onabort=()=>reject(tx.error||Error("Lectura interrumpida"));
      });
    } finally {db.close();}
  }
  function download(text,name) {
    const url=URL.createObjectURL(new Blob([text],{type:"application/json;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function exportBackup() {
    const records=await allReports();
    const payload={format:FORMAT,version:VERSION,exportedAt:new Date().toISOString(),database:DB,store:STORE,records:await Promise.all(records.map(encode))};
    const stamp=new Date().toISOString().slice(0,10);
    download(JSON.stringify(payload),"Colosseum_Respaldo_"+stamp+".json");
    alert("Respaldo generado: "+records.length+" reportes. Guardá el archivo en Archivos o iCloud.");
  }
  async function importBackup(file) {
    if(!file) return;
    const payload=JSON.parse(await file.text());
    if(!payload || payload.format!==FORMAT || payload.version!==VERSION || !Array.isArray(payload.records))
      throw Error("Archivo incompatible. Seleccioná un respaldo JSON de Colosseum.");
    if(payload.records.length>10000) throw Error("El archivo contiene demasiados registros.");
    const records=payload.records.map(decode);
    const seen=new Set();
    for(const r of records) {
      if(!r || typeof r!=="object" || !Object.prototype.hasOwnProperty.call(r,"id") ||
         (typeof r.id!=="string" && typeof r.id!=="number") || seen.has(r.id))
        throw Error("El respaldo contiene reportes sin ID válido o duplicados.");
      seen.add(r.id);
    }
    if(!confirm("Se encontraron "+records.length+" reportes.\n\nSe agregarán solamente los que no existan. Ningún reporte actual será sobrescrito.\n\n¿Importar?")) return;
    const db=await openDB();
    let added=0,skipped=0;
    try {
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite"), store=tx.objectStore(STORE);
        for(const report of records) {
          const get=store.get(report.id);
          get.onsuccess=()=>{
            if(get.result!==undefined){skipped++;return;}
            const put=store.add(report);
            put.onsuccess=()=>added++;
          };
        }
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||Error("Falló la importación"));
        tx.onabort=()=>reject(tx.error||Error("Importación cancelada"));
      });
    } finally {db.close();}
    alert("Importación finalizada.\nNuevos: "+added+"\nYa existentes (sin cambios): "+skipped+"\n\nCerrá y volvé a abrir Historial para verlos.");
  }

  async function clearAllLocalData() {
    const records=await allReports();
    if(!confirm("¿BORRAR TODOS LOS DATOS DE COLOSSEUM EN ESTE DISPOSITIVO?\\n\\nSe eliminarán "+records.length+" reportes, sus fotos, las carpetas y el borrador actual. No se puede deshacer.\\n\\nExportá un respaldo antes de continuar si querés conservarlos."))return;
    if(!confirm("ÚLTIMA CONFIRMACIÓN\\n\\n¿Eliminar definitivamente todos los archivos locales?"))return;
    const db=await openDB();
    try {
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||Error("No se pudo vaciar la base"));
        tx.onabort=()=>reject(tx.error||Error("Se canceló el borrado"));
      });
    } finally {db.close();}
    localStorage.removeItem("cr_draft");
    localStorage.removeItem("colosseumFoldersV1");
    alert("Datos locales eliminados. La aplicación se recargará vacía.");
    location.reload();
  }
  function init() {
    const exportBtn=$("exportDatabaseBtn"), importBtn=$("importDatabaseBtn"), input=$("databaseFileInput");
    if(!exportBtn || !importBtn || !input) return;
    exportBtn.addEventListener("click",async()=>{
      exportBtn.disabled=true;
      try{await exportBackup();}catch(e){alert("No se pudo exportar: "+e.message);}
      finally{exportBtn.disabled=false;}
    });
    const clearBtn=$("clearDatabaseBtn");
    if(clearBtn) clearBtn.addEventListener("click",async()=>{
      clearBtn.disabled=true;
      try{await clearAllLocalData();}catch(e){alert("No se pudo borrar la base: "+e.message);}
      finally{clearBtn.disabled=false;}
    });
    importBtn.addEventListener("click",()=>input.click());
    input.addEventListener("change",async()=>{
      const file=input.files && input.files[0];input.value="";
      if(!file)return;
      importBtn.disabled=true;
      try{await importBackup(file);}catch(e){alert("No se pudo importar: "+e.message);}
      finally{importBtn.disabled=false;}
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
