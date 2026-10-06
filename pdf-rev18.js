/* Colosseum Restoration — PDF Rev18.3
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
    const x=123,py=isFront?122:322,w=62,h=87;

    // Cotas: separate band between the image label and the photo, plus sides/bottom.
    doc.setFont("courier","bold");doc.setFontSize(4.4);doc.setTextColor(...amber);
    doc.text(`T ${Math.round(m.top)}%`,x+w/2,py-5.2,{align:"center"});
    doc.text(`L ${Math.round(m.left)}%`,x-1.5,py+h/2,{align:"right"});
    doc.text(`R ${Math.round(m.right)}%`,x+w+1.5,py+h/2);
    doc.text(`B ${Math.round(m.bottom)}%`,x+w/2,py+h+3.1,{align:"center"});

    // Dedicated full-width Centering box.
    const boxY=isFront?216:416;
    const boxH=13.5;
    doc.setDrawColor(...muted);doc.setLineWidth(.28);doc.rect(18,boxY,174,boxH,"S");
    doc.setFontSize(5.35);doc.setTextColor(...amber);
    doc.text(`CENTRADO ${isFront?"FRENTE":"DORSO"}   H ${s.h}   V ${s.v}`,24,boxY+4.5);
    drawCenterPokeballs(doc,s.colosseum,143,boxY+4.2);
    doc.setFontSize(6.0);doc.text(fmt(s.colosseum),166,boxY+4.7,{align:"center"});
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
  function renderDetailsPage(doc,report,items,pageIndex,totalPages){
    const cream=[242,242,235],amber=[242,165,26],muted=[150,150,145];
    const H=297;paintPdfBackground(doc,210,H);
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
      doc.addPage([210,297],"portrait");
      renderDetailsPage(doc,report,details.slice(p*perPage,p*perPage+perPage),p+1,total);
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