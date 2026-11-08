/* Colosseum Restoration — Unified PDF engine
   Baseline: Rev18.4.2
   This file is a behavior-preserving merge of pdf-v17.js + pdf-rev18.js.
   No visual coordinates or PDF rendering logic were intentionally changed.
*/
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


function normalizePdfReport(report){
  const r=report||{};
  return {
    fields:r.fields||{},
    ratings:{
      before:r.ratings?.before||{},
      after:r.ratings?.after||{}
    },
    photos:{
      frontBefore:r.photos?.frontBefore||null,
      frontAfter:r.photos?.frontAfter||null,
      backBefore:r.photos?.backBefore||null,
      backAfter:r.photos?.backAfter||null
    },
    work:{limpieza:false,bordes:false,pliegues:false,relaminado:false,prensado:false,pulido:false,lustrado:false,otro:false,...(r.work||{})}
  };
}

function drawPdfRatingRowsFor(doc,report,group,items,y,xLeft=38,xRight=136,labelX=105){
  const cream=[242,242,235];
  const r=1.55,gap=4.0;
  doc.setFont("courier","bold");
  doc.setFontSize(6.8);
  items.forEach((item,idx)=>{
    const yy=y+idx*6.1;
    const key=keyFor(group,item);
    const bv=Number(report.ratings.before[key]||0);
    const av=Number(report.ratings.after[key]||0);
    for(let i=1;i<=10;i++)drawPdfPokeball(doc,xLeft+(i-1)*gap,yy,r,i<=bv);
    doc.setTextColor(...cream);
    doc.text(item,labelX,yy+1.1,{align:"center"});
    for(let i=1;i<=10;i++)drawPdfPokeball(doc,xRight+(i-1)*gap,yy,r,i<=av);
  });
}

function parsePdfMoney(value){
  const raw=String(value??"").trim().replace(/\s/g,"");
  if(!raw)return 0;
  let clean=raw.replace(/[^\d,.\-]/g,"");
  if(clean.includes(",")&&clean.includes(".")){
    if(clean.lastIndexOf(",")>clean.lastIndexOf("."))clean=clean.replace(/\./g,"").replace(",",".");
    else clean=clean.replace(/,/g,"");
  }else if(clean.includes(","))clean=clean.replace(",",".");
  const n=Number.parseFloat(clean);
  return Number.isFinite(n)?n:0;
}

function pdfMoney(n,forceDecimals=false){
  const value=Number(n)||0;
  if(forceDecimals || !Number.isInteger(value))return `U$ ${value.toFixed(2)}`;
  return `U$ ${value.toFixed(0)}`;
}

async function loadReportPdfAssets(){
  const assets={hooh:null,lugia:null,celebi:null,titleJp:null};
  try{
    [assets.hooh,assets.lugia,assets.celebi,assets.titleJp]=await Promise.all([
      loadPdfSprite("assets/ho-oh.png"),
      loadPdfSprite("assets/lugia.png"),
      loadPdfSprite("assets/celebi.webp"),
      loadPdfSprite("assets/title-jp.png")
    ]);
  }catch(e){
    console.warn("No se pudieron cargar uno o más sprites para el PDF",e);
  }
  return assets;
}

function paintPdfBackground(doc,W=210,H=620){
  doc.setFillColor(5,5,5);
  doc.rect(0,0,W,H,"F");
  doc.setTextColor(242,242,235);
  doc.setFont("courier","bold");
}


function getFinalReportLayout(rawReport){
  const report=normalizePdfReport(rawReport);
  const selectedCount=["limpieza","bordes","pliegues","relaminado","prensado","pulido","lustrado","otro"]
    .filter(k=>!!report.work?.[k]).length;
  const f=report.fields||{};
  const discountPercent=Math.max(0,Math.min(100,parsePdfMoney(f.descuentoResultado)));
  const workRows=Math.max(1,selectedCount);
  const summaryRows=4+(discountPercent>0?1:0); // subtotal, factor, base, final (+ discount)
  const costBoxH=14 + workRows*4.3 + summaryRows*5.0 + 10;
  const costBoxY=620;
  const pageH=Math.max(656,costBoxY+costBoxH+8);
  return {selectedCount,discountPercent,costBoxH,costBoxY,pageH};
}

function getDisclaimerLayout(doc){
  const rows=[
    ["Hasta U$50","x0,50"],["U$51 - 100","x0,75"],["U$101 - 250","x1,00"],
    ["U$251 - 500","x1,25"],["U$501 - 750","x1,50"],["U$751 - 1.000","x1,75"],
    ["U$1.001 - 1.500","x2,00"],["U$1.501 - 2.000","x3,00"],
    ["Mas de U$2.000","Evaluacion especial"]
  ];
  const sections=[
    ["COTIZACION DEL SERVICIO",
     "El importe indicado corresponde al precio base de los trabajos propuestos. Cada intervencion posee una tarifa base segun el trabajo: U$5 por intervencion general y U$10 para reparacion de pliegues / creases. Sobre la suma se aplica el Factor de Responsabilidad segun el valor declarado. Este factor contempla el riesgo economico asumido y, especialmente, permite ofrecer tarifas considerablemente reducidas para cartas de menor valor sin aplicarles el mismo costo que a piezas de mayor valor."],
    ["RIESGO Y RESPONSABILIDAD",
     "La restauracion implica intervenir materiales que pueden presentar desgaste, deterioro o comportamientos no previsibles. Aun aplicando tecnicas y cuidados adecuados, no puede eliminarse completamente el riesgo de deterioro adicional. Si un daño atribuible al proceso reduce significativamente el estado o valor de la carta, Colosseum Restore podra asumir la adquisicion de la pieza tomando como referencia el valor declarado y acordado para su estado inicial."],
    ["RESULTADO DE LA RESTAURACION",
     "No puede garantizarse un resultado especifico. Si el resultado de una intervencion no fuera satisfactorio o la mejora obtenida no fuera significativa, podra aplicarse un descuento sobre el precio presupuestado, que quedara detallado en el reporte final."],
    ["GRADACION",
     "Colosseum Restore no garantiza ninguna calificacion o nota especifica por parte de empresas de gradacion. La calificacion posterior depende exclusivamente de los criterios y politicas de la empresa correspondiente y es independiente del resultado de la restauracion."],
    ["ACEPTACION",
     "La aceptacion del presupuesto implica la conformidad del cliente con los trabajos propuestos, el precio presupuestado, el valor declarado de la carta y los riesgos inherentes al proceso de restauracion."]
  ];

  let y=169;
  doc.setFont("courier","bold");
  sections.forEach(([title,text])=>{
    y+=8;
    doc.setFontSize(5.8);
    const lines=doc.splitTextToSize(text,166);
    y+=lines.length*3.7+11;
  });
  const frameBottom=y+8;
  const pageH=Math.max(300,frameBottom+18);
  return {rows,sections,frameBottom,pageH};
}

