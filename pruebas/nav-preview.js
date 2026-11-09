/* Preview navigation. Dispatches clicks to the existing app controls. */
(()=>{
 const menu=document.getElementById('crNavMenu'),backdrop=document.getElementById('crNavBackdrop'),toggle=document.getElementById('crMenuToggle');
 if(!menu||!toggle)return;
 function setOpen(open){
  menu.hidden=!open;backdrop.hidden=!open;
  toggle.setAttribute('aria-expanded',String(open));
 }
 toggle.addEventListener('click',()=>setOpen(menu.hidden));
 document.getElementById('crMenuClose')?.addEventListener('click',()=>setOpen(false));
 backdrop?.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
 menu.querySelectorAll('[data-cr-target]').forEach(button=>button.addEventListener('click',()=>{
  setOpen(false);
  const target=document.getElementById(button.dataset.crTarget);
  if(target)target.click();
 }));
})();
