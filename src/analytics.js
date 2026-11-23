/* Conversion hooks only. No questionnaire values, identifiers or persistent queue. */
(()=>{
 'use strict';
 // Set this when installing the Yandex Metrica tag. See ANALYTICS.md.
 const COUNTER_ID=0;
 let counterId=COUNTER_ID;
 const goals=Object.freeze(['aliva_app_store_click','aliva_google_play_click','aliva_pdf_download','aliva_example_pdf_download']);
 function track(goal){
  if(!goals.includes(goal))return false;
  try{window.dispatchEvent(new CustomEvent('aliva:conversion',{detail:Object.freeze({goal})}));}catch{}
  try{if(counterId&&typeof window.ym==='function')window.ym(counterId,'reachGoal',goal);}catch{}
  return true;
 }
 function configure(id){counterId=Number.isSafeInteger(id)&&id>0?id:0;}
 window.AlivaAnalytics=Object.freeze({track,configure,goals});
})();
