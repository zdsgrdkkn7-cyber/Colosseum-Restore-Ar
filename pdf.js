function pdfSafeText(s){
  return String(s ?? "").replace(/\r/g,"").trim();
}

function drawPdfPokeball(doc,cx,cy,r,active=true){
  const amber=[242,165,26], cream=[255,243,199], gray=[92,92,92], grayLight=[128,128,128], dark=[14,14,14];

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
  const s=3.2;      // stepped corner depth
  const node=2.2;   // corner square size

  doc.setDrawColor(...cream);
  doc.setLineWidth(.55);

  // One continuous, symmetric Game Boy-style path.
  // Every corner uses the exact same two-step geometry, mirrored.
  const pts=[
    [x+s,y],
    [x+w-s,y],
    [x+w-s,y+s/2],
    [x+w,y+s/2],
    [x+w,y+h-s],
    [x+w-s/2,y+h-s],
    [x+w-s/2,y+h],
    [x+s,y+h],
    [x+s,y+h-s/2],
    [x,y+h-s/2],
    [x,y+s],
    [x+s/2,y+s],
    [x+s/2,y],
    [x+s,y]
  ];

  for(let i=0;i<pts.length-1;i++){
    doc.line(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);
  }

  // Four identical corner nodes, fully inside the frame.
  const nodes=[
    [x+s/2-node/2, y+s/2-node/2],
    [x+w-s/2-node/2, y+s/2-node/2],
    [x+s/2-node/2, y+h-s/2-node/2],
    [x+w-s/2-node/2, y+h-s/2-node/2]
  ];
  nodes.forEach(([nx,ny])=>{
    doc.setFillColor(...black);
    doc.rect(nx,ny,node,node,"F");
    doc.setDrawColor(...cream);
    doc.setLineWidth(.4);
    doc.rect(nx,ny,node,node,"S");
  });

  // Title interrupts the top rail like a Pokémon battle text box.
  if(title){
    doc.setFont("courier","bold");
    doc.setFontSize(8.5);
    const tw=doc.getTextWidth(title);
    const pad=3.4;
    const tx=x+12;
    doc.setFillColor(...black);
    doc.rect(tx-pad,y-2.2,tw+pad*2,4.6,"F");
    doc.setTextColor(...amber);
    doc.text(title,tx,y+.9);
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

function drawPdfRatingRows(doc,group,items,y,xLeft=15,xRight=127,labelX=105){
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
  doc.setFontSize(17);
  doc.text("REPORTE DE RESTAURACION",105,22,{align:"center"});
  doc.text("DE CARTA POKEMON",105,29,{align:"center"});
  for(let i=0;i<6;i++) drawPdfPokeball(doc,92+i*5.3,37,1.8,true);

  // DATA
  drawBattleFrame(doc,8,53,194,35,"DATOS DE LA CARTA");
  doc.setFontSize(7.5);
  doc.setTextColor(...cream);
  const f=collect().fields;
  const entries=[
    ["Cliente",f.cliente,14,65,68],["Fecha",f.fecha,112,65,38],
    ["Carta",f.carta,14,73,68],["Set",f.set,112,73,38],
    ["Numero",f.numero,14,81,48],["Version / Idioma",f.idioma,72,81,55],
    ["Valor estimado",f.valor,137,81,54]
  ];
  entries.forEach(([lab,val,x,y,lw])=>{
    doc.setTextColor(...amber);doc.text(lab,x,y);
    doc.setTextColor(...cream);doc.text(pdfSafeText(val)||"—",x+doc.getTextWidth(lab)+3,y);
    doc.setDrawColor(...muted);doc.setLineWidth(.25);doc.line(x,y+1.8,x+lw,y+1.8);
  });

  // FRONT
  drawBattleFrame(doc,8,96,194,174,"FRENTE");
  doc.setTextColor(...redAmber);doc.setFontSize(8);
  doc.text("ESTADO INICIAL (ANTES)",56,108,{align:"center"});
  doc.text("ESTADO FINAL (DESPUES)",154,108,{align:"center"});
  drawPdfPhoto(doc,state.photos.frontBefore,25,116,62,87,"ANTES");
  drawPdfPhoto(doc,state.photos.frontAfter,123,116,62,87,"DESPUES");

  doc.setTextColor(...amber);doc.setFontSize(8);
  doc.text("PUNTUACIONES FRENTE",105,213,{align:"center"});
  doc.setTextColor(...redAmber);
  doc.text("ANTES",34,220);
  doc.text("DESPUES",176,220,{align:"right"});
  drawPdfRatingRows(doc,"front",criteria.front,227);

  // BACK
  drawBattleFrame(doc,8,278,194,174,"DORSO");
  doc.setTextColor(...redAmber);doc.setFontSize(8);
  doc.text("ESTADO INICIAL (ANTES)",56,290,{align:"center"});
  doc.text("ESTADO FINAL (DESPUES)",154,290,{align:"center"});
  drawPdfPhoto(doc,state.photos.backBefore,25,298,62,87,"ANTES");
  drawPdfPhoto(doc,state.photos.backAfter,123,298,62,87,"DESPUES");

  doc.setTextColor(...amber);doc.setFontSize(8);
  doc.text("PUNTUACIONES DORSO",105,395,{align:"center"});
  doc.setTextColor(...redAmber);
  doc.text("ANTES",34,402);
  doc.text("DESPUES",176,402,{align:"right"});
  drawPdfRatingRows(doc,"back",criteria.back,409);

  // EDGE / GENERAL
  drawBattleFrame(doc,8,460,194,42,"CANTO / BORDE + GENERAL");
  drawPdfRatingRows(doc,"extra",criteria.extra,477);

  // WORK + NOTES
  drawBattleFrame(doc,8,510,92,72,"TRABAJO REALIZADO");
  drawBattleFrame(doc,110,510,92,72,"OBSERVACIONES");

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

  doc.setTextColor(...cream);doc.setFontSize(7.4);
  drawWrappedText(doc,f.observaciones,116,522,80,4.2,12);

  // PRICE
  drawBattleFrame(doc,8,590,194,18,"PRECIO DEL TRABAJO");
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

