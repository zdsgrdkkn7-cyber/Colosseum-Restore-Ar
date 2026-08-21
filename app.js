const criteria={
 front:["Suciedad","Rayones","Pliegues","Creases","Delaminación","Whitening","Brillo"],
 back:["Suciedad","Rayones","Pliegues","Creases","Delaminación","Whitening","Brillo"],
 extra:["Suciedad (canto / borde)","Bending"]
};
const state={
 id:null,ratings:{before:{},after:{}},
 photos:{frontBefore:null,frontAfter:null,backBefore:null,backAfter:null},
 work:{limpieza:false,bordes:false,pliegues:false,relaminado:false,prensado:false,pulido:false,lustrado:false,otro:false},
 budgetManualOverride:false,
 finalManualOverride:false
};
const fields=["cliente","fecha","carta","numero","set","version","idioma","estado","precio","observaciones","otroTrabajo","resultadoFrente","resultadoDorso","precioPresupuestado","descuentoResultado","precioTrabajo"];
const $=s=>document.querySelector(s);
const keyFor=(g,i)=>`${g}__${i}`;

const WORK_ITEM_PRICE=5;
const MIN_RESTORATION_PRICE=15;

function parseMoney(value){
  const raw=String(value??"").trim().replace(/\s/g,"");
  if(!raw)return 0;
  let clean=raw.replace(/[^\d,.\-]/g,"");
  if(clean.includes(",")&&clean.includes(".")){
    if(clean.lastIndexOf(",")>clean.lastIndexOf("."))clean=clean.replace(/\./g,"").replace(",",".");
    else clean=clean.replace(/,/g,"");
  }else if(clean.includes(",")){
    clean=clean.replace(",",".");
  }
  const n=Number.parseFloat(clean);
  return Number.isFinite(n)?n:0;
}

function formatMoneyInput(n){
  const value=Number(n)||0;
  return Number.isInteger(value)?String(value):value.toFixed(2).replace(".",",");
}

function formatUsd(n){
  const value=Number(n)||0;
  return `U$ ${value.toFixed(2).replace(".",",")}`;
}

function getResponsibilityFactor(){
  const raw=$("#precio")?.value?.trim()||"";
  if(!raw)return {factor:1,label:"×1,00",special:false};

  const value=parseMoney(raw);
  if(value<=50)return {factor:.50,label:"×0,50",special:false};
  if(value<=100)return {factor:.75,label:"×0,75",special:false};
  if(value<=250)return {factor:1.00,label:"×1,00",special:false};
  if(value<=500)return {factor:1.25,label:"×1,25",special:false};
  if(value<=750)return {factor:1.50,label:"×1,50",special:false};
  if(value<=1000)return {factor:1.75,label:"×1,75",special:false};
  if(value<=1500)return {factor:2.00,label:"×2,00",special:false};
  if(value<=2000)return {factor:3.00,label:"×3,00",special:false};
  return {factor:null,label:"EVALUACIÓN ESPECIAL",special:true};
}

function getSelectedWorkCount(){
  return Object.entries(state.work).filter(([k,v])=>v && ["limpieza","bordes","pliegues","relaminado","prensado","pulido","lustrado","otro"].includes(k)).length;
}

function updateFinalCost({force=false}={}){
  const budget=parseMoney($("#precioPresupuestado")?.value);
  const discountPercent=Math.max(0,Math.min(100,parseMoney($("#descuentoResultado")?.value)));
  const final=Math.max(0,budget*(1-discountPercent/100));
  const finalEl=$("#precioTrabajo");
  if(force)state.finalManualOverride=false;
  if(finalEl && !state.finalManualOverride)finalEl.value=formatMoneyInput(final);
}

