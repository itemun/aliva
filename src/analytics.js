/* Visits and four allowlisted conversions; never read questionnaire values. */
(()=>{
 'use strict';
 if(window.AlivaAnalytics)return;
 const COUNTER_ID=114646189;
 let counterId=0;
 const goals=Object.freeze(['aliva_app_store_click','aliva_google_play_click','aliva_pdf_download','aliva_example_pdf_download']);
 function track(goal){
  if(!goals.includes(goal))return false;
  try{window.dispatchEvent(new CustomEvent('aliva:conversion',{detail:Object.freeze({goal})}));}catch{}
  try{if(counterId&&typeof window.ym==='function')window.ym(counterId,'reachGoal',goal);}catch{}
  return true;
 }
 function configure(id){counterId=Number.isSafeInteger(id)&&id>0?id:0;}
 window.AlivaAnalytics=Object.freeze({track,configure,goals});
 // Local previews and downloaded HTML must not pollute production statistics.
 const location=window.location;
 if(location?.protocol!=='https:'||location.hostname!=='itemun.github.io'||!/^\/aliva(?:\/|$)/.test(location.pathname))return;
 try{
  window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};
  window.ym.l=window.ym.l||Date.now();
  let referrer='';
  try{const ref=new URL(document.referrer);if(['https:','http:'].includes(ref.protocol))referrer=ref.origin+'/';}catch{}
  counterId=COUNTER_ID;
  window.ym(counterId,'init',{
   ssr:true,webvisor:false,clickmap:false,trackLinks:false,trackHash:false,
   ecommerce:false,childIframe:false,disableYtm:true,sendTitle:false,
   accurateTrackBounce:true,
   // Query strings, hashes and referrer search terms are not sent.
   url:location.origin+location.pathname,referrer
  });
  if(!document.querySelector('script[data-aliva-metrica]')){
   const script=document.createElement('script');
   script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js?id='+counterId;
   script.dataset.alivaMetrica='';script.referrerPolicy='origin';
   script.onerror=()=>{counterId=0;if(window.ym.a)window.ym.a.length=0;};
   document.head.append(script);
  }
 }catch{counterId=0;}
})();
