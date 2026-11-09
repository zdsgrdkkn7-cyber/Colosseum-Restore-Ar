/* Colosseum Rev20.1 — formato separado, sin migración automática.
   No modifica IndexedDB ni Drive. Fotos identificadas por SHA-256 de sus bytes.
   Compatible con fotos data:URL, Blob y objetos binarios del respaldo anterior. */
(()=>{
"use strict";
const KEYS=["frontBefore","frontAfter","backBefore","backAfter"];
const FORMAT="colosseum-split-backup",VERSION=1;
function base64Bytes(s){const b=atob(s.replace(/\s/g,""));const out=new Uint8Array(b.length);for(let i=0;i<b.length;i++)out[i]=b.charCodeAt(i);return out;}
function mimeExt(m){return {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}[m]||"bin";}
async function asFile(value){
 if(value instanceof Blob)return {blob:value,mime:value.type||"application/octet-stream"};
 if(typeof value==="string"&&value.startsWith("data:")){
  const m=/^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(value);
  if(!m||!m[2])throw Error("Imagen data URL no compatible");
  const mime=m[1]||"application/octet-stream",bytes=base64Bytes(m[3]);
  return {blob:new Blob([bytes],{type:mime}),mime};
 }
 if(value&&typeof value==="object"&&value.__colosseumType==="Blob"&&typeof value.bytes==="string"){
  const mime=value.mime||"application/octet-stream";
  return {blob:new Blob([base64Bytes(value.bytes)],{type:mime}),mime};
 }
 throw Error("Tipo de fotografía no compatible; no se modificó ningún dato");
}
async function sha256(blob){const h=new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer()));return Array.from(h,x=>x.toString(16).padStart(2,"0")).join("");}
async function split(records){
 if(!Array.isArray(records))throw Error("Se esperaba un arreglo de reportes");
 const files=new Map(),out=[];
 for(const original of records){
  if(!original||original.id==null)throw Error("Reporte sin identificador");
  const report={...original,photos:{...(original.photos||{})}};
  for(const key of KEYS){
   const value=report.photos[key];if(!value)continue;
   if(value&&typeof value==="object"&&value.fileId)continue;
   const {blob,mime}=await asFile(value),hash=await sha256(blob);
   const filename=hash+"."+mimeExt(mime);
   if(!files.has(filename))files.set(filename,{filename,blob,mime,sha256:hash});
   report.photos[key]={fileId:null,filename,sha256:hash,mime,size:blob.size};
  }
  out.push(report);
 }
 return {manifest:{format:FORMAT,version:VERSION,createdAt:new Date().toISOString(),records:out},files:[...files.values()]};
}
function verify(manifest,files){
 if(manifest?.format!==FORMAT||manifest.version!==VERSION||!Array.isArray(manifest.records))throw Error("Manifiesto incompatible");
 const names=new Set(files.map(f=>f.filename)),missing=[];
 for(const report of manifest.records)for(const key of KEYS){
  const p=report.photos?.[key];if(p?.filename&&!names.has(p.filename))missing.push({reportId:report.id,photo:key,filename:p.filename});
 }
 return {ok:missing.length===0,missing};
}
window.ColosseumMediaV201=Object.freeze({split,verify,format:FORMAT,version:VERSION});
})();
