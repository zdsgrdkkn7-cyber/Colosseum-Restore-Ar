
const criteria={
 front:["Suciedad","Rayones","Pliegues","Creases","Delaminación","Whitening","Brillo"],
 back:["Suciedad","Rayones","Pliegues","Creases","Delaminación","Whitening","Brillo"],
 extra:["Suciedad (canto / borde)","Bending"]
};
const state={
 id:null,ratings:{before:{},after:{}},
 photos:{frontBefore:null,frontAfter:null,backBefore:null,backAfter:null},
 work:{limpieza:false,bordes:false,pliegues:false,relaminado:false,prensado:false,pulido:false,lustrado:false}
};
const fields=["cliente","fecha","carta","numero","set","version","idioma","estado","precio","observaciones","otroTrabajo","resultado","precioTrabajo"];
const $=s=>document.querySelector(s);
const keyFor=(g,i)=>`${g}__${i}`;

function buildRatings(){
 [["#ratings-front","front"],["#ratings-back","back"],["#ratings-extra","extra"]].forEach(([sel,group])=>{
  const box=$(sel);box.innerHTML="";
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
  b.onclick=()=>{state.ratings[side][key]=i;refreshScale(wrap,i);autosaveDraft()};
  wrap.appendChild(b);
 }return wrap;
}
function refreshScale(wrap,val){[...wrap.querySelectorAll("button")].forEach((b,i)=>b.querySelector(".ball").classList.toggle("on",i<val))}
function toast(msg){const t=$("#toast");t.textContent=msg;t.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display="none",1700)}
function resizeImage(file,max=1400,quality=.82){return new Promise((resolve,reject)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{let{width,height}=img;const sc=Math.min(1,max/Math.max(width,height));width=Math.round(width*sc);height=Math.round(height*sc);const c=document.createElement("canvas");c.width=width;c.height=height;c.getContext("2d").drawImage(img,0,0,width,height);URL.revokeObjectURL(url);resolve(c.toDataURL("image/jpeg",quality))};img.onerror=reject;img.src=url})}

document.querySelectorAll(".photo-box").forEach(box=>{
 const input=box.querySelector("input");
 box.onclick=()=>input.click();
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;const data=await resizeImage(file);state.photos[box.dataset.photo]=data;const img=box.querySelector("img");img.src=data;img.hidden=false;box.classList.add("has-photo");autosaveDraft()}
});
document.querySelectorAll(".work-item").forEach(btn=>{
 btn.onclick=()=>{const k=btn.dataset.work;state.work[k]=!state.work[k];btn.classList.toggle("active",state.work[k]);btn.querySelector(".ball").classList.toggle("on",state.work[k]);autosaveDraft()}
});

function collect(){const d={id:state.id,createdAt:new Date().toISOString(),ratings:state.ratings,photos:state.photos,work:state.work,fields:{}};fields.forEach(id=>{const el=$("#"+id);d.fields[id]=el?el.value:""});return d}
function apply(data){
 if(!data)return;state.id=data.id||null;state.ratings=data.ratings||{before:{},after:{}};state.photos=data.photos||{};state.work=data.work||{};
 fields.forEach(id=>{const el=$("#"+id);if(el)el.value=data.fields?.[id]||""});buildRatings();
 document.querySelectorAll(".work-item").forEach(btn=>{const on=!!state.work[btn.dataset.work];btn.classList.toggle("active",on);btn.querySelector(".ball").classList.toggle("on",on)});
 document.querySelectorAll(".photo-box").forEach(box=>{const v=state.photos[box.dataset.photo],img=box.querySelector("img");if(v){img.src=v;img.hidden=false;box.classList.add("has-photo")}else{img.hidden=true;box.classList.remove("has-photo")}})
}
function clearForm(){
 state.id=null;state.ratings={before:{},after:{}};state.photos={frontBefore:null,frontAfter:null,backBefore:null,backAfter:null};state.work={limpieza:false,bordes:false,pliegues:false,relaminado:false,prensado:false,pulido:false,lustrado:false};
 fields.forEach(id=>{const el=$("#"+id);if(el)el.value=id==="fecha"?new Date().toISOString().slice(0,10):""});buildRatings();
 document.querySelectorAll(".work-item").forEach(b=>{b.classList.remove("active");b.querySelector(".ball").classList.remove("on")});
 document.querySelectorAll(".photo-box").forEach(box=>{box.classList.remove("has-photo");const img=box.querySelector("img");img.hidden=true;img.removeAttribute("src");box.querySelector("input").value=""});
 localStorage.removeItem("cr_draft");
}
function autosaveDraft(){try{localStorage.setItem("cr_draft",JSON.stringify(collect()))}catch(e){}}
fields.forEach(id=>{
  const el=$("#"+id);
  if(el) el.addEventListener("input",autosaveDraft);
});