function updateBudgetPreview({force=false}={}){
  const count=getSelectedWorkCount();
  const worksSubtotal=count*WORK_ITEM_PRICE;
  const factorInfo=getResponsibilityFactor();

  const worksEl=$("#trabajosPropuestos");
  const factorEl=$("#factorResponsabilidad");
  if(worksEl)worksEl.textContent=formatUsd(worksSubtotal);
  if(factorEl)factorEl.textContent=factorInfo.label;

  const budgetEl=$("#precioPresupuestado");
  if(force)state.budgetManualOverride=false;

  if(!state.budgetManualOverride && budgetEl){
    if(factorInfo.special){
      // Above U$2,000 the table intentionally requires manual evaluation.
      budgetEl.value="";
    }else{
      const suggested=count===0?0:Math.max(MIN_RESTORATION_PRICE,worksSubtotal*factorInfo.factor);
      budgetEl.value=formatMoneyInput(suggested);
    }
  }
  updateFinalCost();
}


function buildRatings(){
 [["#ratings-front","front"],["#ratings-back","back"],["#ratings-extra","extra"]].forEach(([sel,group])=>{
  const box=$(sel);if(!box)return;box.innerHTML="";
  criteria[group].forEach(item=>{
   const row=document.createElement("div");row.className="rating-row";
   row.appendChild(makeScale("before",group,item));
   const label=document.createElement("div");label.className="criterion";label.textContent=item;row.appendChild(label);
   row.appendChild(makeScale("after",group,item));box.appendChild(row);
  });
 });
}
function makeScale(side,group,item){
 const wrap=document.createElement("div");wrap.className="scale";const key=keyFor(group,item);
 if(state.ratings[side][key]==null)state.ratings[side][key]=0;
 for(let i=1;i<=10;i++){
  const b=document.createElement("button");b.type="button";b.title=`${i}/10`;
  b.innerHTML=`<span class="ball ${i<=state.ratings[side][key]?"on":""}"></span>`;
  b.onclick=()=>{
    const current=Number(state.ratings[side][key]||0);
    const next=(i===1 && current===1)?0:i;
    state.ratings[side][key]=next;
    refreshScale(wrap,next);
    autosaveDraft();
  };
  wrap.appendChild(b);
 }return wrap;
}
function refreshScale(wrap,val){[...wrap.querySelectorAll("button")].forEach((b,i)=>b.querySelector(".ball").classList.toggle("on",i<val))}
function toast(msg){const t=$("#toast");if(!t)return;t.textContent=msg;t.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display="none",1700)}
function resizeImage(file,max=1400,quality=.82){return new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{let{width,height}=img;const sc=Math.min(1,max/Math.max(width,height));width=Math.round(width*sc);height=Math.round(height*sc);const c=document.createElement("canvas");c.width=width;c.height=height;c.getContext("2d").drawImage(img,0,0,width,height);URL.revokeObjectURL(url);resolve(c.toDataURL("image/jpeg",quality))};img.onerror=reject;img.src=url})}

document.querySelectorAll(".photo-box").forEach(box=>{
 const input=box.querySelector("input");
 box.onclick=()=>input.click();
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;const data=await resizeImage(file);state.photos[box.dataset.photo]=data;const img=box.querySelector("img");img.src=data;img.hidden=false;box.classList.add("has-photo");autosaveDraft()}
});
document.querySelectorAll(".work-item").forEach(btn=>{
 btn.onclick=()=>{
   const k=btn.dataset.work;
   state.work[k]=!state.work[k];
   btn.classList.toggle("active",state.work[k]);
   btn.querySelector(".ball").classList.toggle("on",state.work[k]);
   updateBudgetPreview();
   autosaveDraft()
 }
});

