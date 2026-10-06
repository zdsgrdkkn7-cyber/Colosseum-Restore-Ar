/* Colosseum Restoration — Rev18
   Centering + Detalles de restauración.
   Additive module: keeps IndexedDB v1 and old reports compatible.
*/
(() => {
  const $ = s => document.querySelector(s);

  const CENTER_TABLES = {
    colosseum: {
      front:[[10,55],[9.5,57.5],[9,60],[8.5,62.5],[8,65],[7.5,67.5],[7,70],[6.5,72.5],[6,75],[5.5,77.5],[5,80],[4.5,82.5],[4,85],[3.5,87.5],[3,90],[2.5,92.5],[2,95],[1.5,97.5],[1,100]],
      back:[[10,70],[9.5,75],[9,80],[8.5,85],[8,90],[7.5,90],[7,90],[6.5,92.5],[6,95],[5.5,95.5],[5,96],[4.5,96.5],[4,97],[3.5,97.5],[3,98],[2.5,98.5],[2,99],[1.5,99.5],[1,100]]
    },
    psa:{
      front:[[10,55],[9,60],[8,65],[7,70],[6,75]],
      back:[[10,75],[9,80],[8,90],[7,90],[6,95]]
    },
    bgs:{
      front:[[10,50],[9.5,55],[9,55],[8.5,57.5],[8,60],[7.5,62.5],[7,65],[6.5,67.5],[6,70]],
      back:[[10,60],[9.5,60],[9,70],[8.5,75],[8,80],[7.5,85],[7,90],[6.5,90],[6,90]]
    },
    cgc:{
      front:[[10,50],[9.5,57.5],[9,60],[8.5,62.5],[8,65],[7.5,67.5],[7,70],[6.5,72.5],[6,75]],
      back:[[10,50],[9.5,75],[9,80],[8.5,85],[8,90],[7.5,95],[7,90],[6.5,95],[6,95]]
    },
    tag:{
      front:[[10,55],[9,60],[8.5,62.5],[8,65],[7,70],[6,75]],
      back:[[10,65],[9,75],[8.5,85],[8,95],[7,95],[6,95]]
    }
  };

  const centerState = {
    front:null, back:null,
    details:[]
  };
  window.rev18State = centerState;

  function worstSide(m){
    if(!m) return 100;
    return Math.max(m.left,m.right,m.top,m.bottom);
  }
  function gradeFor(company, face, m){
    if(!m) return null;
    const w=worstSide(m);
    const table=CENTER_TABLES[company][face];
    for(const [grade,max] of table) if(w<=max+1e-9) return grade;
    return table[table.length-1][0];
  }
  function fmtGrade(v){ return v==null?"—":String(v).replace(".",","); }
  function fmtRatio(a,b){ return `${Math.round(a)}/${Math.round(b)}`; }

  function calcMeasurement(outer,inner){
    const l=Math.max(0,inner.x-outer.x);
    const r=Math.max(0,(outer.x+outer.w)-(inner.x+inner.w));
    const t=Math.max(0,inner.y-outer.y);
    const b=Math.max(0,(outer.y+outer.h)-(inner.y+inner.h));
    const hs=l+r, vs=t+b;
    if(hs<=0 || vs<=0) return null;
    return {
      left:100*l/hs,right:100*r/hs,top:100*t/vs,bottom:100*b/vs,
      outer:{...outer},inner:{...inner}
    };
  }

  function centerSummary(face){
    const m=centerState[face];
    if(!m) return null;
    return {
      h:fmtRatio(m.left,m.right), v:fmtRatio(m.top,m.bottom),
      colosseum:gradeFor("colosseum",face,m),
      psa:gradeFor("psa",face,m), bgs:gradeFor("bgs",face,m),
      cgc:gradeFor("cgc",face,m), tag:gradeFor("tag",face,m)
    };
  }
  window.getRev18CenterSummary=centerSummary;

  function ballsHTML(value){
    if(value==null) return "";
    let s='<span class="centering-balls" aria-label="'+value+' de 10">';
    for(let i=1;i<=10;i++){
      const full=value>=i, half=!full && value>=i-.5;
      s+=`<span class="centering-ball ${full?"full":half?"half":""}"></span>`;
    }
    return s+"</span>";
  }

  function renderCenterRow(face){
    const host=$("#centering-"+face);
    if(!host)return;
    const s=centerSummary(face);
    if(!s){
      host.innerHTML=`<button type="button" class="centering-measure-btn" data-center-face="${face}">◎ MEDIR CENTRADO ${face==="front"?"FRENTE":"DORSO"}</button>`;
    }else{
      host.innerHTML=`
        <div class="centering-main">
          <strong>CENTRADO ${face==="front"?"FRENTE":"DORSO"}</strong>
          <span class="centering-values">H ${s.h} · V ${s.v}</span>
          ${ballsHTML(s.colosseum)} <b class="centering-score">${fmtGrade(s.colosseum)}</b>
          <button type="button" class="centering-remeasure" data-center-face="${face}">REMEDIR</button>
        </div>
        <div class="centering-reference">Referencia de centrado: PSA ${fmtGrade(s.psa)} · BGS ${fmtGrade(s.bgs)} · CGC ${fmtGrade(s.cgc)} · TAG ${fmtGrade(s.tag)}</div>`;
    }
    host.querySelectorAll("[data-center-face]").forEach(b=>b.onclick=()=>openCenterEditor(b.dataset.centerFace));
  }

  function injectCenterRows(){
    const frontRatings=$("#ratings-front")?.closest(".rating-block");
    const backRatings=$("#ratings-back")?.closest(".rating-block");
    if(frontRatings && !$("#centering-front")){
      const d=document.createElement("div"); d.id="centering-front"; d.className="centering-row";
      frontRatings.appendChild(d);
    }
    if(backRatings && !$("#centering-back")){
      const d=document.createElement("div"); d.id="centering-back"; d.className="centering-row";
      backRatings.appendChild(d);
    }
    renderCenterRow("front"); renderCenterRow("back");
  }

  function injectDetails(){
    if($("#restorationDetails"))return;
    const pricing=$(".pricing-box");
    const sec=document.createElement("section");
    sec.id="restorationDetails";
    sec.className="pixel-panel section restoration-details";
    sec.innerHTML=`<h2>▶ DETALLES DE RESTAURACIÓN</h2>
      <div id="restorationDetailRows"></div>
      <button id="addRestorationDetail" class="menu-button detail-add no-print" type="button">＋ AGREGAR DETALLE</button>`;
    pricing?.parentNode.insertBefore(sec,pricing);
    $("#addRestorationDetail").onclick=()=>{centerState.details.push({before:null,after:null,text:""});renderDetails();autosaveDraft();};
    if(typeof addPanelCorners==="function")addPanelCorners();
    renderDetails();
  }

  async function loadDetailPhoto(file){
    if(typeof resizeImage==="function") return await resizeImage(file,1600,.84);
    return await new Promise((res,rej)=>{
      const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);
    });
  }

  function renderDetails(){
    const host=$("#restorationDetailRows"); if(!host)return;
    host.innerHTML="";
    centerState.details.forEach((d,idx)=>{
      const row=document.createElement("div");row.className="restoration-detail-row";
      row.innerHTML=`
        <div class="detail-head"><span>ANTES</span><span>DESPUÉS</span></div>
        <div class="detail-photo-grid">
          <button type="button" class="detail-photo" data-side="before"><img ${d.before?`src="${d.before}"`:""} ${d.before?"":"hidden"}><span>${d.before?"CAMBIAR FOTO":"+ AGREGAR FOTO"}</span><input type="file" accept="image/*" hidden></button>
          <button type="button" class="detail-photo" data-side="after"><img ${d.after?`src="${d.after}"`:""} ${d.after?"":"hidden"}><span>${d.after?"CAMBIAR FOTO":"+ AGREGAR FOTO"}</span><input type="file" accept="image/*" hidden></button>
        </div>
        <div class="detail-description"><input maxlength="180" type="text" value="${escapeAttr(d.text||"")}" placeholder="Descripción del arreglo..."><button type="button" class="detail-delete no-print">ELIMINAR</button></div>`;
      row.querySelectorAll(".detail-photo").forEach(btn=>{
        const input=btn.querySelector("input"); btn.onclick=()=>input.click();
        input.onchange=async()=>{const f=input.files?.[0];if(!f)return;d[btn.dataset.side]=await loadDetailPhoto(f);renderDetails();autosaveDraft();};
      });
      row.querySelector(".detail-description input").oninput=e=>{d.text=e.target.value;autosaveDraft();};
      row.querySelector(".detail-delete").onclick=()=>{centerState.details.splice(idx,1);renderDetails();autosaveDraft();};
      host.appendChild(row);
    });
  }
  function escapeAttr(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");}

  // CENTERING EDITOR
  let editorFace=null, imgObj=null, outer=null, inner=null, drag=null;
  function injectEditor(){
    if($("#centeringDialog"))return;
    const dlg=document.createElement("dialog");dlg.id="centeringDialog";dlg.className="centering-dialog";
    dlg.innerHTML=`<div class="dialog-head"><h2>MEDIR CENTRADO</h2><button id="closeCentering" type="button">✕</button></div>
      <p class="centering-help">Ajustá el rectángulo exterior al borde de la carta y el interior al límite de impresión. Arrastrá las esquinas.</p>
      <div class="centering-canvas-wrap"><canvas id="centeringCanvas"></canvas></div>
      <div class="centering-editor-result" id="centeringEditorResult"></div>
      <div class="centering-editor-actions"><button id="resetCentering" type="button">REINICIAR</button><button id="saveCentering" type="button">CONFIRMAR MEDICIÓN</button></div>`;
    document.body.appendChild(dlg);
    $("#closeCentering").onclick=()=>dlg.close();
    $("#resetCentering").onclick=()=>setupRects(true);
    $("#saveCentering").onclick=()=>{
      const m=calcMeasurement(outer,inner); if(!m){toast("MEDICIÓN NO VÁLIDA");return;}
      centerState[editorFace]=m; dlg.close(); renderCenterRow(editorFace); autosaveDraft();
    };
    const c=$("#centeringCanvas");
    c.addEventListener("pointerdown",pointerDown);c.addEventListener("pointermove",pointerMove);c.addEventListener("pointerup",pointerUp);c.addEventListener("pointercancel",pointerUp);
  }

  function openCenterEditor(face){
    const key=face==="front"?"frontAfter":"backAfter";
    const src=state.photos?.[key];
    if(!src){toast("AGREGÁ PRIMERO LA FOTO DE DESPUÉS");return;}
    editorFace=face;imgObj=new Image();
    imgObj.onload=()=>{
      const c=$("#centeringCanvas");
      const maxW=1000; const scale=Math.min(1,maxW/imgObj.width);
      c.width=Math.round(imgObj.width*scale);c.height=Math.round(imgObj.height*scale);
      const saved=centerState[face];
      if(saved){outer={...saved.outer};inner={...saved.inner};}
      else setupRects(true);
      drawEditor();$("#centeringDialog").showModal();
    };
    imgObj.src=src;
  }
  function setupRects(force){
    const c=$("#centeringCanvas"); if(!c)return;
    outer={x:c.width*.08,y:c.height*.05,w:c.width*.84,h:c.height*.90};
    inner={x:c.width*.16,y:c.height*.13,w:c.width*.68,h:c.height*.74};
    drawEditor();
  }
  function handles(rect){return[
    {k:"tl",x:rect.x,y:rect.y},{k:"tr",x:rect.x+rect.w,y:rect.y},
    {k:"bl",x:rect.x,y:rect.y+rect.h},{k:"br",x:rect.x+rect.w,y:rect.y+rect.h}
  ];}
  function pos(ev){const c=$("#centeringCanvas"),r=c.getBoundingClientRect();return{x:(ev.clientX-r.left)*c.width/r.width,y:(ev.clientY-r.top)*c.height/r.height};}
  function pointerDown(ev){
    const p=pos(ev), radius=28*($("#centeringCanvas").width/1000);
    let hit=null;
    [["inner",inner],["outer",outer]].forEach(([name,rect])=>handles(rect).forEach(h=>{if(Math.hypot(p.x-h.x,p.y-h.y)<radius&&!hit)hit={name,k:h.k};}));
    if(hit){drag={...hit};ev.currentTarget.setPointerCapture(ev.pointerId);}
  }
  function pointerMove(ev){
    if(!drag)return;const p=pos(ev);const rect=drag.name==="outer"?outer:inner;const min=20;
    const right=rect.x+rect.w,bottom=rect.y+rect.h;
    if(drag.k.includes("l")){rect.x=Math.min(p.x,right-min);rect.w=right-rect.x;}
    if(drag.k.includes("r"))rect.w=Math.max(min,p.x-rect.x);
    if(drag.k.includes("t")){rect.y=Math.min(p.y,bottom-min);rect.h=bottom-rect.y;}
    if(drag.k.includes("b"))rect.h=Math.max(min,p.y-rect.y);
    drawEditor();
  }
  function pointerUp(){drag=null;}
  function drawEditor(){
    const c=$("#centeringCanvas");if(!c||!imgObj)return;const ctx=c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(imgObj,0,0,c.width,c.height);
    drawRect(ctx,outer,"#f2a51a");drawRect(ctx,inner,"#e83030");
    const m=calcMeasurement(outer,inner), box=$("#centeringEditorResult");
    if(m&&box){const s={h:fmtRatio(m.left,m.right),v:fmtRatio(m.top,m.bottom)};box.textContent=`H ${s.h} · V ${s.v}`;}
  }
  function drawRect(ctx,r,color){
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,$("#centeringCanvas").width/350);ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle=color;handles(r).forEach(h=>{ctx.beginPath();ctx.arc(h.x,h.y,Math.max(7,$("#centeringCanvas").width/110),0,Math.PI*2);ctx.fill();});ctx.restore();
  }

  // Extend existing report serialization without changing IndexedDB version.
  const baseCollect=window.collect || collect;
  const baseApply=window.apply || apply;
  const baseClear=window.clearForm || clearForm;
  window.collect = collect = function(){
    const d=baseCollect();
    d.centering={front:centerState.front,back:centerState.back};
    d.restorationDetails=centerState.details.map(x=>({...x}));
    return d;
  };
  window.apply = apply = function(data){
    baseApply(data);
    centerState.front=data?.centering?.front||null;
    centerState.back=data?.centering?.back||null;
    centerState.details=Array.isArray(data?.restorationDetails)?data.restorationDetails.map(x=>({...x})):[];
    renderCenterRow("front");renderCenterRow("back");renderDetails();
  };
  window.clearForm = clearForm = function(){
    baseClear();
    centerState.front=null;centerState.back=null;centerState.details=[];
    renderCenterRow("front");renderCenterRow("back");renderDetails();
  };

  document.addEventListener("DOMContentLoaded",()=>{
    injectCenterRows();injectDetails();injectEditor();
    // apply() may have run earlier in the original DOMContentLoaded listener.
    try{
      const d=JSON.parse(localStorage.getItem("cr_draft")||"null");
      if(d){
        centerState.front=d?.centering?.front||null;
        centerState.back=d?.centering?.back||null;
        centerState.details=Array.isArray(d?.restorationDetails)?d.restorationDetails.map(x=>({...x})):[];
        renderCenterRow("front");renderCenterRow("back");renderDetails();
      }
    }catch(e){}
  });
})();