function renderReportPage(doc,rawReport,assets){
  const report=normalizePdfReport(rawReport);
  const f=report.fields;
  const black=[5,5,5],cream=[242,242,235],amber=[242,165,26],redAmber=[211,92,34],muted=[150,150,145];
  const W=210;
  const layout=getFinalReportLayout(report);
  const H=layout.pageH;
  paintPdfBackground(doc,W,H);

  // HEADER
  drawBattleFrame(doc,8,10,194,36);
  drawPdfSprite(doc,assets.hooh,44,15,17);
  drawPdfSprite(doc,assets.lugia,149,15,17);
  if(assets.titleJp){
    try{doc.addImage(assets.titleJp,"PNG",66,14,78,18,undefined,"FAST")}catch(e){}
  }
  doc.setTextColor(...cream);
  doc.setFont("courier","bold");
  doc.setFontSize(8.2);
  doc.text("REPORTE DE RESTAURACION",105,38,{align:"center"});

  doc.setFontSize(6.8);
  doc.setTextColor(...amber);
  doc.text("CLIENTE",14,17);
  doc.text("FECHA",14,22);
  doc.setTextColor(...cream);
  doc.text(pdfSafeText(f.cliente)||"—",14,19.7);
  doc.text(pdfSafeText(f.fecha)||"—",14,24.7);
  doc.setTextColor(...amber);
  doc.setFontSize(7.0);
  doc.text("IG: @colosseum.ar",198,20,{align:"right"});

  // DATA
  drawBattleFrame(doc,8,53,194,35);
  drawCenteredFrameTitle(doc,8,53,194,"DATOS DE LA CARTA");
  doc.setFontSize(7.5);
  const entries=[
    ["Carta",f.carta,14,65,70],["Numero",f.numero,112,65,78],
    ["Set",f.set,14,73,70],["Version",f.version,112,73,78],
    ["Estado",f.estado,14,81,50],["Valor decl.",f.precio,72,81,48],
    ["Idioma",f.idioma,128,81,62]
  ];
  entries.forEach(([lab,val,x,y,lw])=>{
    doc.setTextColor(...amber);doc.text(lab,x,y);
    doc.setTextColor(...cream);doc.text(pdfSafeText(val)||"—",x+doc.getTextWidth(lab)+3,y);
    doc.setDrawColor(...muted);doc.setLineWidth(.25);doc.line(x,y+1.8,x+lw,y+1.8);
  });

  // FRONT
  drawBattleFrame(doc,8,96,194,192);
  drawCenteredFrameTitle(doc,8,96,194,"FRENTE");
  doc.setTextColor(...redAmber);doc.setFontSize(8);
  doc.text("ESTADO INICIAL (ANTES)",56,108,{align:"center"});
  doc.text("ESTADO FINAL (DESPUES)",154,108,{align:"center"});
  drawPdfPhoto(doc,report.photos.frontBefore,25,122,62,87,"");
  drawPdfPhoto(doc,report.photos.frontAfter,123,122,62,87,"");
  doc.setTextColor(...amber);doc.setFontSize(8);
  doc.text("PUNTUACIONES FRENTE",105,234,{align:"center"});
  doc.setTextColor(...redAmber);
  doc.text("ANTES",56,240,{align:"center"});
  doc.text("DESPUES",154,240,{align:"center"});
  drawPdfRatingRowsFor(doc,report,"front",criteria.front,246);

  // BACK
  drawBattleFrame(doc,8,296,194,192);
  drawCenteredFrameTitle(doc,8,296,194,"DORSO");
  doc.setTextColor(...redAmber);doc.setFontSize(8);
  doc.text("ESTADO INICIAL (ANTES)",56,308,{align:"center"});
  doc.text("ESTADO FINAL (DESPUES)",154,308,{align:"center"});
  drawPdfPhoto(doc,report.photos.backBefore,25,318,62,87,"");
  drawPdfPhoto(doc,report.photos.backAfter,123,318,62,87,"");
  doc.setTextColor(...amber);doc.setFontSize(8);
  doc.text("PUNTUACIONES DORSO",105,434,{align:"center"});
  doc.setTextColor(...redAmber);
  doc.text("ANTES",56,440,{align:"center"});
  doc.text("DESPUES",154,440,{align:"center"});
  drawPdfRatingRowsFor(doc,report,"back",criteria.back,446);

  // GENERAL
  drawBattleFrame(doc,8,496,194,42);
  drawCenteredFrameTitle(doc,8,496,194,"GENERAL");
  drawPdfRatingRowsFor(doc,report,"extra",criteria.extra,513);

  // WORK + RESULT
  drawBattleFrame(doc,8,546,92,72);
  drawCenteredFrameTitle(doc,8,546,92,"TRABAJO REALIZADO");
  drawBattleFrame(doc,110,546,92,72);
  drawCenteredFrameTitle(doc,110,546,92,"RESULTADO");

  const workLabels=[
    ["limpieza","Limpieza"],["bordes","Limpieza de bordes"],
    ["pliegues","Reparacion pliegues / creases"],["relaminado","Pegado / relaminado"],
    ["prensado","Prensado"],["pulido","Pulido"],["lustrado","Lustrado"],["otro","Otro"]
  ];
  doc.setFontSize(7.1);doc.setFont("courier","bold");
  workLabels.forEach(([k,label],i)=>{
    const yy=557+i*6.0;
    drawPdfPokeball(doc,15,yy-1.2,1.55,!!report.work[k]);
    doc.setTextColor(...cream);
    const shown=k==="otro" && f.otroTrabajo ? `Otro: ${pdfSafeText(f.otroTrabajo)}` : label;
    const clipped=doc.splitTextToSize(shown,74)[0];
    doc.text(clipped,19,yy);
  });

  const resultFront=f.resultadoFrente||f.resultado||"";
  const resultBack=f.resultadoDorso||"";
  doc.setFontSize(6.8);doc.setTextColor(...amber);
  doc.text("FRENTE",135,559,{align:"center"});
  doc.text("DORSO",171,559,{align:"center"});
  doc.setFontSize(16);doc.setTextColor(...cream);
  doc.text((pdfSafeText(resultFront)||"—").toUpperCase(),135,569,{align:"center"});
  doc.text((pdfSafeText(resultBack)||"—").toUpperCase(),171,569,{align:"center"});
  doc.setFontSize(6.8);doc.setTextColor(...amber);
  doc.text("OBSERVACIONES",116,579);
  doc.setTextColor(...cream);doc.setFontSize(7.2);
  drawWrappedText(doc,f.observaciones,116,584,58,4.0,6);
  drawPdfSprite(doc,assets.celebi,181,586,15);

  // COST — DESGLOSE COMPLETO EN UNA SOLA COLUMNA
  const selectedWorks=[
    ["limpieza","Limpieza"],
    ["bordes","Limpieza de bordes"],
    ["pliegues","Reparacion pliegues / creases"],
    ["relaminado","Pegado / relaminado"],
    ["prensado","Prensado"],
    ["pulido","Pulido"],
    ["lustrado","Lustrado"],
    ["otro","Otro"]
  ].filter(([k])=>!!report.work[k]);

  const workSubtotal=getReportWorkSubtotal(report);
  const factorInfo=getBudgetFactorForValue(f.precio);
  const budgetAmount=parsePdfMoney(f.precioPresupuestado || f.precioTrabajo);
  const resultDiscountPercent=Math.max(0,Math.min(100,parsePdfMoney(f.descuentoResultado)));
  const automaticFinal=Math.max(0,budgetAmount*(1-resultDiscountPercent/100));
  const finalAmount=String(f.precioTrabajo??"").trim()?parsePdfMoney(f.precioTrabajo):automaticFinal;

  // Height and page size grow with content, so nothing can leave the frame.
  const costBoxH=layout.costBoxH;
  const costBoxY=layout.costBoxY;

  drawBattleFrame(doc,8,costBoxY,194,costBoxH);
  drawCenteredFrameTitle(doc,8,costBoxY,194,"COSTO DE RESTAURACION");

  const labelX=16;
  const valueX=193;
  let yy=costBoxY+10;

  doc.setFont("courier","bold");
  doc.setFontSize(5.9);
  doc.setTextColor(...amber);
  doc.text("TRABAJOS REALIZADOS",labelX,yy);
  yy+=5;

  if(selectedWorks.length){
    selectedWorks.forEach(([k,label])=>{
      const shown=(k==="otro" && f.otroTrabajo)?`Otro: ${pdfSafeText(f.otroTrabajo)}`:label;
      doc.setTextColor(...cream);
      doc.text(doc.splitTextToSize(shown,145)[0],labelX,yy);
      doc.setTextColor(...amber);
      doc.text(pdfMoney(getReportWorkPrice(k)),valueX,yy,{align:"right"});
      yy+=4.3;
    });
  }else{
    doc.setTextColor(...cream);
    doc.text("Sin trabajos seleccionados",labelX,yy);
    yy+=4.3;
  }

  yy+=1.5;
  doc.setDrawColor(105,105,105);doc.setLineWidth(.2);
  doc.line(labelX,yy,valueX,yy);
  yy+=5;

  doc.setTextColor(...cream);
  doc.text("Subtotal trabajos",labelX,yy);
  doc.text(pdfMoney(workSubtotal),valueX,yy,{align:"right"});
  yy+=5;

  doc.setTextColor(...amber);
  doc.text("Factor de responsabilidad",labelX,yy);
  doc.setTextColor(...cream);
  doc.text(factorInfo.label,valueX,yy,{align:"right"});
  yy+=5;

  doc.setTextColor(...cream);
  doc.text("Precio base presupuestado",labelX,yy);
  doc.text(pdfMoney(budgetAmount),valueX,yy,{align:"right"});
  yy+=5;

  if(resultDiscountPercent>0){
    const discountAmount=budgetAmount*(resultDiscountPercent/100);
    doc.setTextColor(232,48,48);
    doc.text(`Descuento por resultado (${String(resultDiscountPercent).replace(".",",")}%)`,labelX,yy);
    doc.text(`- ${pdfMoney(discountAmount)}`,valueX,yy,{align:"right"});
    yy+=5;
  }

  doc.setDrawColor(...cream);doc.setLineWidth(.28);
  doc.line(116,yy-1.5,valueX,yy-1.5);
  doc.setTextColor(...amber);doc.setFontSize(8.2);
  doc.text("COSTO FINAL",labelX,yy+2.5);
  doc.text(pdfMoney(finalAmount),valueX,yy+2.5,{align:"right"});
}


