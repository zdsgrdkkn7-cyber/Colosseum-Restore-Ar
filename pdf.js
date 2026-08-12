function pdfSafeText(s){
  return String(s ?? "").replace(/\r/g,"").trim();
}

function drawPdfPokeball(doc,cx,cy,r,active=true){
  const amber=[232,48,48], cream=[255,255,255], gray=[92,92,92], grayLight=[128,128,128], dark=[14,14,14];

  // Outer disc
  doc.setLineWidth(Math.max(.22,r*.10));
  doc.setDrawColor(active ? cream[0] : grayLight[0], active ? cream[1] : grayLight[1], active ? cream[2] : grayLight[2]);
  doc.setFillColor(active ? cream[0] : gray[0], active ? cream[1] : gray[1], active ? cream[2] : gray[2]);
  doc.circle(cx,cy,r,"FD");

  // Top colored cap. Using an ellipse entirely inside the circle avoids the
  // rectangular clipping artifact Safari showed in V6.
  doc.setFillColor(active ? amber[0] : 58, active ? amber[1] : 58, active ? amber[2] : 58);
  doc.ellipse(cx,cy-r*.37,r*.86,r*.50,"F");

  // Center divider
  doc.setDrawColor(active ? cream[0] : grayLight[0], active ? cream[1] : grayLight[1], active ? cream[2] : grayLight[2]);
  doc.setLineWidth(Math.max(.18,r*.07));
  doc.line(cx-r*.88,cy,cx+r*.88,cy);

  // Center button
  doc.setFillColor(...dark);
  doc.setDrawColor(active ? cream[0] : grayLight[0], active ? cream[1] : grayLight[1], active ? cream[2] : grayLight[2]);
  doc.circle(cx,cy,r*.30,"FD");
}

function drawBattleFrame(doc,x,y,w,h,title=""){
  const cream=[242,242,235], amber=[242,165,26], black=[5,5,5];

  // V10: intentionally simple, rigid geometry.
  // Two complete rectangular rails + four square nodes.
  // This avoids the distorted stepped corners produced by many short jsPDF segments.
  const inset=2.2;
  const node=2.5;

  doc.setDrawColor(...cream);

  // Outer rail
  doc.setLineWidth(.62);
  doc.rect(x,y,w,h,"S");

  // Inner rail
  doc.setLineWidth(.34);
  doc.rect(x+inset,y+inset,w-inset*2,h-inset*2,"S");

  // Four identical square nodes centered on the OUTER corners.
  // All dimensions are explicit and identical, so no corner can deform independently.
  const nodes=[
    [x-node/2, y-node/2],
    [x+w-node/2, y-node/2],
    [x-node/2, y+h-node/2],
    [x+w-node/2, y+h-node/2]
  ];

  nodes.forEach(([nx,ny])=>{
    // black fill hides the rail beneath, recreating a Game Boy "connector" square
    doc.setFillColor(...black);
    doc.rect(nx,ny,node,node,"F");
    doc.setDrawColor(...cream);
    doc.setLineWidth(.42);
    doc.rect(nx,ny,node,node,"S");
  });

  // Short Game Boy-like rail extensions beside each node.
  // These are horizontal/vertical only—no diagonals—so they render consistently.
  const arm=4.2;
  doc.setDrawColor(...cream);
  doc.setLineWidth(.42);

  // TL
  doc.line(x+node/2,y, x+node/2+arm,y);
  doc.line(x,y+node/2, x,y+node/2+arm);
  // TR
  doc.line(x+w-node/2-arm,y, x+w-node/2,y);
  doc.line(x+w,y+node/2, x+w,y+node/2+arm);
  // BL
  doc.line(x+node/2,y+h, x+node/2+arm,y+h);
  doc.line(x,y+h-node/2-arm, x,y+h-node/2);
  // BR
  doc.line(x+w-node/2-arm,y+h, x+w-node/2,y+h);
  doc.line(x+w,y+h-node/2-arm, x+w,y+h-node/2);

  // Title sits on a black interruption of BOTH top rails.
  if(title){
    doc.setFont("courier","bold");
    doc.setFontSize(8.5);
    const tw=doc.getTextWidth(title);
    const pad=3.5;
    const tx=x+12;
    const patchX=tx-pad;
    const patchW=tw+pad*2;

    doc.setFillColor(...black);
    doc.rect(patchX,y-1.5,patchW,inset+3.0,"F");

    doc.setTextColor(...amber);
    doc.text(title,tx,y+1.0);
  }
}

