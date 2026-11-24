(()=>{
 const $=id=>document.getElementById(id),menu=$('ridge-menu'),toggle=$('ridge-menu-toggle');
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const closeMenu=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false')};
 const updateHeader=()=>document.body.classList.toggle('past-hero',window.scrollY>Math.max(60,$('top').offsetHeight-110));
 const goSection=(id,animate=true)=>{
  const target=$(id);if(!target)return;
  document.activeElement?.blur();closeMenu();
  const behavior=animate&&!reduced()?'smooth':'instant';
  if(id==='questionnaire'){
   const card=target.querySelector('.card');
   const header=document.querySelector('.ridge-header').getBoundingClientRect();
   const cardTop=card.getBoundingClientRect().top+window.scrollY;
   const safeTop=Math.max(0,cardTop-header.bottom-16);
   // Desktop: reach the footer whenever the form still fits below the header.
   // Stacked/mobile layout: land at the form, not past it at the app invitation.
   const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
   window.scrollTo({top:Math.min(maxScroll,safeTop),behavior});
  }else target.scrollIntoView({behavior,block:'start'});
  target.focus({preventScroll:true});updateHeader();
 };
 const start=(trackOpen=true)=>{
  if(trackOpen!==false)window.AlivaAnalytics?.track('aliva_questionnaire_open',true);
  if(location.hash!=='#questionnaire')history.pushState(null,'','#questionnaire');
  goSection('questionnaire');
 };
 $('ridge-start').addEventListener('click',start);
 document.querySelectorAll('[data-start]').forEach(el=>el.addEventListener('click',start));
 document.querySelectorAll('[data-download-example]').forEach(button=>button.addEventListener('click',async()=>{
  if(button.disabled)return;
  const label=button.textContent,status=$('example-download-status');
  button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Готовим PDF…';status.textContent='';
  try{
   // This profile is separate from the user's questionnaire and calculated plan.
   const example=AlivaExample.build();
   const bytes=await AlivaPDF.create(example,{example:true});
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   const link=document.createElement('a');link.href=url;link.download='aliva-example-'+example.asOf+'.pdf';
   document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   window.AlivaAnalytics?.track('aliva_example_pdf_download');
  }catch{status.textContent='Не удалось подготовить PDF. Попробуйте ещё раз.'}
  finally{button.disabled=false;button.removeAttribute('aria-busy');button.textContent=label}
 }));
 const appDialog=$('app-coming-dialog');let storeTrigger=null;
 document.querySelectorAll('[data-app-store]').forEach(button=>button.addEventListener('click',()=>{
  storeTrigger=button;appDialog.showModal();document.body.classList.add('app-dialog-open');
  window.AlivaAnalytics?.track(button.dataset.appStore==='app_store'?'aliva_app_store_click':'aliva_google_play_click');
 }));
 appDialog.querySelector('.app-dialog-close').addEventListener('click',()=>appDialog.close());
 $('app-coming-dismiss').addEventListener('click',()=>appDialog.close());
 appDialog.addEventListener('keydown',event=>{
  // Escape belongs to the modal, not to the questionnaire beneath it.
  if(event.key==='Escape')event.stopPropagation();
  if(event.key==='Tab'){
   const buttons=[...appDialog.querySelectorAll('button:not(:disabled)')];
   const index=buttons.indexOf(document.activeElement);
   event.preventDefault();
   buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
  }
 });
 appDialog.addEventListener('click',event=>{
  const r=appDialog.getBoundingClientRect();
  if(event.target===appDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))appDialog.close();
 });
 appDialog.addEventListener('close',()=>{document.body.classList.remove('app-dialog-open');storeTrigger?.focus({preventScroll:true});});
 document.querySelectorAll('[data-info]').forEach(el=>el.addEventListener('click',()=>{$(el.dataset.info).click();start(false)}));
 document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  const id=link.getAttribute('href').slice(1);if(!$(id))return;
  event.preventDefault();if(location.hash!=='#'+id)history.pushState(null,'','#'+id);goSection(id);
 }));
 toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector('a,button').focus()});
 $('home').addEventListener('click',()=>{history.replaceState(null,'',location.pathname+location.search);goSection('top')});
 document.addEventListener('click',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!toggle.contains(event.target))closeMenu()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){closeMenu();toggle.focus()}});
 const applyHash=()=>{
  const id=location.hash.slice(1);
  // Old PDF links no longer open feedback; land on the questionnaire instead.
  if(id==='feedback'||id==='feedback-section'){history.replaceState(null,'',location.pathname+location.search+'#questionnaire');goSection('questionnaire',false)}
  else if(id&&$(id)&&$(id).matches('.landing-section,#top'))goSection(id,false);
  else if(!id)goSection('top',false);
 };
 window.addEventListener('hashchange',applyHash);
 let scheduled=false;window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{updateHeader();scheduled=false})}},{passive:true});
 requestAnimationFrame(()=>{applyHash();updateHeader()});
})();