function getBudgetFactorForValue(rawValue){
  const raw=String(rawValue??"").trim();
  if(!raw)return {factor:1,label:"x1,00",special:false};
  const v=parsePdfMoney(raw);
  if(v<=50)return {factor:.50,label:"x0,50",special:false};
  if(v<=100)return {factor:.75,label:"x0,75",special:false};
  if(v<=250)return {factor:1.00,label:"x1,00",special:false};
  if(v<=500)return {factor:1.25,label:"x1,25",special:false};
  if(v<=750)return {factor:1.50,label:"x1,50",special:false};
  if(v<=1000)return {factor:1.75,label:"x1,75",special:false};
  if(v<=1500)return {factor:2.00,label:"x2,00",special:false};
  if(v<=2000)return {factor:3.00,label:"x3,00",special:false};
  return {factor:null,label:"EVALUACION ESPECIAL",special:true};
}

function getReportWorkCount(report){
  return ["limpieza","bordes","pliegues","relaminado","prensado","pulido","lustrado","otro"]
    .filter(k=>!!report.work?.[k]).length;
}
function getReportWorkPrice(key){
  return key === "pliegues" ? 10 : 5;
}
function getReportWorkSubtotal(report){
  return ["limpieza","bordes","pliegues","relaminado","prensado","pulido","lustrado","otro"]
    .reduce((sum,k)=>sum+(report.work?.[k]?getReportWorkPrice(k):0),0);
}

function drawSingleRatingRows(doc,report,group,items,x,y,w){
  const cream=[242,242,235],amber=[242,165,26];
  const labelW=42;
  const ballsX=x+labelW+3;
  const gap=4.1;
  const r=1.5;
  doc.setFont("courier","bold");
  doc.setFontSize(6.6);
  items.forEach((item,idx)=>{
    const yy=y+idx*7.0;
    const key=keyFor(group,item);
    const value=Number(report.ratings.before[key]||0);
    doc.setTextColor(...cream);
    doc.text(item,x,yy+1);
    for(let i=1;i<=10;i++)drawPdfPokeball(doc,ballsX+(i-1)*gap,yy,r,i<=value);
  });
}