function collect(){
 const d={id:state.id,createdAt:new Date().toISOString(),ratings:state.ratings,photos:state.photos,work:state.work,budgetManualOverride:state.budgetManualOverride,finalManualOverride:state.finalManualOverride,fields:{}};
 fields.forEach(id=>{const el=$("#"+id);d.fields[id]=el?el.value:""});
 return d;
}
function apply(data){
 if(!data)return;
 state.id=data.id||null;
 state.ratings=data.ratings||{before:{},after:{}};
 state.photos=data.photos||{};
 state.work={limpieza:false,bordes:false,pliegues:false,relaminado:false,prensado:false,pulido:false,lustrado:false,otro:false,...(data.work||{})};
 state.budgetManualOverride=!!data.budgetManualOverride;
 state.finalManualOverride=!!data.finalManualOverride;

 fields.forEach(id=>{
   const el=$("#"+id);
   if(!el)return;
   let value=data.fields?.[id]||"";
   // Compatibility with reports created before Frente/Dorso were separated.
   if(id==="resultadoFrente" && !value)value=data.fields?.resultado||"";
   // Rev15 and earlier only had precioTrabajo. Preserve that exact amount.
   if(id==="precioPresupuestado" && !value && data.fields?.precioTrabajo){
     value=data.fields.precioTrabajo;
     state.budgetManualOverride=true;
   }
   el.value=value;
 });
 buildRatings();
 document.querySelectorAll(".work-item").forEach(btn=>{const on=!!state.work[btn.dataset.work];btn.classList.toggle("active",on);btn.querySelector(".ball").classList.toggle("on",on)});
 document.querySelectorAll(".photo-box").forEach(box=>{const v=state.photos[box.dataset.photo],img=box.querySelector("img");if(v){img.src=v;img.hidden=false;box.classList.add("has-photo")}else{img.hidden=true;box.classList.remove("has-photo")}});
 updateBudgetPreview();
}
function clearForm(){
 state.id=null;state.ratings={before:{},after:{}};state.photos={frontBefore:null,frontAfter:null,backBefore:null,backAfter:null};state.work={limpieza:false,bordes:false,pliegues:false,relaminado:false,prensado:false,pulido:false,lustrado:false,otro:false};state.budgetManualOverride=false;state.finalManualOverride=false;
 fields.forEach(id=>{const el=$("#"+id);if(el)el.value=id==="fecha"?new Date().toISOString().slice(0,10):""});buildRatings();
 document.querySelectorAll(".work-item").forEach(b=>{b.classList.remove("active");b.querySelector(".ball").classList.remove("on")});
 document.querySelectorAll(".photo-box").forEach(box=>{box.classList.remove("has-photo");const img=box.querySelector("img");img.hidden=true;img.removeAttribute("src");box.querySelector("input").value=""});
 localStorage.removeItem("cr_draft");
 updateBudgetPreview({force:true});
}
function autosaveDraft(){try{localStorage.setItem("cr_draft",JSON.stringify(collect()))}catch(e){}}
fields.forEach(id=>{
 const el=$("#"+id);
 if(!el)return;
 el.addEventListener("input",()=>{
   if(id==="precio"){
     updateBudgetPreview();
   }else if(id==="precioPresupuestado"){
     state.budgetManualOverride=true;
     updateFinalCost();
   }else if(id==="descuentoResultado"){
     const pct=Math.max(0,Math.min(100,parseMoney(el.value)));
     if(el.value.trim() && parseMoney(el.value)!==pct)el.value=formatMoneyInput(pct);
     updateFinalCost();
   }else if(id==="precioTrabajo"){
     state.finalManualOverride=true;
   }
   autosaveDraft();
 });
});


const selectedReportIds=new Set();
let historyReports=[];

function parseCostValue(value){
  const raw=String(value??"").trim().replace(/\s/g,"");
  if(!raw)return 0;
  // Handles "30", "30,5", "30.50", "U$30", "$30", etc.
  let clean=raw.replace(/[^\d,.\-]/g,"");
  if(clean.includes(",") && clean.includes(".")){
    if(clean.lastIndexOf(",")>clean.lastIndexOf(".")){
      clean=clean.replace(/\./g,"").replace(",",".");
    }else{
      clean=clean.replace(/,/g,"");
    }
  }else if(clean.includes(",")){
    clean=clean.replace(",",".");
  }
  const n=Number.parseFloat(clean);
  return Number.isFinite(n)?n:0;
}

function formatHistoryCost(value){
  const n=parseCostValue(value);
  return `U$ ${Number.isInteger(n)?n.toFixed(0):n.toFixed(2)}`;
}

