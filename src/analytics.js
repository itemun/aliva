/* Consent-gated analytics. Never read questionnaire values or record its branches. */
(()=>{
 'use strict';
 if(window.AlivaAnalytics)return;
 const COUNTER_ID=114646189,KEY='aliva.analytics-consent.v2',MAX_AGE=180*86400000;
 const goals=Object.freeze(['aliva_app_store_click','aliva_google_play_click','aliva_pdf_download','aliva_example_pdf_download','aliva_questionnaire_open','aliva_questionnaire_start','aliva_profile_complete','aliva_measurements_complete','aliva_plan_ready','aliva_view_how_it_works','aliva_view_example','aliva_view_sources','aliva_view_app']);
 const location=window.location,production=location?.protocol==='https:'&&location.hostname==='itemun.github.io'&&/^\/aliva(?:\/|$)/.test(location.pathname);
 const seen=new Set();let consent=null,active=false,loaded=false,observer=null,expiryTimer=null;
 // The only stored first-party value is this preference, version and expiry; no answers.
 function readChoice(){try{const v=JSON.parse(window.localStorage.getItem(KEY));return v?.version===2&&['granted','denied'].includes(v.choice)&&v.expires>Date.now()&&v.expires<=Date.now()+MAX_AGE? v:null;}catch{return null}}
 function track(goal,once=false){
  if(!goals.includes(goal)||consent!=='granted'||!active||!production)return false;
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
  if(!production||active||consent!=='granted')return;
  try{
   window['disableYaCounter'+COUNTER_ID]=false;
   window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};
   window.ym.l=window.ym.l||Date.now();
   let referrer='';try{const ref=new URL(document.referrer);if(['https:','http:'].includes(ref.protocol))referrer=ref.origin+'/';}catch{}
   active=true;
   window.ym(COUNTER_ID,'init',{ssr:true,webvisor:false,clickmap:true,trackLinks:false,trackHash:false,ecommerce:false,childIframe:false,disableYtm:true,sendTitle:false,accurateTrackBounce:true,url:location.origin+location.pathname,referrer});
   if(!loaded){
    loaded=true;const script=document.createElement('script');script.async=true;script.src='https://mc.yandex.ru/metrika/tag.js?id='+COUNTER_ID;script.dataset.alivaMetrica='';script.referrerPolicy='origin';
    script.onerror=()=>{active=false;loaded=false;observer?.disconnect();if(window.ym.a)window.ym.a.length=0;script.remove();};
    document.head.append(script);
   }
   observeSections();
  }catch{active=false;}
 }
 function stop(){
  const wasActive=active;active=false;observer?.disconnect();observer=null;
  window['disableYaCounter'+COUNTER_ID]=true;
  try{if(window.ym?.a)window.ym.a.length=0;if(wasActive&&typeof window.ym==='function')window.ym(COUNTER_ID,'destruct');}catch{}
 }
 function scheduleExpiry(expires){
  clearTimeout(expiryTimer);
  expiryTimer=setTimeout(()=>{if(Date.now()<expires){scheduleExpiry(expires);return}consent=null;stop();showSettings();},Math.min(Math.max(0,expires-Date.now()),2147483647));
 }
 function choose(choice,persist=true){
  if(!['granted','denied'].includes(choice))return;
  consent=choice;clearTimeout(expiryTimer);
  const expires=Date.now()+MAX_AGE;
  if(persist)try{window.localStorage.setItem(KEY,JSON.stringify({version:2,choice,expires}));}catch{}
  if(choice==='granted')start();else stop();
  document.getElementById('analytics-consent')?.setAttribute('hidden','');
  scheduleExpiry(expires);
 }
 function showSettings(){const panel=document.getElementById('analytics-consent');if(panel){panel.hidden=false;document.getElementById('analytics-consent-title')?.focus({preventScroll:true})}}
 window.AlivaAnalytics=Object.freeze({track,goals,choose,showSettings,get consent(){return consent}});
 // Opt-out is set before the external tag can load. No pre-consent event queue.
 window['disableYaCounter'+COUNTER_ID]=true;
 function mount(){
  const panel=document.createElement('section');panel.id='analytics-consent';panel.className='analytics-consent ym-hide-content ym-disable-clickmap';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','analytics-consent-title');
  panel.innerHTML='<h2 id="analytics-consent-title" tabindex="-1">Помогите сделать Aliva удобнее</h2><p>С Вашего согласия Яндекс Метрика использует cookie и технические данные, чтобы измерять посещения, клики вне анкеты и общие этапы получения плана. Ответы о здоровье, содержимое PDF и запись экрана не передаются. Отказ не ограничивает анкету и скачивание.</p><p class="analytics-details"><button type="button" data-analytics-details>Подробнее о данных</button> · Выбор можно изменить внизу сайта.</p><div class="analytics-buttons"><button type="button" id="analytics-allow">Разрешить аналитику</button><button type="button" id="analytics-deny">Отказаться</button></div>';
  document.body.append(panel);
  document.getElementById('analytics-allow').addEventListener('click',()=>choose('granted'));
  document.getElementById('analytics-deny').addEventListener('click',()=>choose('denied'));
  panel.querySelector('[data-analytics-details]').addEventListener('click',()=>{panel.hidden=true;document.getElementById('privacy')?.click();document.querySelector('.card')?.scrollIntoView({block:'start'});});
  document.querySelectorAll('[data-analytics-settings]').forEach(el=>el.addEventListener('click',showSettings));
  // A generic start event only; no input type, name, value, or conditional step is sent.
  document.querySelector('.card')?.addEventListener('input',()=>track('aliva_questionnaire_start',true));
  const saved=readChoice();if(saved){choose(saved.choice,false);scheduleExpiry(saved.expires);}else if(production)panel.hidden=false;
  window.addEventListener('storage',e=>{if(e.key===KEY){const v=readChoice();if(v)choose(v.choice,false);else{consent=null;stop();showSettings()}}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
