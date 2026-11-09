/* Side navigation preview: actual app action buttons live in drawer. */
(()=>{
 const menu=document.getElementById('crNavMenu'),backdrop=document.getElementById('crNavBackdrop'),toggle=document.getElementById('crMenuToggle');
 if(!menu||!toggle)return;
 const setOpen=open=>{
  menu.hidden=!open;
  backdrop.hidden=!open;
  toggle.setAttribute('aria-expanded',String(open));
 };
 toggle.addEventListener('click',()=>setOpen(menu.hidden));
 document.getElementById('crMenuClose')?.addEventListener('click',()=>setOpen(false));
 backdrop?.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
 menu.querySelectorAll('button[id]:not(#crMenuClose)').forEach(button=>button.addEventListener('click',()=>setOpen(false)));
})();