function updateRemitoControls(){
  const count=selectedReportIds.size;
  const countEl=$("#selectedReportCount");
  const btn=$("#remitoBtn");
  const allBtn=$("#selectAllReports");
  if(countEl)countEl.textContent=`${count} ${count===1?"reporte seleccionado":"reportes seleccionados"}`;
  if(btn)btn.disabled=count===0;
  if(allBtn)allBtn.textContent=(historyReports.length>0 && count===historyReports.length)?"DESELECCIONAR TODO":"SELECCIONAR TODO";
}

function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open("colosseumRestoration",1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("reports"))r.result.createObjectStore("reports",{keyPath:"id"})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveReport(){const data=collect();if(!data.id)data.id=crypto.randomUUID();data.updatedAt=new Date().toISOString();state.id=data.id;const d=await db();await new Promise((res,rej)=>{const tx=d.transaction("reports","readwrite");tx.objectStore("reports").put(data);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});autosaveDraft();toast("REPORTE GUARDADO")}
async function listReports(){const d=await db();return await new Promise((res,rej)=>{const r=d.transaction("reports","readonly").objectStore("reports").getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")));r.onerror=()=>rej(r.error)})}
async function deleteReport(id){
 const d=await db();
 await new Promise((res,rej)=>{
   const tx=d.transaction("reports","readwrite");
   tx.objectStore("reports").delete(id);
   tx.oncomplete=res;
   tx.onerror=()=>rej(tx.error)
 });
 selectedReportIds.delete(id);
 await renderHistory();
}

async function renderHistory(){
 const list=$("#historyList");
 if(!list)return;
 list.innerHTML="";
 historyReports=await listReports();

 // Drop selections for reports that no longer exist.
 const validIds=new Set(historyReports.map(r=>r.id));
 [...selectedReportIds].forEach(id=>{if(!validIds.has(id))selectedReportIds.delete(id)});

 if(!historyReports.length){
   list.innerHTML='<p class="small">Todavía no hay reportes guardados.</p>';
   updateRemitoControls();
   return;
 }

 historyReports.forEach(r=>{
   const item=document.createElement("div");
   item.className="history-item";
   item.dataset.reportId=r.id;

   const check=document.createElement("input");
   check.type="checkbox";
   check.className="history-check";
   check.checked=selectedReportIds.has(r.id);
   check.setAttribute("aria-label",`Seleccionar ${r.fields?.carta||"reporte"}`);
   check.onchange=()=>{
     if(check.checked)selectedReportIds.add(r.id);
     else selectedReportIds.delete(r.id);
     updateRemitoControls();
   };

   const text=document.createElement("div");
   text.innerHTML=`<strong>${r.fields?.carta||"Sin nombre"}</strong>
     <div class="small">${r.fields?.cliente||"Sin cliente"} · ${r.fields?.fecha||""}</div>`;

   const cost=document.createElement("div");
   cost.className="history-cost";
   cost.textContent=formatHistoryCost(r.fields?.precioTrabajo);

   const open=document.createElement("button");
   open.textContent="ABRIR";
   open.onclick=()=>{
     apply(r);
     $("#historyDialog").close();
     autosaveDraft();
   };

   const del=document.createElement("button");
   del.textContent="BORRAR";
   del.onclick=()=>deleteReport(r.id);

   item.append(check,text,cost,open,del);
   list.appendChild(item);
 });
 updateRemitoControls();
}

async function createSelectedRemito(){
 const reports=historyReports.filter(r=>selectedReportIds.has(r.id));
 if(!reports.length){
   toast("SELECCIONÁ AL MENOS UN REPORTE");
   return;
 }
 const discountEl=$("#lotDiscount");
 let discount=Number.parseFloat(discountEl?.value||"0");
 if(!Number.isFinite(discount))discount=0;
 discount=Math.max(0,Math.min(100,discount));
 if(discountEl)discountEl.value=String(discount);

 if(typeof generateRemito!=="function"){
   toast("GENERADOR DE REMITO NO DISPONIBLE");
   return;
 }
 await generateRemito(reports,discount);
}

function initControls(){
 const saveBtn=$("#saveBtn"),newBtn=$("#newBtn"),pdfBtn=$("#pdfBtn"),budgetPdfBtn=$("#budgetPdfBtn"),historyBtn=$("#historyBtn"),closeHistory=$("#closeHistory"),
       remitoBtn=$("#remitoBtn"),selectAllReports=$("#selectAllReports"),recalculateBudgetBtn=$("#recalculateBudgetBtn");
 if(saveBtn)saveBtn.onclick=async()=>{try{await saveReport()}catch(e){console.error(e);toast("ERROR AL GUARDAR")}};
 if(newBtn)newBtn.onclick=()=>{if(confirm("¿Crear un reporte nuevo?")){clearForm();toast("NUEVO REPORTE")}};
 if(pdfBtn)pdfBtn.onclick=async()=>{try{if(typeof generatePdf!=="function")throw new Error("generatePdf no disponible");await generatePdf()}catch(e){console.error(e);toast("ERROR AL GENERAR PDF")}};
 if(budgetPdfBtn)budgetPdfBtn.onclick=async()=>{
   try{
     if(typeof generateBudgetPdf!=="function")throw new Error("generateBudgetPdf no disponible");
     await generateBudgetPdf();
   }catch(e){console.error(e);toast("ERROR AL GENERAR PRESUPUESTO")}
 };
 if(historyBtn)historyBtn.onclick=async()=>{try{await renderHistory();const dialog=$("#historyDialog");if(dialog)dialog.showModal()}catch(e){console.error(e);toast("ERROR EN HISTORIAL")}};
 if(closeHistory)closeHistory.onclick=()=>{const dialog=$("#historyDialog");if(dialog)dialog.close()};
 if(remitoBtn)remitoBtn.onclick=async()=>{
   try{await createSelectedRemito()}catch(e){console.error(e);toast("ERROR AL GENERAR REMITO")}
 };
 if(selectAllReports)selectAllReports.onclick=()=>{
   if(historyReports.length && selectedReportIds.size===historyReports.length)selectedReportIds.clear();
   else historyReports.forEach(r=>selectedReportIds.add(r.id));
   document.querySelectorAll(".history-check").forEach(ch=>{ch.checked=selectedReportIds.has(ch.closest(".history-item")?.dataset?.reportId)});
   renderHistory().catch(console.error);
 };
 if(recalculateBudgetBtn)recalculateBudgetBtn.onclick=()=>{
   const info=getResponsibilityFactor();
   if(info.special){
     state.budgetManualOverride=true;
     const budget=$("#precioPresupuestado");
     if(budget)budget.focus();
     updateBudgetPreview();
     toast("VALOR > U$2000: EVALUACIÓN ESPECIAL");
     return;
   }
   state.finalManualOverride=false;
   updateBudgetPreview({force:true});
   updateFinalCost({force:true});
   autosaveDraft();
   toast("PRESUPUESTO RECALCULADO");
 };
}

function addPanelCorners(){
 document.querySelectorAll(".pixel-panel").forEach(panel=>{
  if(panel.querySelector(":scope > .panel-corner"))return;
  ["tl","tr","bl","br"].forEach(pos=>{const c=document.createElement("span");c.className=`panel-corner ${pos}`;c.setAttribute("aria-hidden","true");panel.appendChild(c)});
 });
}
function fitMobile(){const report=$(".report");const shell=$(".app-shell");if(window.innerWidth<1180){const scale=Math.min(1,(window.innerWidth-16)/1180);report.style.transform=`scale(${scale})`;shell.style.width=`${1180*scale+16}px`}else{report.style.transform="";shell.style.width=""}}
window.addEventListener("resize",fitMobile);
document.addEventListener("DOMContentLoaded",()=>{
 const fecha=$("#fecha");if(fecha&&!fecha.value)fecha.value=new Date().toISOString().slice(0,10);
 buildRatings();addPanelCorners();initControls();
 try{const d=JSON.parse(localStorage.getItem("cr_draft")||"null");if(d)apply(d);else updateBudgetPreview({force:true})}catch(e){console.error("No se pudo recuperar borrador",e);updateBudgetPreview({force:true})}
 fitMobile();
 if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
});
