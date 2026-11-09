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
    if(!window.zip?.ZipWriter||!window.ColosseumMediaV201) throw Error("No se cargó el módulo ZIP. Verificá tu conexión.");
    const records=await allReports();
    const writer=new zip.ZipWriter(new zip.BlobWriter("application/zip"),{level:0});
    const names=new Set(), manifest={format:"colosseum-split-backup",version:1,createdAt:new Date().toISOString(),database:DB,store:STORE,records:[],photoCount:0};
    try {
      try{manifest.folderPreferences=JSON.parse(localStorage.getItem("colosseumFoldersV1")||"null");}catch{}
      for(const record of records){
        const part=await ColosseumMediaV201.split([record]);
        manifest.records.push(part.manifest.records[0]);
        for(const file of part.files){
          if(names.has(file.filename))continue;
          await writer.add("photos/"+file.filename,new zip.BlobReader(file.blob),{level:0});
          names.add(file.filename);
        }
      }
      manifest.photoCount=names.size;
      const check=ColosseumMediaV201.verify(manifest,[...names].map(filename=>({filename})));
      if(!check.ok)throw Error("El respaldo tiene referencias a fotografías faltantes.");
      await writer.add("database.json",new zip.TextReader(JSON.stringify(manifest)),{level:0});
      const blob=await writer.close();
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="Colosseum_Respaldo_"+new Date().toISOString().slice(0,10)+".zip";
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);
      alert("ZIP generado: "+records.length+" reportes y "+names.size+" fotografías. Guardalo en Archivos.");
    }catch(e){try{await writer.close();}catch{}throw e;}
  }
  async function importBackup(file) {
    if(!file)return;
    let records,folders=null;
    if(Array.isArray(file.directRecords)){
      records=file.directRecords;folders=file.directFolders||null;
    }else if(file.name.toLowerCase().endsWith(".zip")){
      if(!window.zip?.ZipReader)throw Error("No se cargó el módulo ZIP.");
      const reader=new zip.ZipReader(new zip.BlobReader(file));
      try{
        const entries=await reader.getEntries();
        const byName=new Map(entries.map(e=>[e.filename,e]));
        const jsonEntry=byName.get("database.json");
        if(!jsonEntry||jsonEntry.directory)throw Error("El ZIP no contiene database.json.");
        const payload=JSON.parse(await jsonEntry.getData(new zip.TextWriter()));
        if(payload.format!=="colosseum-split-backup"||payload.version!==1||!Array.isArray(payload.records))throw Error("Formato ZIP incompatible.");
        if(payload.records.length>10000)throw Error("Demasiados reportes.");
        folders=payload.folderPreferences;
        records=[];
        const hashCache=new Map();
        for(const original of payload.records){
          const record={...original,photos:{...(original.photos||{})}};
          for(const key of ["frontBefore","frontAfter","backBefore","backAfter"]){
            const ref=record.photos[key];if(!ref)continue;
            if(!ref.filename||!ref.sha256||!/^([a-f0-9]{64})\.(jpg|png|webp|gif|bin)$/.test(ref.filename)||ref.filename.split(".")[0]!==ref.sha256)throw Error("Referencia de foto inválida.");
            const entry=byName.get("photos/"+ref.filename);
            if(!entry||entry.directory)throw Error("Falta la foto "+ref.filename);
            let data=hashCache.get(ref.filename);
            if(!data){
              const blob=await entry.getData(new zip.BlobWriter(ref.mime||"application/octet-stream"));
              const hash=new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer()));
              const actual=Array.from(hash,x=>x.toString(16).padStart(2,"0")).join("");
              if(actual!==ref.sha256)throw Error("La foto "+ref.filename+" está dañada o fue modificada.");
              const bytes=new Uint8Array(await blob.arrayBuffer());
              let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
              data="data:"+(ref.mime||"application/octet-stream")+";base64,"+btoa(binary);
              hashCache.set(ref.filename,data);
            }
            record.photos[key]=data;
          }
          records.push(record);
        }
      }finally{await reader.close();}
    }else{
      const payload=JSON.parse(await file.text());
      if(!payload||payload.format!==FORMAT||payload.version!==VERSION||!Array.isArray(payload.records))throw Error("JSON incompatible.");
      if(payload.records.length>10000)throw Error("Demasiados reportes.");
      records=payload.records.map(decode);
    }
    const seen=new Set();
    for(const r of records){
      if(!r||typeof r!=="object"||(typeof r.id!=="string"&&typeof r.id!=="number")||seen.has(r.id))throw Error("Reportes con IDs inválidos o duplicados.");
      seen.add(r.id);
    }
    const db=await openDB();let added=0,updated=0,unchanged=0;
    try{
      const existing=await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).getAll();
        req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
      });
      const byId=new Map(existing.map(r=>[r.id,r]));
      const pending=records.map(report=>({report,previous:byId.get(report.id)}));
      const newItems=pending.filter(x=>x.previous===undefined);
      const changed=pending.filter(x=>x.previous!==undefined&&JSON.stringify(x.previous)!==JSON.stringify(x.report));
      unchanged=pending.length-newItems.length-changed.length;
      if(!confirm("IMPORTAR BASE DE DATOS\\n\\nNuevos: "+newItems.length+"\\nExistentes con cambios: "+changed.length+"\\nSin cambios: "+unchanged+"\\n\\nLos reportes existentes con diferencias se REEMPLAZARÁN por la versión importada, incluidas sus fotos.\\n\\n¿Continuar?"))return;
      // Guardar las versiones anteriores en una copia local descargable antes de reemplazarlas.
      // Si hay cambios, la exportación previa es obligatoria para poder revertirlos.
      if(changed.length){
        const backup={format:FORMAT,version:VERSION,exportedAt:new Date().toISOString(),database:DB,store:STORE,records:await Promise.all(changed.map(x=>encode(x.previous)))};
        const stamp=new Date().toISOString().replace(/[:.]/g,"-");
        download(JSON.stringify(backup),"Colosseum_AntesDeImportar_"+stamp+".json");
        if(!confirm("Se descargó un respaldo de los "+changed.length+" reportes que se reemplazarán.\\n\\nVerificá que se haya guardado en Archivos antes de continuar.\\n\\n¿Confirmás la actualización?"))return;
      }
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
        for(const item of newItems){store.add(item.report).onsuccess=()=>added++;}
        for(const item of changed){store.put(item.report).onsuccess=()=>updated++;}
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error("Falló la importación"));tx.onabort=()=>reject(tx.error||Error("Importación cancelada"));
      });
    }finally{db.close();}
    if(folders&&typeof folders==="object"){
      try{
        const key="colosseumFoldersV1",current=JSON.parse(localStorage.getItem(key)||'{"clients":[],"lots":[]}');
        const clients=new Set([...(current.clients||[]),...(Array.isArray(folders.clients)?folders.clients:[])]);
        const lots=new Map([...(current.lots||[]),...(Array.isArray(folders.lots)?folders.lots:[])].filter(x=>Array.isArray(x)&&x.length===2).map(x=>[JSON.stringify(x),x]));
        localStorage.setItem(key,JSON.stringify({clients:[...clients],lots:[...lots.values()]}));
      }catch(e){console.warn("No se pudieron fusionar carpetas",e);}
    }
    alert("Importación finalizada.\nNuevos: "+added+"\nActualizados: "+updated+"\nSin cambios: "+unchanged+"\n\nVolvé a abrir Historial.");
  }
  window.ColosseumImportRecords=(records,folders)=>importBackup({directRecords:records,directFolders:folders});
  async function clearAllLocalData() {
    const records=await allReports();
    if(!confirm("ATENCIÓN: VERSIÓN OFICIAL\\n\\nSe eliminarán definitivamente "+records.length+" reportes, sus fotos, carpetas y borrador SOLO DE ESTE DISPOSITIVO. Google Drive no se modifica.\\n\\n¿Querés continuar?"))return;
    if(prompt("Para confirmar el borrado de la base OFICIAL escribí exactamente: BORRAR OFICIAL")!=="BORRAR OFICIAL")return;
    const db=await openDB();
    try{
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error||Error("No se pudo borrar la base"));
        tx.onabort=()=>reject(tx.error||Error("Se canceló el borrado"));
      });
    }finally{db.close();}
    localStorage.removeItem("cr_draft");
    localStorage.removeItem("colosseumFoldersV1");
    alert("Se borraron los datos locales oficiales. Se recargará la página.");
    location.reload();
  }
  function init() {
    const exportBtn=$("exportDatabaseBtn"), importBtn=$("importDatabaseBtn"), input=$("databaseFileInput");
    if(!exportBtn || !importBtn || !input) return;
    exportBtn.addEventListener("click",async()=>{
      exportBtn.disabled=true;
      try{if(window.ColosseumDrive?.connected())await window.ColosseumDrive.upload();else await exportBackup();}catch(e){alert("No se pudo exportar: "+e.message);}
      finally{exportBtn.disabled=false;}
    });
    const clearBtn=$("clearDatabaseBtn");
    if(clearBtn)clearBtn.addEventListener("click",async()=>{clearBtn.disabled=true;try{await clearAllLocalData();}catch(e){alert("No se pudo borrar: "+e.message);}finally{clearBtn.disabled=false;}});
    importBtn.addEventListener("click",()=>{if(window.ColosseumDrive?.connected())window.ColosseumDrive.download();else input.click();});
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