function renderBudgetPage(doc,rawReport,assets){
  const report=normalizePdfReport(rawReport);
  const f=report.fields;
  const cream=[242,242,235],amber=[242,165,26],red=[232,48,48],muted=[150,150,145];
  const W=210,H=620;
  paintPdfBackground(doc,W,H);

  // HEADER
  drawBattleFrame(doc,8,10,194,42);
  drawPdfSprite(doc,assets.hooh,39,15,18);
  drawPdfSprite(doc,assets.lugia,153,15,18);
  if(assets.titleJp){
    try{doc.addImage(assets.titleJp,"PNG",64,13,82,19,undefined,"FAST")}catch(e){}
  }
  doc.setTextColor(...cream);doc.setFontSize(8.4);
  doc.text("PRESUPUESTO DE RESTAURACION",105,42,{align:"center"});
  doc.setTextColor(...amber);doc.setFontSize(6.8);
  doc.text("IG: @colosseum.ar",197,20,{align:"right"});

  // CLIENT / DATA
  drawBattleFrame(doc,8,61,194,44);
  drawCenteredFrameTitle(doc,8,61,194,"DATOS DE LA CARTA");
  doc.setFontSize(7.0);
  const entries=[
    ["Cliente",f.cliente,14,73,78],["Fecha",f.fecha,112,73,78],
    ["Carta",f.carta,14,82,78],["Numero",f.numero,112,82,78],
    ["Set",f.set,14,91,78],["Version",f.version,112,91,78],
    ["Estado",f.estado,14,100,46],["Valor declarado",f.precio,68,100,72],["Idioma",f.idioma,148,100,42]
  ];
  entries.forEach(([lab,val,x,y,lw])=>{
    doc.setTextColor(...amber);doc.text(lab,x,y);
    doc.setTextColor(...cream);doc.text(pdfSafeText(val)||"—",x+doc.getTextWidth(lab)+2.2,y);
    doc.setDrawColor(...muted);doc.setLineWidth(.22);doc.line(x,y+1.7,x+lw,y+1.7);
  });

  // FRONT — only BEFORE.
  drawBattleFrame(doc,8,115,194,142);
  drawCenteredFrameTitle(doc,8,115,194,"FRENTE - ESTADO INICIAL");
  drawPdfPhoto(doc,report.photos.frontBefore,18,130,58,82,"ANTES");
  doc.setTextColor(...amber);doc.setFontSize(7.2);
  doc.text("PUNTUACIONES INICIALES",141,134,{align:"center"});
  drawSingleRatingRows(doc,report,"front",criteria.front,88,146,106);

  // BACK — only BEFORE.
  drawBattleFrame(doc,8,267,194,142);
  drawCenteredFrameTitle(doc,8,267,194,"DORSO - ESTADO INICIAL");
  drawPdfPhoto(doc,report.photos.backBefore,18,282,58,82,"ANTES");
  doc.setTextColor(...amber);doc.setFontSize(7.2);
  doc.text("PUNTUACIONES INICIALES",141,286,{align:"center"});
  drawSingleRatingRows(doc,report,"back",criteria.back,88,298,106);

  // GENERAL — before only.
  drawBattleFrame(doc,8,419,194,42);
  drawCenteredFrameTitle(doc,8,419,194,"GENERAL - ESTADO INICIAL");
  drawSingleRatingRows(doc,report,"extra",criteria.extra,26,437,160);

  // WORK PROPOSED + PRICE
  drawBattleFrame(doc,8,471,92,115);
  drawCenteredFrameTitle(doc,8,471,92,"TRABAJOS PROPUESTOS");
  const workLabels=[
    ["limpieza","Limpieza"],["bordes","Limpieza de bordes"],
    ["pliegues","Reparacion pliegues / creases"],["relaminado","Pegado / relaminado"],
    ["prensado","Prensado"],["pulido","Pulido"],["lustrado","Lustrado"],["otro","Otro"]
  ];
  doc.setFont("courier","bold");doc.setFontSize(6.8);
  workLabels.forEach(([k,label],i)=>{
    const yy=486+i*10.0;
    drawPdfPokeball(doc,15,yy-1.2,1.55,!!report.work[k]);
    let shown=label;
    if(k==="otro"&&f.otroTrabajo)shown=`Otro: ${pdfSafeText(f.otroTrabajo)}`;
    doc.setTextColor(...cream);
    doc.text(doc.splitTextToSize(shown,72)[0],20,yy);
    doc.setTextColor(...amber);
    doc.text(pdfMoney(getReportWorkPrice(k)),92,yy,{align:"right"});
  });

  drawBattleFrame(doc,110,471,92,115);
  drawCenteredFrameTitle(doc,110,471,92,"COTIZACION");

  const count=getReportWorkCount(report);
  const proposed=getReportWorkSubtotal(report);
  const factorInfo=getBudgetFactorForValue(f.precio);
  const savedBudget=parsePdfMoney(f.precioPresupuestado);
  const calculated=factorInfo.special?null:(count===0?0:Math.max(15,proposed*factorInfo.factor));
  const shownBudget=savedBudget || calculated || 0;

  doc.setFontSize(7.4);
  doc.setTextColor(...cream);
  doc.text("Trabajos propuestos",118,493);
  doc.text(pdfMoney(proposed),194,493,{align:"right"});
  doc.setTextColor(...amber);
  doc.text("Factor de responsabilidad",118,513);
  doc.setTextColor(...cream);
  doc.text(factorInfo.label,194,513,{align:"right"});

  doc.setTextColor(...muted);doc.setFontSize(6.0);
  doc.text("(en base al valor declarado)",118,520);

  doc.setDrawColor(...cream);doc.setLineWidth(.35);
  doc.line(118,535,194,535);
  doc.setTextColor(...amber);doc.setFontSize(8.8);
  doc.text("PRECIO BASE",118,548);
  doc.text("PRESUPUESTADO",118,557);
  doc.setFontSize(13);
  if(factorInfo.special && !savedBudget){
    doc.setFontSize(7.3);
    doc.text("EVALUACION ESPECIAL",194,557,{align:"right"});
  }else{
    doc.text(pdfMoney(shownBudget),194,557,{align:"right"});
  }

  doc.setTextColor(...muted);doc.setFontSize(5.8);
  doc.text("Precio minimo de restauracion: U$ 15",118,575);
}

function renderDisclaimerPage(doc){
  const cream=[242,242,235],amber=[242,165,26],muted=[150,150,145];
  const W=210;
  const dl=getDisclaimerLayout(doc);
  const H=dl.pageH;
  paintPdfBackground(doc,W,H);

  const frameY=18;
  const frameH=dl.frameBottom-frameY;
  drawBattleFrame(doc,12,frameY,186,frameH);
  drawCenteredFrameTitle(doc,12,frameY,186,"DISCLAIMER");

  doc.setFont("courier","bold");
  doc.setTextColor(...amber);
  doc.setFontSize(7.0);
  doc.text("TABLA DE FACTORES",22,39);

  doc.setFontSize(6.2);
  doc.setTextColor(...cream);
  dl.rows.forEach((row,i)=>{
    const y=52+i*9;
    doc.text(row[0],28,y);
    doc.text(row[1],182,y,{align:"right"});
  });

  doc.setDrawColor(...muted);doc.setLineWidth(.25);doc.line(22,137,188,137);
  doc.setTextColor(...amber);doc.setFontSize(6.1);
  doc.text("Intervenciones: U$ 5  |  Pliegues / creases: U$ 10  |  Minimo: U$ 15",105,147,{align:"center"});

  let y=169;
  dl.sections.forEach(([title,text])=>{
    doc.setTextColor(...amber);doc.setFontSize(6.5);
    doc.text(title,22,y);
    y+=8;
    doc.setTextColor(...cream);doc.setFontSize(5.8);
    const lines=doc.splitTextToSize(text,166);
    doc.text(lines,22,y,{baseline:"top"});
    y+=lines.length*3.7+11;
  });
}

