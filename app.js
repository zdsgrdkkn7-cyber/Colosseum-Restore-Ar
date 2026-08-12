
const criteria = {
  "FRENTE":["Suciedad","Rayones","Pliegues","Creases","Delaminación","Whitening","Brillo"],
  "DORSO":["Suciedad","Rayones","Pliegues","Creases","Delaminación","Whitening","Brillo"],
  "CANTO / BORDE":["Suciedad"],
  "GENERAL":["Bending"]
};

const state = {
  id:null,
  ratings:{before:{},after:{}},
  photos:{frontBefore:null,frontAfter:null,backBefore:null,backAfter:null}
};

const fields = ["cliente","fecha","carta","set","numero","idioma","valor","trabajo","observaciones"];
const $ = (s)=>document.querySelector(s);

function keyFor(group,item){ return `${group}__${item}`; }

function buildRatings(){
  const box = $("#ratings");
  box.innerHTML = "";
  Object.entries(criteria).forEach(([group, items])=>{
    const title=document.createElement("div");
    title.className="rating-group-title";
    title.textContent=group;
    box.appendChild(title);
    items.forEach(item=>{
      const row=document.createElement("div");
      row.className="rating-row";
      row.appendChild(makeScale("before",group,item));
      const label=document.createElement("div");
      label.className="criterion";
      label.textContent=item;
      row.appendChild(label);
      row.appendChild(makeScale("after",group,item));
      box.appendChild(row);
    });
  });
}
function makeScale(side,group,item){
  const wrap=document.createElement("div");
  wrap.className="scale";
  const key=keyFor(group,item);
  if(state.ratings[side][key] == null) state.ratings[side][key]=0;
  for(let i=1;i<=10;i++){
    const b=document.createElement("button");
    b.type="button";
    b.title=`${i}/10`;
    b.dataset.side=side;b.dataset.key=key;b.dataset.value=i;
    b.innerHTML=`<span class="ball ${i<=state.ratings[side][key]?"on":""}"></span>`;
    b.addEventListener("click",()=>{
      state.ratings[side][key]=i;
      refreshScale(wrap, i);
      autosaveDraft();
    });
    wrap.appendChild(b);
  }
  return wrap;
}
function refreshScale(wrap,val){
  [...wrap.querySelectorAll("button")].forEach((b,i)=>{
    b.querySelector(".ball").classList.toggle("on",i<val);
  });
}

function showToast(msg){
  const t=$("#toast");t.textContent=msg;t.style.display="block";
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>t.style.display="none",1800);
}

function resizeImage(file,max=1400,quality=.82){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      let {width,height}=img;
      const scale=Math.min(1,max/Math.max(width,height));
      width=Math.round(width*scale);height=Math.round(height*scale);
      const c=document.createElement("canvas");c.width=width;c.height=height;
      c.getContext("2d").drawImage(img,0,0,width,height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg",quality));
    };
    img.onerror=reject; img.src=url;
  });
}

document.querySelectorAll(".photo-box").forEach(box=>{
  const input=box.querySelector("input");
  box.addEventListener("click",()=>input.click());
  input.addEventListener("change",async()=>{
    const file=input.files?.[0]; if(!file)return;
    const data=await resizeImage(file);
    const key=box.dataset.photo;
    state.photos[key]=data;
    const img=box.querySelector("img");img.src=data;img.hidden=false;
    box.classList.add("has-photo");
    autosaveDraft();
  });
});

function collect(){
  const data={id:state.id,createdAt:new Date().toISOString(),ratings:state.ratings,photos:state.photos,fields:{}};
  fields.forEach(id=>data.fields[id]=$("#"+id).value);
  return data;
}
function apply(data){
  if(!data)return;
  state.id=data.id||null;
  state.ratings=data.ratings||{before:{},after:{}};
  state.photos=data.photos||{frontBefore:null,frontAfter:null,backBefore:null,backAfter:null};
  fields.forEach(id=>$("#"+id).value=data.fields?.[id]||"");
  buildRatings();
  document.querySelectorAll(".photo-box").forEach(box=>{
    const val=state.photos[box.dataset.photo];
    const img=box.querySelector("img");
    if(val){img.src=val;img.hidden=false;box.classList.add("has-photo")}
    else{img.removeAttribute("src");img.hidden=true;box.classList.remove("has-photo")}
  });
}
function clearForm(){
  state.id=null;
  state.ratings={before:{},after:{}};
  state.photos={frontBefore:null,frontAfter:null,backBefore:null,backAfter:null};
  fields.forEach(id=>$("#"+id).value=id==="fecha"?new Date().toISOString().slice(0,10):"");
  buildRatings();
  document.querySelectorAll(".photo-box").forEach(box=>{
    box.classList.remove("has-photo"); const img=box.querySelector("img"); img.hidden=true;img.removeAttribute("src");
    box.querySelector("input").value="";
  });
  localStorage.removeItem("cr_draft");
}