function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open("colosseumRestoration",1);r.onupgradeneeded=()=>r.result.createObjectStore("reports",{keyPath:"id"});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveReport(){const data=collect();if(!data.id)data.id=crypto.randomUUID();data.updatedAt=new Date().toISOString();state.id=data.id;const d=await db();await new Promise((res,rej)=>{const tx=d.transaction("reports","readwrite");tx.objectStore("reports").put(data);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});autosaveDraft();toast("REPORTE GUARDADO")}
async function listReports(){const d=await db();return await new Promise((res,rej)=>{const r=d.transaction("reports","readonly").objectStore("reports").getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")));r.onerror=()=>rej(r.error)})}
async function deleteReport(id){const d=await db();await new Promise((res,rej)=>{const tx=d.transaction("reports","readwrite");tx.objectStore("reports").delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});renderHistory()}
async function renderHistory(){const list=$("#historyList");list.innerHTML="";const reports=await listReports();if(!reports.length){list.innerHTML='<p class="small">Todavía no hay reportes guardados.</p>';return}reports.forEach(r=>{const item=document.createElement("div");item.className="history-item";const text=document.createElement("div");text.innerHTML=`<strong>${r.fields?.carta||"Sin nombre"}</strong><div class="small">${r.fields?.cliente||"Sin cliente"} · ${r.fields?.fecha||""}</div>`;const open=document.createElement("button");open.textContent="ABRIR";open.onclick=()=>{apply(r);$("#historyDialog").close();autosaveDraft()};const del=document.createElement("button");del.textContent="BORRAR";del.onclick=()=>deleteReport(r.id);item.append(text,open,del);list.appendChild(item)})}


function initControls(){
  const saveBtn=$("#saveBtn");
  const newBtn=$("#newBtn");
  const pdfBtn=$("#pdfBtn");
  const historyBtn=$("#historyBtn");
  const closeHistory=$("#closeHistory");

  if(saveBtn) saveBtn.onclick=async()=>{
    try{await saveReport()}catch(e){console.error(e);toast("ERROR AL GUARDAR")}
  };
  if(newBtn) newBtn.onclick=()=>{
    if(confirm("¿Crear un reporte nuevo?")){clearForm();toast("NUEVO REPORTE")}
  };
  if(pdfBtn) pdfBtn.onclick=async()=>{
    try{
      if(typeof generatePdf!=="function") throw new Error("generatePdf no disponible");
      await generatePdf();
    }catch(e){
      console.error(e);
      toast("ERROR AL GENERAR PDF");
    }
  };
  if(historyBtn) historyBtn.onclick=async()=>{
    try{
      await renderHistory();
      const dialog=$("#historyDialog");
      if(dialog) dialog.showModal();
    }catch(e){console.error(e);toast("ERROR EN HISTORIAL")}
  };
  if(closeHistory) closeHistory.onclick=()=>{
    const dialog=$("#historyDialog");
    if(dialog) dialog.close();
  };
}


function addPanelCorners(){
  document.querySelectorAll(".pixel-panel").forEach(panel=>{
    if(panel.querySelector(":scope > .panel-corner")) return;
    ["tl","tr","bl","br"].forEach(pos=>{
      const c=document.createElement("span");
      c.className=`panel-corner ${pos}`;
      c.setAttribute("aria-hidden","true");
      panel.appendChild(c);
    });
  });
}

function fitMobile(){const report=$(".report");const shell=$(".app-shell");if(window.innerWidth<1180){const scale=Math.min(1,(window.innerWidth-16)/1180);report.style.transform=`scale(${scale})`;shell.style.width=`${1180*scale+16}px`}else{report.style.transform="";shell.style.width=""}}
window.addEventListener("resize",fitMobile);
document.addEventListener("DOMContentLoaded",()=>{
  const fecha=$("#fecha");
  if(fecha && !fecha.value) fecha.value=new Date().toISOString().slice(0,10);
  buildRatings();
  addPanelCorners();
  initControls();
  try{
    const d=JSON.parse(localStorage.getItem("cr_draft")||"null");
    if(d)apply(d);
  }catch(e){console.error("No se pudo recuperar borrador",e)}
  fitMobile();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
});

