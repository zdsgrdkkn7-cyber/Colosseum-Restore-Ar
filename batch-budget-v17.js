// Rev17 — presupuesto por lote sin modificar IndexedDB ni el esquema de reportes.
(function(){
  function selectedReports(){
    try{return historyReports.filter(r=>selectedReportIds.has(r.id));}catch(e){return [];}
  }
  function refreshBatchButton(){
    const btn=document.getElementById("batchBudgetBtn"); if(!btn)return;
    btn.disabled=selectedReports().length===0;
  }
  async function createSelectedBatchBudget(){
    const reports=selectedReports();
    if(!reports.length){toast("SELECCIONÁ AL MENOS UN REPORTE");return;}
    const discountEl=document.getElementById("lotDiscount");
    let discount=Number.parseFloat(discountEl?.value||"0"); if(!Number.isFinite(discount))discount=0; discount=Math.max(0,Math.min(100,discount));
    if(discountEl)discountEl.value=String(discount);
    if(typeof generateBatchBudget!=="function"){toast("GENERADOR DE PRESUPUESTO POR LOTE NO DISPONIBLE");return;}
    await generateBatchBudget(reports,discount);
  }
  document.addEventListener("DOMContentLoaded",()=>{
    const btn=document.getElementById("batchBudgetBtn"); if(btn)btn.onclick=()=>createSelectedBatchBudget().catch(e=>{console.error(e);toast("ERROR AL GENERAR PRESUPUESTO")});
    const dialog=document.getElementById("historyDialog");
    if(dialog){dialog.addEventListener("change",()=>setTimeout(refreshBatchButton,0));dialog.addEventListener("click",()=>setTimeout(refreshBatchButton,0));}
    const historyBtn=document.getElementById("historyBtn"); if(historyBtn)historyBtn.addEventListener("click",()=>setTimeout(refreshBatchButton,100));
    refreshBatchButton();
  });
})();