function renderRemitoSummaryPage(doc,reports,discountPercent,assets){
  const W=210,H=620;
  const cream=[242,242,235],amber=[242,165,26],red=[232,48,48],muted=[150,150,145];
  paintPdfBackground(doc,W,H);

  // Header matching the reports.
  drawBattleFrame(doc,8,10,194,46);
  drawPdfSprite(doc,assets.hooh,31,16,18);
  drawPdfSprite(doc,assets.lugia,161,16,18);
  if(assets.titleJp){
    try{doc.addImage(assets.titleJp,"PNG",61,14,88,20,undefined,"FAST")}catch(e){}
  }
  doc.setTextColor(...cream);doc.setFontSize(9);
  doc.text("REMITO DE RESTAURACION",105,42,{align:"center"});
  doc.setTextColor(...amber);doc.setFontSize(7);
  doc.text("IG: @colosseum.ar",196,22,{align:"right"});

  const first=normalizePdfReport(reports[0]);
  const client=first.fields.cliente||"—";
  const date=first.fields.fecha||new Date().toISOString().slice(0,10);

  drawBattleFrame(doc,8,66,194,30);
  drawCenteredFrameTitle(doc,8,66,194,"RESUMEN DEL LOTE");
  doc.setFontSize(7.4);
  doc.setTextColor(...amber);doc.text("CLIENTE",14,79);
  doc.setTextColor(...cream);doc.text(pdfSafeText(client),38,79);
  doc.setTextColor(...amber);doc.text("FECHA",118,79);
  doc.setTextColor(...cream);doc.text(pdfSafeText(date),139,79);
  doc.setTextColor(...amber);doc.text("CANTIDAD",14,88);
  doc.setTextColor(...cream);doc.text(String(reports.length),49,88);

  // Table
  const tableY=106;
  const rowH=17;
  const tableH=28+reports.length*rowH;
  drawBattleFrame(doc,8,tableY,194,tableH);
  drawCenteredFrameTitle(doc,8,tableY,194,"DETALLE");

  const cols={card:14,num:63,set:87,version:139,cost:194};
  const widths={card:45,num:20,set:48,version:42};
  const headY=tableY+15;
  doc.setTextColor(...amber);doc.setFontSize(6.8);
  doc.text("CARTA",cols.card,headY);
  doc.text("NUMERO",cols.num,headY);
  doc.text("EXPANSION / SET",cols.set,headY);
  doc.text("VERSION",cols.version,headY);
  doc.text("COSTO",cols.cost,headY,{align:"right"});
  doc.setDrawColor(...muted);doc.setLineWidth(.25);
  doc.line(13,headY+3,195,headY+3);

  const costs=[];
  reports.forEach((raw,idx)=>{
    const r=normalizePdfReport(raw);
    const f=r.fields;
    const y=headY+12+idx*rowH;
    const cost=parsePdfMoney(f.precioTrabajo);
    costs.push(cost);

    const fit=(text,maxW,start=6.6)=>{
      let size=start;
      doc.setFontSize(size);
      while(size>4.7 && doc.getTextWidth(pdfSafeText(text))>maxW){
        size-=.25;doc.setFontSize(size);
      }
      return size;
    };

    doc.setTextColor(...cream);
    fit(f.carta||"—",widths.card);doc.text(pdfSafeText(f.carta)||"—",cols.card,y);
    fit(f.numero||"—",widths.num);doc.text(pdfSafeText(f.numero)||"—",cols.num,y);
    fit(f.set||"—",widths.set);doc.text(pdfSafeText(f.set)||"—",cols.set,y);
    fit(f.version||"—",widths.version);doc.text(pdfSafeText(f.version)||"—",cols.version,y);
    doc.setFontSize(6.6);doc.text(pdfMoney(cost),cols.cost,y,{align:"right"});

    doc.setDrawColor(70,70,70);doc.setLineWidth(.2);
    doc.line(13,y+4,195,y+4);
  });

  const subtotal=costs.reduce((a,b)=>a+b,0);
  const pct=Math.max(0,Math.min(100,Number(discountPercent)||0));
  const discount=subtotal*pct/100;
  const afterDiscount=subtotal-discount;
  const finalTotal=Math.floor(afterDiscount);
  const rounding=Math.max(0,afterDiscount-finalTotal);

  const costsY=tableY+tableH+12;
  drawBattleFrame(doc,8,costsY,194,96);
  drawCenteredFrameTitle(doc,8,costsY,194,"SUMATORIA");

  const lx=95,rx=190;
  doc.setFontSize(8);
  doc.setTextColor(...cream);
  doc.text("SUBTOTAL",lx,costsY+22);
  doc.text(pdfMoney(subtotal,true),rx,costsY+22,{align:"right"});

  doc.setTextColor(...red);
  doc.text(`DESCUENTO POR LOTE (${pct.toFixed(pct%1?1:0)}%)`,lx,costsY+35);
  doc.text(`- ${pdfMoney(discount,true)}`,rx,costsY+35,{align:"right"});

  if(rounding>0.0001){
    doc.setTextColor(...amber);
    doc.text("REDONDEO A FAVOR",lx,costsY+48);
    doc.text(`- ${pdfMoney(rounding,true)}`,rx,costsY+48,{align:"right"});
  }

  doc.setDrawColor(...cream);doc.setLineWidth(.45);
  doc.line(lx,costsY+58,rx,costsY+58);
  doc.setTextColor(...amber);doc.setFontSize(13);
  doc.text("TOTAL FINAL",lx,costsY+75);
  doc.text(`U$ ${finalTotal}`,rx,costsY+75,{align:"right"});

  const termsY=costsY+108;
  drawBattleFrame(doc,8,termsY,194,58);
  drawCenteredFrameTitle(doc,8,termsY,194,"CONDICIONES DE PAGO");
  doc.setTextColor(...cream);doc.setFontSize(7.4);
  const terms="Condiciones de pago: contra entrega en Efectivo o Transferencia en Dólares, Crypto o Pesos al cambio del día. Link de pago presentará cargos adicionales.";
  const lines=doc.splitTextToSize(terms,174);
  doc.text(lines,18,termsY+20,{baseline:"top"});
}


function getBatchBudgetSummaryLayout(reports){
  const tableY=106, rowH=17;
  const tableH=28+reports.length*rowH;
  const sumY=tableY+tableH+12;
  return {tableY,rowH,tableH,sumY,pageH:Math.max(330,sumY+118)};
}