function drawCenteredFrameTitle(doc,x,y,w,title){
  const black=[5,5,5], amber=[242,165,26];
  doc.setFont("courier","bold");
  doc.setFontSize(8.5);
  const tw=doc.getTextWidth(title);
  const cx=x+w/2;
  const pad=7;
  doc.setFillColor(...black);
  doc.rect(cx-tw/2-pad,y-3.2,tw+pad*2,6.8,"F");
  doc.setTextColor(...amber);
  doc.text(title,cx,y+1.0,{align:"center"});
}


async function loadPdfSprite(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const canvas=document.createElement("canvas");
        canvas.width=img.naturalWidth||img.width;
        canvas.height=img.naturalHeight||img.height;
        const ctx=canvas.getContext("2d");
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(img,0,0);
        resolve(canvas.toDataURL("image/png"));
      }catch(e){reject(e)}
    };
    img.onerror=()=>reject(new Error("No se pudo cargar "+url));
    img.src=url;
  });
}

function drawPdfSprite(doc,data,x,y,size){
  if(!data) return;
  try{
    doc.addImage(data,"PNG",x,y,size,size,undefined,"FAST");
  }catch(e){
    console.warn("No se pudo insertar sprite en PDF",e);
  }
}

function drawPdfPhoto(doc,data,x,y,w,h,label){
  const white=[242,242,235], muted=[165,165,160], amber=[242,165,26];
  doc.setDrawColor(...white);doc.setLineWidth(.45);
  // stepped photo frame
  doc.line(x+3,y,x+w,y);
  doc.line(x+w,y,x+w,y+h-3);
  doc.line(x+w,y+h-3,x+w-3,y+h);
  doc.line(x+w-3,y+h,x,y+h);
  doc.line(x,y+h,x,y+3);
  doc.line(x,y+3,x+3,y);
  if(data){
    try{
      doc.addImage(data,"JPEG",x+2,y+2,w-4,h-4,undefined,"FAST");
    }catch(e){
      doc.setTextColor(...muted);doc.setFontSize(8);doc.text("IMAGEN",x+w/2,y+h/2,{align:"center"});
    }
  }else{
    doc.setTextColor(...muted);doc.setFont("courier","bold");doc.setFontSize(8);
    doc.text("+ AGREGAR FOTO",x+w/2,y+h/2,{align:"center"});
  }
  doc.setTextColor(...amber);doc.setFontSize(7.5);doc.text(label,x+w/2,y-2,{align:"center"});
}

function drawPdfRatingRows(doc,group,items,y,xLeft=38,xRight=136,labelX=105){
  const cream=[242,242,235], amber=[242,165,26], muted=[90,90,90];
  const keyPrefix=group;
  const r=1.55, gap=4.0;
  doc.setFont("courier","bold");doc.setFontSize(6.8);
  items.forEach((item,idx)=>{
    const yy=y+idx*6.1;
    const key=keyFor(keyPrefix,item);
    const bv=state.ratings.before[key]||0;
    const av=state.ratings.after[key]||0;
    for(let i=1;i<=10;i++) drawPdfPokeball(doc,xLeft+(i-1)*gap,yy,r,i<=bv);
    doc.setTextColor(...cream);
    doc.text(item,labelX,yy+1.1,{align:"center"});
    for(let i=1;i<=10;i++) drawPdfPokeball(doc,xRight+(i-1)*gap,yy,r,i<=av);
  });
  return y+items.length*6.1;
}

function drawWrappedText(doc,text,x,y,maxWidth,lineHeight=4.5,maxLines=18){
  const lines=doc.splitTextToSize(pdfSafeText(text)||"—",maxWidth).slice(0,maxLines);
  doc.text(lines,x,y,{baseline:"top"});
  return y+lines.length*lineHeight;
}

