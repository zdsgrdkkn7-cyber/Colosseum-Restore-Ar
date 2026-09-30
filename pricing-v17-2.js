// Rev17.2 — precios por tipo de intervención. No modifica IndexedDB.
(function(){
  const BASE_WORK_PRICE=5;
  const CREASE_WORK_PRICE=10;
  const keys=["limpieza","bordes","pliegues","relaminado","prensado","pulido","lustrado","otro"];
  function selectedWorkSubtotal(){
    return keys.reduce((sum,k)=>sum+(state.work?.[k]?(k==="pliegues"?CREASE_WORK_PRICE:BASE_WORK_PRICE):0),0);
  }
  updateBudgetPreview=function({force=false}={}){
    const count=getSelectedWorkCount();
    const worksSubtotal=selectedWorkSubtotal();
    const factorInfo=getResponsibilityFactor();
    const worksEl=$("#trabajosPropuestos");
    const factorEl=$("#factorResponsabilidad");
    if(worksEl)worksEl.textContent=formatUsd(worksSubtotal);
    if(factorEl)factorEl.textContent=factorInfo.label;
    const budgetEl=$("#precioPresupuestado");
    if(force)state.budgetManualOverride=false;
    if(!state.budgetManualOverride && budgetEl){
      if(factorInfo.special) budgetEl.value="";
      else budgetEl.value=formatMoneyInput(count===0?0:Math.max(MIN_RESTORATION_PRICE,worksSubtotal*factorInfo.factor));
    }
    updateFinalCost();
  };
})();