function getSavedBudgetAmount(raw){
  const report=normalizePdfReport(raw);
  const f=report.fields;
  const saved=parsePdfMoney(f.precioPresupuestado);
  if(String(f.precioPresupuestado??"").trim()) return saved;
  const count=getReportWorkCount(report);
  const factorInfo=getBudgetFactorForValue(f.precio);
  if(factorInfo.special) return 0;
  return count===0?0:Math.max(15,getReportWorkSubtotal(report)*factorInfo.factor);
}

function renderBatchBudgetSummaryPage(doc,reports,discountPercent,assets){
  const layout=getBatchBudgetSummaryLayout(reports);
  const W=210,H=layout.pageH;
  const cream=[242,242,235],amber=[242,165,26],red=[232,48,48],muted=[150,150,145];
  paintPdfBackground(doc,W,H);
  drawBattleFrame(doc,8,10,194,46);
  drawPdfSprite(doc,assets.hooh,31,16,18);
  drawPdfSprite(doc,assets.lugia,161,16,18);
  if(assets.titleJp){try{doc.addImage(assets.titleJp,"PNG",61,14,88,20,undefined,"FAST")}catch(e){}}
  doc.setTextColor(...cream);doc.setFontSize(9);
  doc.text("PRESUPUESTO DE RESTAURACION - LOTE",105,42,{align:"center"});
  doc.setTextColor(...amber);doc.setFontSize(7);doc.text("IG: @colosseum.ar",196,22,{align:"right"});
  const first=normalizePdfReport(reports[0]);
  const client=first.fields.cliente||"—";
  const date=first.fields.fecha||new Date().toISOString().slice(0,10);
  drawBattleFrame(doc,8,66,194,30);drawCenteredFrameTitle(doc,8,66,194,"RESUMEN DEL PRESUPUESTO");
  doc.setFontSize(7.4);
  doc.setTextColor(...amber);doc.text("CLIENTE",14,79);doc.setTextColor(...cream);doc.text(pdfSafeText(client),38,79);
  doc.setTextColor(...amber);doc.text("FECHA",118,79);doc.setTextColor(...cream);doc.text(pdfSafeText(date),139,79);
  doc.setTextColor(...amber);doc.text("CANTIDAD",14,88);doc.setTextColor(...cream);doc.text(String(reports.length),49,88);
  const {tableY,rowH,tableH,sumY}=layout;
  drawBattleFrame(doc,8,tableY,194,tableH);drawCenteredFrameTitle(doc,8,tableY,194,"DETALLE");
  const cols={card:14,num:63,set:87,version:139,cost:194}; const widths={card:45,num:20,set:48,version:42};
  const headY=tableY+15; doc.setTextColor(...amber);doc.setFontSize(6.8);
  doc.text("CARTA",cols.card,headY);doc.text("NUMERO",cols.num,headY);doc.text("EXPANSION / SET",cols.set,headY);doc.text("VERSION",cols.version,headY);doc.text("PRESUP.",cols.cost,headY,{align:"right"});
  doc.setDrawColor(...muted);doc.setLineWidth(.25);doc.line(13,headY+3,195,headY+3);
  const costs=[];
  reports.forEach((raw,idx)=>{
    const r=normalizePdfReport(raw),f=r.fields,y=headY+12+idx*rowH,cost=getSavedBudgetAmount(raw); costs.push(cost);
    const fit=(text,maxW,start=6.6)=>{let size=start;doc.setFontSize(size);while(size>4.7&&doc.getTextWidth(pdfSafeText(text))>maxW){size-=.25;doc.setFontSize(size)}return size};
    doc.setTextColor(...cream);fit(f.carta||"—",widths.card);doc.text(pdfSafeText(f.carta)||"—",cols.card,y);
    fit(f.numero||"—",widths.num);doc.text(pdfSafeText(f.numero)||"—",cols.num,y);fit(f.set||"—",widths.set);doc.text(pdfSafeText(f.set)||"—",cols.set,y);fit(f.version||"—",widths.version);doc.text(pdfSafeText(f.version)||"—",cols.version,y);
    doc.setFontSize(6.6);doc.text(pdfMoney(cost),cols.cost,y,{align:"right"});doc.setDrawColor(70,70,70);doc.setLineWidth(.2);doc.line(13,y+4,195,y+4);
  });
  const subtotal=costs.reduce((a,b)=>a+b,0); const pct=Math.max(0,Math.min(100,Number(discountPercent)||0)); const discount=subtotal*pct/100; const total=subtotal-discount;
  drawBattleFrame(doc,8,sumY,194,96);drawCenteredFrameTitle(doc,8,sumY,194,"SUMATORIA DEL PRESUPUESTO");
  const lx=95,rx=190;doc.setFontSize(8);doc.setTextColor(...cream);doc.text("SUBTOTAL",lx,sumY+22);doc.text(pdfMoney(subtotal,true),rx,sumY+22,{align:"right"});
  doc.setTextColor(...red);doc.text(`DESCUENTO POR LOTE (${pct.toFixed(pct%1?1:0)}%)`,lx,sumY+38);doc.text(`- ${pdfMoney(discount,true)}`,rx,sumY+38,{align:"right"});
  doc.setDrawColor(...cream);doc.setLineWidth(.45);doc.line(lx,sumY+53,rx,sumY+53);doc.setTextColor(...amber);doc.setFontSize(12);doc.text("TOTAL PRESUPUESTADO",lx,sumY+72);doc.text(pdfMoney(total,true),rx,sumY+72,{align:"right"});
  doc.setTextColor(...muted);doc.setFontSize(6.2);doc.text("El descuento por lote se aplica sobre la suma de los presupuestos individuales.",105,sumY+87,{align:"center"});
}

function downloadPdfDoc(doc,filename){
  const blob=doc.output("blob");
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  a.style.display="none";
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},3000);
}


async function generateBudgetPdf(){
  if(!window.jspdf?.jsPDF){
    alert("El motor PDF todavía no terminó de cargar. Revisá la conexión y probá nuevamente.");
    return;
  }
  autosaveDraft();
  const {jsPDF}=window.jspdf;
  const assets=await loadReportPdfAssets();
  const report=collect();

  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:[210,620],compress:true});
  renderBudgetPage(doc,report,assets);
  const disclaimerLayout=getDisclaimerLayout(doc);
  doc.addPage([210,disclaimerLayout.pageH],"portrait");
  renderDisclaimerPage(doc);

  const f=report.fields||{};
  const card=(pdfSafeText(f.carta)||"carta").replace(/[^\w\-]+/g,"_");
  const date=(pdfSafeText(f.fecha)||new Date().toISOString().slice(0,10)).replace(/[^\d\-]+/g,"");
  downloadPdfDoc(doc,`Presupuesto_${card}_${date}.pdf`);
  toast("PRESUPUESTO GENERADO");
}

