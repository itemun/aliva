/* Automatic public-site analytics. Never read questionnaire values or record its branches. */
(()=>{
 'use strict';
 if(window.AlivaAnalytics)return;
 const COUNTER_ID=114646189;
 const goals=Object.freeze(['aliva_app_store_click','aliva_google_play_click','aliva_pdf_download','aliva_example_pdf_download','aliva_questionnaire_open','aliva_questionnaire_start','aliva_profile_complete','aliva_measurements_complete','aliva_plan_ready','aliva_view_how_it_works','aliva_view_example','aliva_view_sources','aliva_view_app']);
 const location=window.location,production=location?.protocol==='https:'&&location.hostname==='itemun.github.io'&&/^\/aliva(?:\/|$)/.test(location.pathname);
 const seen=new Set();let active=false,observer=null;
 function track(goal,once=false){
  if(!goals.includes(goal)||!active||!production||window['disableYaCounter'+COUNTER_ID]===true)return false;
  if(once===true&&seen.has(goal))return false;
  if(once===true)seen.add(goal);
  try{window.dispatchEvent(new CustomEvent('aliva:conversion',{detail:Object.freeze({goal})}));}catch{}
  try{window.ym(COUNTER_ID,'reachGoal',goal);}catch{}
  return true;
 }
 function observeSections(){
  if(!window.IntersectionObserver)return;
  const sections={'how-it-works':'aliva_view_how_it_works','plan-example':'aliva_view_example',sources:'aliva_view_sources','app-preview-title':'aliva_view_app'};
  observer=new window.IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)track(sections[e.target.id],true);},{rootMargin:'-20% 0px -20% 0px',threshold:0});
  for(const id of Object.keys(sections)){const el=document.getElementById(id);if(el)observer.observe(el)}
 }
 function start(){
  if(!production||active||window['disableYaCounter'+COUNTER_ID]===true)return;
  try{
   window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};
   window.ym.l=window.ym.l||Date.now();
   let referrer='';try{const ref=new URL(document.referrer);if(['https:','http:'].includes(ref.protocol))referrer=ref.origin+'/';}catch{}
   active=true;
   window.ym(COUNTER_ID,'init',{ssr:true,webvisor:false,clickmap:true,trackLinks:false,trackHash:false,ecommerce:false,childIframe:false,disableYtm:true,sendTitle:false,accurateTrackBounce:true,url:location.origin+location.pathname,referrer});
   {
    const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js?id='+COUNTER_ID;script.dataset.alivaMetrica='';script.referrerPolicy='origin';
    script.onerror=()=>{active=false;observer?.disconnect();if(window.ym.a)window.ym.a.length=0;script.remove();};
    document.head.append(script);
   }
   observeSections();
  }catch{active=false;}
 }
 window.AlivaAnalytics=Object.freeze({track,goals});
 function mount(){
  start();
  // A generic start event only; no input type, name, value, or conditional step is sent.
  document.querySelector('.card')?.addEventListener('input',()=>track('aliva_questionnaire_start',true));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
