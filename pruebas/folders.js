/* Colosseum - hierarchical client / lot history. Additive, no database migration. */
(function(){
'use strict';
const DEFAULT_LOT='General';
const norm=v=>String(v||'').trim();
const clientOf=r=>norm(r.clientFolder)||norm(r.fields?.cliente)||'Sin cliente';
const lotOf=r=>norm(r.lotFolder)||DEFAULT_LOT;
let filterClient='',filterLot='',currentClient='',currentLot='';
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(c,l)=>JSON.stringify([c,l]);
const folderPrefs=()=>{try{return JSON.parse(localStorage.getItem('colosseumFolders_PRUEBAS_V1')||'{"clients":[],"lots":[]}')}catch{return {clients:[],lots:[]}}};
function remember(c,l){const p=folderPrefs();p.clients=p.clients||[];p.lots=p.lots||[];if(!p.clients.includes(c))p.clients.push(c);if(l&&!p.lots.some(x=>x[0]===c&&x[1]===l))p.lots.push([c,l]);localStorage.setItem('colosseumFolders_PRUEBAS_V1',JSON.stringify(p));}
window.assignReportFolder=function(data){
 const c=norm(data.fields?.cliente)||'Sin cliente';
 const l=norm(data.fields?.lote)||norm(data.lotFolder)||DEFAULT_LOT;
 data.clientFolder=c;data.lotFolder=l;
 data.fields.lote=l;
 remember(c,l);
};
window.resetReportFolderSelection=function(){
 const c=currentClient||'';const l=currentClient?(currentLot||DEFAULT_LOT):'';
 const client=document.querySelector('#cliente'),lot=document.querySelector('#lote');
 if(client)client.value=c;if(lot)lot.value=l;
 state.clientFolder=c;state.lotFolder=l;
};
function newReportInLot(c,l){
 currentClient=c;currentLot=l;
 clearForm();window.resetReportFolderSelection();autosaveDraft();
 const dialog=document.querySelector('#historyDialog');if(dialog?.open)dialog.close();
 document.querySelector('#cliente')?.focus();
}
async function putReport(r){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('reports','readwrite');tx.objectStore('reports').put(r);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});}
async function move(r,c,l){r.clientFolder=c;r.lotFolder=l;r.fields=r.fields||{};r.fields.cliente=c;r.fields.lote=l;r.updatedAt=new Date().toISOString();remember(c,l);await putReport(r);await renderHistory();}
function node(tag,cls,content){const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el;}
function btn(label,handler){const b=node('button','folder-button',label);b.type='button';b.onclick=handler;return b;}
function chooseFolder(defaultClient,defaultLot){const clients=[...new Set([...historyReports.map(clientOf),...(folderPrefs().clients||[])])].sort((a,b)=>a.localeCompare(b));const c=prompt('Cliente de destino (existente o nuevo):\n'+clients.join(' · '),defaultClient);if(c===null||!norm(c))return null;const lots=[...new Set([...historyReports.filter(r=>clientOf(r)===norm(c)).map(lotOf),...(folderPrefs().lots||[]).filter(x=>x[0]===norm(c)).map(x=>x[1])])];const l=prompt('Lote de destino (existente o nuevo):\n'+lots.join(' · '),defaultLot||DEFAULT_LOT);if(l===null||!norm(l))return null;return [norm(c),norm(l)];}
window.renderFolderHistory=function(root,reports){
 root.innerHTML='';const pref=folderPrefs();const clients=[...new Set([...reports.map(clientOf),...(pref.clients||[])])].sort((a,b)=>a.localeCompare(b));
 const head=node('div','folder-breadcrumb');head.append(btn('CLIENTES',()=>{filterClient='';filterLot='';renderHistory()}));if(filterClient){head.append(node('span','',' › '));head.append(btn(filterClient,()=>{filterLot='';renderHistory()}));}if(filterLot)head.append(node('span','',' › '+filterLot));root.append(head);
 if(!filterClient){clients.forEach(c=>{const rs=reports.filter(r=>clientOf(r)===c);const row=node('div','folder-entry');row.append(btn('📁 '+c+' ('+rs.length+')',()=>{filterClient=c;filterLot='';renderHistory()}));row.append(btn('RENOMBRAR',async()=>{const next=prompt('Nuevo nombre del cliente:',c);if(!next||!norm(next)||norm(next)===c)return;for(const r of rs){r.clientFolder=norm(next);r.fields=r.fields||{};r.fields.cliente=norm(next);await putReport(r)}const p=folderPrefs();p.clients=(p.clients||[]).map(x=>x===c?norm(next):x);p.lots=(p.lots||[]).map(x=>x[0]===c?[norm(next),x[1]]:x);localStorage.setItem('colosseumFolders_PRUEBAS_V1',JSON.stringify(p));await renderHistory()}));root.append(row)});return;}
 const lots=[...new Set([...reports.filter(r=>clientOf(r)===filterClient).map(lotOf),...(pref.lots||[]).filter(x=>x[0]===filterClient).map(x=>x[1])])].sort((a,b)=>a.localeCompare(b));
 if(!filterLot){root.append(btn('＋ NUEVO LOTE',()=>document.querySelector('#createLotFolder')?.click()));lots.forEach(l=>{const rs=reports.filter(r=>clientOf(r)===filterClient&&lotOf(r)===l);const row=node('div','folder-entry');row.append(btn('📁 '+l+' ('+rs.length+')',()=>{filterLot=l;renderHistory()}));row.append(btn('RENOMBRAR',async()=>{const next=prompt('Nuevo nombre del lote:',l);if(!next||!norm(next)||norm(next)===l)return;for(const r of rs){r.lotFolder=norm(next);r.fields=r.fields||{};r.fields.lote=norm(next);await putReport(r)}const p=folderPrefs();p.lots=(p.lots||[]).map(x=>x[0]===filterClient&&x[1]===l?[filterClient,norm(next)]:x);localStorage.setItem('colosseumFolders_PRUEBAS_V1',JSON.stringify(p));await renderHistory()}));root.append(row)});return;}
 root.append(btn('＋ NUEVO REPORTE',()=>newReportInLot(filterClient,filterLot)));
 const matching=reports.filter(r=>clientOf(r)===filterClient&&lotOf(r)===filterLot);if(!matching.length)root.append(node('p','small','Este lote todavía no tiene reportes.'));
 matching.forEach(r=>{const item=node('div','history-item');item.dataset.reportId=r.id;const check=node('input','history-check');check.type='checkbox';check.checked=selectedReportIds.has(r.id);check.setAttribute('aria-label','Seleccionar '+(r.fields?.carta||'reporte'));check.onchange=()=>{if(check.checked)selectedReportIds.add(r.id);else selectedReportIds.delete(r.id);updateRemitoControls()};const detail=node('div','');detail.innerHTML='<strong>'+escapeHTML(r.fields?.carta||'Sin nombre')+'</strong><div class="small">'+escapeHTML(r.fields?.fecha||'')+'</div>';const cost=node('div','history-cost',formatHistoryCost(r.fields?.precioTrabajo));item.append(check,detail,cost,btn('ABRIR',()=>{currentClient=filterClient;currentLot=filterLot;apply(r);document.querySelector('#historyDialog').close();autosaveDraft()}),btn('MOVER',async()=>{const dest=chooseFolder(filterClient,filterLot);if(dest)await move(r,...dest)}),btn('BORRAR',()=>deleteReport(r.id)));root.append(item)});
};
function setup(){const toolbar=document.querySelector('#folderToolbar');if(!toolbar)return;document.querySelector('#createClientFolder').onclick=()=>{const c=prompt('Nombre del nuevo cliente:');if(!norm(c))return;remember(norm(c),null);filterClient=norm(c);filterLot='';renderHistory()};document.querySelector('#createLotFolder').onclick=()=>{const c=filterClient||norm(prompt('Cliente para este lote:'));if(!c)return;const l=prompt('Nombre del lote:');if(!norm(l))return;remember(c,norm(l));filterClient=c;filterLot=norm(l);currentClient=c;currentLot=norm(l);renderHistory()};document.querySelector('#showAllFolders').onclick=()=>{filterClient='';filterLot='';renderHistory()};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();