/* Mobile V9.3: preserve existing IDs and handlers, relocate history controls into drawer. */
(()=>{
 const menu=document.getElementById('crNavMenu');
 const backdrop=document.getElementById('crNavBackdrop');
 const toggle=document.getElementById('crMenuToggle');
 const plus=document.getElementById('crV93Plus');
 const save=document.getElementById('saveBtn');
 const fresh=document.getElementById('newBtn');
 if(!menu||!toggle)return;
 const move=(id,target)=>{
   const node=document.getElementById(id),dest=document.getElementById(target);
   if(node&&dest)dest.appendChild(node);
 };
 move('driveSyncPanel','crV93Drive');
 move('history-backup-placeholder','crV93Backup');
 move('history-remito-placeholder','crV93History');
 move('folderToolbar','crV93Folders');
 move('historyList','crV93List');
 move('selectAllReports','crV93SelectAll');
 // Relocate actual original controls, rather than cloning elements or IDs.
 const backup=document.querySelector('#historyDialog .history-backup-bar');
 const history=document.querySelector('#historyDialog .history-remito-bar');
 if(backup)document.getElementById('crV93Backup')?.appendChild(backup);
 if(history)document.getElementById('crV93History')?.appendChild(history);
 // Select-all belongs in the client list heading, not in the lot actions.
 move('selectAllReports','crV93SelectAll');
 const budget=document.getElementById('batchBudgetBtn');
 const remito=document.getElementById('remitoBtn');
 if(budget)budget.textContent='▤ Presupuesto';
 if(remito)remito.textContent='▧ Remito';
 const client=document.getElementById('createClientFolder');
 const lot=document.getElementById('createLotFolder');
 if(client)client.textContent='＋ Cliente';
 if(lot)lot.textContent='＋ Lote';
 const exportBtn=document.getElementById('exportDatabaseBtn');
 const importBtn=document.getElementById('importDatabaseBtn');
 if(exportBtn)exportBtn.textContent='↓ Exportar';
 if(importBtn)importBtn.textContent='↑ Importar';
 const dialog=document.getElementById('historyDialog');
 if(dialog)dialog.hidden=true;
 const setActions=open=>{
   if(save)save.hidden=!open;
   if(fresh)fresh.hidden=!open;
   if(plus){plus.setAttribute('aria-expanded',String(open));plus.textContent=open?'×':'＋';}
 };
 const setOpen=open=>{
   menu.hidden=!open;
   if(backdrop)backdrop.hidden=!open;
   toggle.setAttribute('aria-expanded',String(open));
   if(open){
     setActions(false);
     if(typeof renderHistory==='function')Promise.resolve(renderHistory()).catch(console.error);
   }
 };
 toggle.addEventListener('click',()=>setOpen(menu.hidden));
 plus?.addEventListener('click',()=>setActions(plus.getAttribute('aria-expanded')!=='true'));
 document.getElementById('crMenuClose')?.addEventListener('click',()=>setOpen(false));
 backdrop?.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){setOpen(false);setActions(false);}});
 [save,fresh].forEach(button=>button?.addEventListener('click',()=>setActions(false)));
})();