async function generatePdf(){
  if(!window.jspdf?.jsPDF){
    alert("El motor PDF todavía no terminó de cargar. Revisá la conexión y probá nuevamente.");
    return;
  }
  autosaveDraft();
  const {jsPDF}=window.jspdf;
  const assets=await loadReportPdfAssets();
  const report=collect();
  const reportLayout=getFinalReportLayout(report);
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:[210,reportLayout.pageH],compress:true});
  renderReportPage(doc,report,assets);
  const disclaimerLayout=getDisclaimerLayout(doc);
  doc.addPage([210,disclaimerLayout.pageH],"portrait");
  renderDisclaimerPage(doc);

  const f=report.fields||{};
  const card=(pdfSafeText(f.carta)||"carta").replace(/[^\w\-]+/g,"_");
  const date=(pdfSafeText(f.fecha)||new Date().toISOString().slice(0,10)).replace(/[^\d\-]+/g,"");
  downloadPdfDoc(doc,`Restauracion_${card}_${date}.pdf`);
  toast("PDF GENERADO");
}

async function generateRemito(rawReports,discountPercent=0){
  if(!window.jspdf?.jsPDF){
    alert("El motor PDF todavía no terminó de cargar. Revisá la conexión y probá nuevamente.");
    return;
  }
  const reports=(rawReports||[]).filter(Boolean);
  if(!reports.length){
    toast("NO HAY REPORTES SELECCIONADOS");
    return;
  }

  const {jsPDF}=window.jspdf;
  const assets=await loadReportPdfAssets();
  const firstLayout=getFinalReportLayout(reports[0]);
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:[210,firstLayout.pageH],compress:true});

  reports.forEach((report,idx)=>{
    const pageLayout=getFinalReportLayout(report);
    if(idx>0)doc.addPage([210,pageLayout.pageH],"portrait");
    renderReportPage(doc,report,assets);
  });

  doc.addPage([210,620],"portrait");
  renderRemitoSummaryPage(doc,reports,discountPercent,assets);

  const first=normalizePdfReport(reports[0]);
  const client=(pdfSafeText(first.fields.cliente)||"cliente").replace(/[^\w\-]+/g,"_");
  const date=(pdfSafeText(first.fields.fecha)||new Date().toISOString().slice(0,10)).replace(/[^\d\-]+/g,"");
  downloadPdfDoc(doc,`Remito_${client}_${date}.pdf`);
  toast("REMITO GENERADO");
}


async function generateBatchBudget(rawReports,discountPercent=0){
  if(!window.jspdf?.jsPDF){alert("El motor PDF todavía no terminó de cargar. Revisá la conexión y probá nuevamente.");return;}
  const reports=(rawReports||[]).filter(Boolean);
  if(!reports.length){toast("NO HAY REPORTES SELECCIONADOS");return;}
  const {jsPDF}=window.jspdf; const assets=await loadReportPdfAssets();
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:[210,620],compress:true});
  reports.forEach((report,idx)=>{if(idx>0)doc.addPage([210,620],"portrait");renderBudgetPage(doc,report,assets);});
  const summaryLayout=getBatchBudgetSummaryLayout(reports);doc.addPage([210,summaryLayout.pageH],"portrait");renderBatchBudgetSummaryPage(doc,reports,discountPercent,assets);
  const disclaimerLayout=getDisclaimerLayout(doc);doc.addPage([210,disclaimerLayout.pageH],"portrait");renderDisclaimerPage(doc);
  const first=normalizePdfReport(reports[0]);const client=(pdfSafeText(first.fields.cliente)||"cliente").replace(/[^\w\-]+/g,"_");const date=new Date().toISOString().slice(0,10);
  downloadPdfDoc(doc,`Presupuesto_Lote_${client}_${date}.pdf`);toast("PRESUPUESTO POR LOTE GENERADO");
}


