/* Collectr visual prototype only: group existing live form controls, no clones. */
(()=>{const init=()=>{
 const section=document.querySelector('.compare-section');if(!section||section.dataset.collectrReady)return;
 const blocks=[...section.children];const first=blocks.find(x=>x.classList.contains('photo-pair-block'));const second=blocks.find(x=>x.classList.contains('second-photo-block'));
 if(!first||!second)return;
 const wrap=(start,end,name)=>{const card=document.createElement('div');card.className='cr-compare-card';card.setAttribute('aria-label',name);const title=document.createElement('h3');title.className='cr-card-heading';title.textContent=name;card.append(title);section.insertBefore(card,start);let node=start;while(node&&node!==end){const next=node.nextElementSibling;card.append(node);node=next}return card};
 wrap(first,second,'Frente');
 const general=blocks.find(x=>x.classList.contains('compact-ratings'));
 wrap(second,general,'Dorso');
 section.dataset.collectrReady='true';
 const nav=document.getElementById('crNavMenu');
 const history=document.getElementById('historyBtn');
 const drive=document.getElementById('crDriveMenuBtn');
 drive?.addEventListener('click',()=>{history?.click();setTimeout(()=>document.getElementById('driveSyncPanel')?.scrollIntoView({behavior:'smooth',block:'center'}),180)});
 document.getElementById('crClearMenuBtn')?.addEventListener('click',()=>{history?.click();setTimeout(()=>document.getElementById('clearTestDatabaseBtn')?.focus(),120)});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