async function generatePdf(){
  if(!window.jspdf?.jsPDF){
    alert("El motor PDF todavía no terminó de cargar. Revisá la conexión y probá nuevamente.");
    return;
  }
  autosaveDraft();
  const {jsPDF}=window.jspdf;

  // Sprites decorativos del encabezado.
  // Se convierten a PNG data URL para conservar transparencia y evitar problemas
  // de compatibilidad de WebP con jsPDF/iOS.
  let hoohSprite=null;
  let lugiaSprite=null;
  let celebiSprite=null;
  let titleJpSprite=null;
  try{
    [hoohSprite,lugiaSprite,celebiSprite,titleJpSprite]=await Promise.all([
      loadPdfSprite("assets/ho-oh.png"),
      loadPdfSprite("assets/lugia.png"),
      loadPdfSprite("assets/celebi.webp"),
      loadPdfSprite("assets/title-jp.png")
    ]);
  }catch(e){
    console.warn("No se pudieron cargar uno o más sprites para el PDF",e);
  }

  // Digital long-format PDF. V7 gives every section enough vertical space
  // so no rating rows can collide with the next Game Boy frame.
  const W=210, H=620;
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:[W,H],compress:true});
  const black=[5,5,5], cream=[242,242,235], amber=[242,165,26], redAmber=[211,92,34], muted=[150,150,145];

  doc.setFillColor(...black);
  doc.rect(0,0,W,H,"F");
  doc.setTextColor(...cream);
  doc.setFont("courier","bold");

  // HEADER
  drawBattleFrame(doc,8,10,194,36);
  // Sprites + logo japonés principal.
  drawPdfSprite(doc,hoohSprite,44,15,17);
  drawPdfSprite(doc,lugiaSprite,149,15,17);
  if(titleJpSprite){
    try{ doc.addImage(titleJpSprite,"PNG",66,14,78,18,undefined,"FAST"); }catch(e){}
  }

  // Subtítulo donde antes estaban las Poké Balls decorativas.
  doc.setTextColor(...cream);
  doc.setFont("courier","bold");
  doc.setFontSize(8.2);
  doc.text("REPORTE DE RESTAURACION",105,38,{align:"center"});

  const hf=collect().fields;
  doc.setFontSize(6.8);
  doc.setTextColor(...amber);
  doc.text("CLIENTE",14,17);
  doc.text("FECHA",14,22);
  doc.setTextColor(...cream);
  doc.text(pdfSafeText(hf.cliente)||"—",14,19.7);
  doc.text(pdfSafeText(hf.fecha)||"—",14,24.7);
  doc.setTextColor(...amber);
  doc.setFontSize(7.2);
  doc.text("IG: @colosseum.ar",198,20,{align:"right"});

  // DATA
  drawBattleFrame(doc,8,53,194,35); drawCenteredFrameTitle(doc,8,53,194,"DATOS DE LA CARTA");
  doc.setFontSize(7.5);
  doc.setTextColor(...cream);
  const f=collect().fields;
  const entries=[
    ["Carta",f.carta,14,65,70],["Numero",f.numero,112,65,38],
    ["Set",f.set,14,73,70],["Version",f.version,112,73,38],
    ["Idioma",f.idioma,14,81,42],["Estado",f.estado,72,81,34],
    ["Precio",f.precio,122,81,68]
  ];
  entries.forEach(([lab,val,x,y,lw])=>{
    doc.setTextColor(...amber);doc.text(lab,x,y);
    doc.setTextColor(...cream);doc.text(pdfSafeText(val)||"—",x+doc.getTextWidth(lab)+3,y);
    doc.setDrawColor(...muted);doc.setLineWidth(.25);doc.line(x,y+1.8,x+lw,y+1.8);
  });

  // FRONT
  drawBattleFrame(doc,8,96,194,174); drawCenteredFrameTitle(doc,8,96,194,"FRENTE");
  doc.setTextColor(...redAmber);doc.setFontSize(8);
  doc.text("ESTADO INICIAL (ANTES)",56,108,{align:"center"});
  doc.text("ESTADO FINAL (DESPUES)",154,108,{align:"center"});
  drawPdfPhoto(doc,state.photos.frontBefore,25,116,62,87,"ANTES");
  drawPdfPhoto(doc,state.photos.frontAfter,123,116,62,87,"DESPUES");

  doc.setTextColor(...amber);doc.setFontSize(8);
  doc.text("PUNTUACIONES FRENTE",105,213,{align:"center"});
  doc.setTextColor(...redAmber);
  doc.text("ANTES",56,220,{align:"center"});
  doc.text("DESPUES",154,220,{align:"center"});
  drawPdfRatingRows(doc,"front",criteria.front,227);

  // BACK
  drawBattleFrame(doc,8,278,194,174); drawCenteredFrameTitle(doc,8,278,194,"DORSO");
  doc.setTextColor(...redAmber);doc.setFontSize(8);
  doc.text("ESTADO INICIAL (ANTES)",56,290,{align:"center"});
  doc.text("ESTADO FINAL (DESPUES)",154,290,{align:"center"});
  drawPdfPhoto(doc,state.photos.backBefore,25,298,62,87,"ANTES");
  drawPdfPhoto(doc,state.photos.backAfter,123,298,62,87,"DESPUES");

  doc.setTextColor(...amber);doc.setFontSize(8);
  doc.text("PUNTUACIONES DORSO",105,395,{align:"center"});
  doc.setTextColor(...redAmber);
  doc.text("ANTES",56,402,{align:"center"});
  doc.text("DESPUES",154,402,{align:"center"});
  drawPdfRatingRows(doc,"back",criteria.back,409);

  // EDGE / GENERAL
  drawBattleFrame(doc,8,460,194,42); drawCenteredFrameTitle(doc,8,460,194,"GENERAL");
  drawPdfRatingRows(doc,"extra",criteria.extra,477);

  // WORK + NOTES
  drawBattleFrame(doc,8,510,92,72); drawCenteredFrameTitle(doc,8,510,92,"TRABAJO REALIZADO");
  drawBattleFrame(doc,110,510,92,72); drawCenteredFrameTitle(doc,110,510,92,"RESULTADO");

  const workLabels=[
    ["limpieza","Limpieza"],["bordes","Limpieza de bordes"],
    ["pliegues","Reparacion pliegues / creases"],["relaminado","Pegado / relaminado"],
    ["prensado","Prensado"],["pulido","Pulido"],["lustrado","Lustrado"]
  ];
  doc.setFontSize(7.4);doc.setFont("courier","bold");
  workLabels.forEach(([k,label],i)=>{
    const yy=523+i*6.0;
    drawPdfPokeball(doc,15,yy-1.2,1.65,!!state.work[k]);
    doc.setTextColor(...cream);
    doc.text(label,19,yy);
  });
  doc.setTextColor(...amber);doc.text("Otro:",15,568);
  doc.setTextColor(...cream);doc.text(pdfSafeText(f.otroTrabajo)||"—",28,568);

  doc.setTextColor(...amber);
  doc.setFont("courier","bold");
  doc.setFontSize(18);
  doc.text((pdfSafeText(f.resultado)||"—").toUpperCase(),156,531,{align:"center"});

  doc.setFontSize(6.8);
  doc.setTextColor(...amber);
  doc.text("OBSERVACIONES",116,541);
  doc.setTextColor(...cream);
  doc.setFontSize(7.2);
  drawWrappedText(doc,f.observaciones,116,546,58,4.0,7);
  drawPdfSprite(doc,celebiSprite,181,548,15);

  // PRICE
  drawBattleFrame(doc,8,590,194,18); drawCenteredFrameTitle(doc,8,590,194,"COSTO DE RESTAURACION");
  doc.setTextColor(...cream);doc.setFontSize(11);
  doc.text("$ "+(pdfSafeText(f.precioTrabajo)||"0,00"),190,602,{align:"right"});

  const card=(pdfSafeText(f.carta)||"carta").replace(/[^\w\-]+/g,"_");
  const date=(pdfSafeText(f.fecha)||new Date().toISOString().slice(0,10)).replace(/[^\d\-]+/g,"");
  const filename=`Restauracion_${card}_${date}.pdf`;

  const blob=doc.output("blob");
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  a.style.display="none";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},3000);
  toast("PDF GENERADO");
}