/* ===== Rev18 PDF features integrated below ===== */
/* Colosseum Restoration — PDF Rev18.7.1
   Loaded after pdf-v17.js and rev18.js.
*/
(() => {
  const baseRenderReportPage=renderReportPage;

  function fmt(v){return v==null?"—":String(v).replace(".",",");}
  function centerSummaryFromReport(report,face){
    const m=report?.centering?.[face]; if(!m)return null;
    const oldFront=window.rev18State?.front,oldBack=window.rev18State?.back;
    if(window.rev18State)window.rev18State[face]=m;
    const s=typeof window.getRev18CenterSummary==="function"?window.getRev18CenterSummary(face):null;
    if(window.rev18State){window.rev18State.front=oldFront;window.rev18State.back=oldBack;}
    return s;
  }
  function drawCenterPokeballs(doc,value,cx,cy){
    if(value==null)return;
    const r=1.18,gap=3.05,start=cx-(9*gap)/2;
    for(let i=1;i<=10;i++){
      const full=value>=i,half=!full && value>=i-.5;
      if(full) drawPdfPokeball(doc,start+(i-1)*gap,cy,r,true);
      else if(half){
        drawPdfPokeball(doc,start+(i-1)*gap,cy,r,false);
        doc.setFillColor(232,48,48);
        doc.ellipse(start+(i-1)*gap-.28,cy-r*.34,r*.40,r*.42,"F");
      }else drawPdfPokeball(doc,start+(i-1)*gap,cy,r,false);
    }
  }
  function drawCenterOverlay(doc,report,face){
    const s=centerSummaryFromReport(report,face);if(!s)return;
    const cream=[242,242,235],amber=[242,165,26],muted=[92,92,92];
    const isFront=face==="front";
    const m=report.centering[face];
    const x=123,py=isFront?122:318,w=62,h=87;

    // Cotas: separate band between the image label and the photo, plus sides/bottom.
    doc.setFont("courier","bold");doc.setFontSize(4.4);doc.setTextColor(...amber);
    doc.text(`T ${Math.round(m.top)}%`,x+w/2,py-1.6,{align:"center"});
    doc.text(`L ${Math.round(m.left)}%`,x-1.5,py+h/2,{align:"right"});
    doc.text(`R ${Math.round(m.right)}%`,x+w+1.5,py+h/2);
    doc.text(`B ${Math.round(m.bottom)}%`,x+w/2,py+h+3.1,{align:"center"});

    // Dedicated full-width Centering box.
    const boxY=isFront?216:416;
    const boxH=13.5;
    doc.setDrawColor(...muted);doc.setLineWidth(.28);doc.rect(18,boxY,174,boxH,"S");
    // Rev18.4.1: first line is composed around the page center as one compact visual group.
    doc.setFontSize(5.35);doc.setTextColor(...amber);
    const centerLabel=`CENTRADO ${isFront?"FRENTE":"DORSO"}   H ${s.h}   V ${s.v}`;
    // Positions deliberately kept close together around x=105 (page center).
    doc.text(centerLabel,95,boxY+4.5,{align:"right"});
    drawCenterPokeballs(doc,s.colosseum,115,boxY+4.2);
    doc.setFontSize(6.0);doc.text(fmt(s.colosseum),134,boxY+4.7,{align:"left"});
    doc.setFontSize(4.4);doc.setTextColor(...cream);
    doc.text(`Referencia: PSA ${fmt(s.psa)}  ·  BGS ${fmt(s.bgs)}  ·  CGC ${fmt(s.cgc)}  ·  TAG ${fmt(s.tag)}`,105,boxY+9.7,{align:"center"});
  }
  renderReportPage=function(doc,rawReport,assets){
    baseRenderReportPage(doc,rawReport,assets);
    const report=normalizePdfReport(rawReport);
    // normalizePdfReport may discard Rev18 fields in old implementation, so use raw data.
    report.centering=rawReport?.centering||null;
    drawCenterOverlay(doc,report,"front");drawCenterOverlay(doc,report,"back");
  };

  function validDetails(report){
    return (report?.restorationDetails||[]).filter(d=>d && (d.before||d.after||String(d.text||"").trim()));
  }
  function addImageContain(doc,data,x,y,w,h){
    if(!data){doc.setDrawColor(90,90,90);doc.rect(x,y,w,h);return;}
    try{
      const props=doc.getImageProperties(data),ar=props.width/props.height,box=w/h;
      let dw=w,dh=h,dx=x,dy=y;
      if(ar>box){dh=w/ar;dy=y+(h-dh)/2}else{dw=h*ar;dx=x+(w-dw)/2}
      doc.addImage(data,"JPEG",dx,dy,dw,dh,undefined,"FAST");
    }catch(e){doc.setDrawColor(90,90,90);doc.rect(x,y,w,h);}
  }
  // Rev18.7: detail pages use only the height actually required by their rows.
  // This removes the large fixed black gap before the following Disclaimer page.
  function getDetailsPageHeight(itemCount){
    const headerTop=10, headerH=24, rowsTop=42, rowH=88, rowStep=96, bottomMargin=10;
    const n=Math.max(1,itemCount||1);
    return rowsTop + (n-1)*rowStep + rowH + bottomMargin;
  }
  function renderDetailsPage(doc,report,items,pageIndex,totalPages,pageH){
    const cream=[242,242,235],amber=[242,165,26],muted=[150,150,145];
    const H=pageH||getDetailsPageHeight(items.length);paintPdfBackground(doc,210,H);
    drawBattleFrame(doc,8,10,194,24);drawCenteredFrameTitle(doc,8,10,194,"DETALLES DE RESTAURACION");
    doc.setFont("courier","bold");doc.setFontSize(6);doc.setTextColor(...muted);
    doc.text(`${pdfSafeText(report.fields?.carta)||"Carta"} · ${pageIndex}/${totalPages}`,105,29,{align:"center"});
    let y=42;
    items.forEach((d,i)=>{
      const boxH=88;drawBattleFrame(doc,8,y,194,boxH);
      doc.setTextColor(...amber);doc.setFontSize(6.5);
      doc.text("ANTES",56,y+8,{align:"center"});doc.text("DESPUES",154,y+8,{align:"center"});
      // 4:3 horizontal boxes, 84 x 63 mm.
      addImageContain(doc,d.before,14,y+13,84,63);addImageContain(doc,d.after,112,y+13,84,63);
      doc.setTextColor(...cream);doc.setFontSize(5.8);
      let txt=pdfSafeText(d.text||"");
      while(doc.getTextWidth(txt)>178 && doc.getFontSize()>4.2)doc.setFontSize(doc.getFontSize()-.2);
      if(doc.getTextWidth(txt)>178)txt=doc.splitTextToSize(txt,178)[0];
      doc.text(txt||" ",105,y+82,{align:"center"});
      y+=96;
    });
  }
  function appendDetailPages(doc,rawReport){
    const report=normalizePdfReport(rawReport);report.restorationDetails=rawReport?.restorationDetails||[];
    const details=validDetails(report);if(!details.length)return;
    const perPage=2,total=Math.ceil(details.length/perPage);
    for(let p=0;p<total;p++){
      const items=details.slice(p*perPage,p*perPage+perPage);
      const pageH=getDetailsPageHeight(items.length);
      doc.addPage([210,pageH],"landscape");
      renderDetailsPage(doc,report,items,p+1,total,pageH);
    }
  }

  // Replace only final report generator: same Rev17 report + Rev18 detail pages + disclaimer.
  generatePdf=async function(){
    if(!window.jspdf?.jsPDF){alert("El motor PDF todavía no terminó de cargar. Revisá la conexión y probá nuevamente.");return;}
    autosaveDraft();
    const {jsPDF}=window.jspdf,assets=await loadReportPdfAssets(),report=collect(),layout=getFinalReportLayout(report);
    const doc=new jsPDF({orientation:"portrait",unit:"mm",format:[210,layout.pageH],compress:true});
    renderReportPage(doc,report,assets);
    appendDetailPages(doc,report);
    const disclaimerLayout=getDisclaimerLayout(doc);doc.addPage([210,disclaimerLayout.pageH],"portrait");renderDisclaimerPage(doc);
    const f=report.fields||{},card=(pdfSafeText(f.carta)||"carta").replace(/[^\w\-]+/g,"_"),date=(pdfSafeText(f.fecha)||new Date().toISOString().slice(0,10)).replace(/[^\d\-]+/g,"");
    downloadPdfDoc(doc,`Restauracion_${card}_${date}.pdf`);toast("PDF GENERADO");
  };

  // Remito keeps each saved report complete, including Rev18 detail pages.
  generateRemito=async function(rawReports,discountPercent=0){
    if(!window.jspdf?.jsPDF){alert("El motor PDF todavía no terminó de cargar. Revisá la conexión y probá nuevamente.");return;}
    const reports=(rawReports||[]).filter(Boolean);if(!reports.length){toast("NO HAY REPORTES SELECCIONADOS");return;}
    const {jsPDF}=window.jspdf,assets=await loadReportPdfAssets(),firstLayout=getFinalReportLayout(reports[0]);
    const doc=new jsPDF({orientation:"portrait",unit:"mm",format:[210,firstLayout.pageH],compress:true});
    reports.forEach((report,idx)=>{
      const layout=getFinalReportLayout(report);if(idx>0)doc.addPage([210,layout.pageH],"portrait");
      renderReportPage(doc,report,assets);appendDetailPages(doc,report);
    });
    doc.addPage([210,620],"portrait");renderRemitoSummaryPage(doc,reports,discountPercent,assets);
    const first=normalizePdfReport(reports[0]),client=(pdfSafeText(first.fields.cliente)||"cliente").replace(/[^\w\-]+/g,"_"),date=(pdfSafeText(first.fields.fecha)||new Date().toISOString().slice(0,10)).replace(/[^\d\-]+/g,"");
    downloadPdfDoc(doc,`Remito_${client}_${date}.pdf`);toast("REMITO GENERADO");
  };
})();