function autosaveDraft(){
  try{localStorage.setItem("cr_draft",JSON.stringify(collect()))}catch(e){}
}
fields.forEach(id=>$("#"+id).addEventListener("input",autosaveDraft));

function db(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open("colosseumRestoration",1);
    req.onupgradeneeded=()=>req.result.createObjectStore("reports",{keyPath:"id"});
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function saveReport(){
  const data=collect();
  if(!data.id)data.id=crypto.randomUUID();
  data.updatedAt=new Date().toISOString();
  state.id=data.id;
  const d=await db();
  await new Promise((resolve,reject)=>{
    const tx=d.transaction("reports","readwrite");
    tx.objectStore("reports").put(data);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  autosaveDraft();showToast("REPORTE GUARDADO");
}
async function listReports(){
  const d=await db();
  return await new Promise((resolve,reject)=>{
    const req=d.transaction("reports","readonly").objectStore("reports").getAll();
    req.onsuccess=()=>resolve(req.result.sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")));
    req.onerror=()=>reject(req.error);
  });
}
async function deleteReport(id){
  const d=await db();
  await new Promise((resolve,reject)=>{
    const tx=d.transaction("reports","readwrite");tx.objectStore("reports").delete(id);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  renderHistory();
}
async function renderHistory(){
  const list=$("#historyList"); list.innerHTML="";
  const reports=await listReports();
  if(!reports.length){list.innerHTML='<p class="small">Todavía no hay reportes guardados.</p>';return}
  reports.forEach(r=>{
    const item=document.createElement("div");item.className="history-item";
    const text=document.createElement("div");
    text.innerHTML=`<strong>${r.fields?.carta||"Sin nombre"}</strong><div class="small">${r.fields?.cliente||"Sin cliente"} · ${r.fields?.fecha||""}</div>`;
    const open=document.createElement("button");open.textContent="ABRIR";
    open.onclick=()=>{apply(r);$("#historyDialog").close();autosaveDraft()};
    const del=document.createElement("button");del.textContent="BORRAR";
    del.onclick=()=>deleteReport(r.id);
    item.append(text,open,del);list.appendChild(item);
  });
}

$("#saveBtn").addEventListener("click",saveReport);
$("#newBtn").addEventListener("click",()=>{
  if(confirm("¿Crear un reporte nuevo? El borrador actual se limpiará.")){clearForm();showToast("NUEVO REPORTE")}
});
$("#pdfBtn").addEventListener("click",()=>{
  autosaveDraft();
  setTimeout(()=>window.print(),50);
});
$("#historyBtn").addEventListener("click",async()=>{await renderHistory();$("#historyDialog").showModal()});
$("#closeHistory").addEventListener("click",()=>$("#historyDialog").close());

function fitMobile(){
  if(window.innerWidth<1180){
    const scale=Math.min(1,(window.innerWidth-16)/1180);
    document.querySelector(".report").style.transform=`scale(${scale})`;
    document.querySelector(".report").style.marginBottom=`-${1180*(1-scale)*0.10}px`;
    document.querySelector(".app-shell").style.width=`${1180*scale+16}px`;
  }else{
    document.querySelector(".report").style.transform="";
    document.querySelector(".app-shell").style.width="";
  }
}
window.addEventListener("resize",fitMobile);

document.addEventListener("DOMContentLoaded",()=>{
  $("#fecha").value=new Date().toISOString().slice(0,10);
  buildRatings();
  try{
    const draft=JSON.parse(localStorage.getItem("cr_draft")||"null");
    if(draft)apply(draft);
  }catch(e){}
  fitMobile();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
});
