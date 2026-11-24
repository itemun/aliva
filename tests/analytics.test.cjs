const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/analytics.js'),'utf8');
function setup(url='https://itemun.github.io/aliva/?private=must-not-send#questionnaire',disabled=false){
 const events=[],calls=[],scripts=[],listeners={};
 const window={location:new URL(url),dispatchEvent:e=>events.push(e),ym:(...args)=>calls.push(args),disableYaCounter114646189:disabled};
 Object.defineProperty(window,'localStorage',{get(){throw Error('Analytics must not use storage')}});
 const card={addEventListener:(k,f)=>listeners[k]=f};
 const document={readyState:'loading',referrer:'https://example.org/search?q=must-not-send',getElementById:()=>null,querySelector:s=>s==='.card'?card:null,addEventListener:(k,f)=>listeners[k]=f,createElement:tag=>{assert.equal(tag,'script');return {dataset:{},remove(){this.removed=true}}},head:{append:s=>scripts.push(s)}};
 const context={window,document,URL,Date,Set,CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}}};
 vm.runInNewContext(source,context);
 listeners.DOMContentLoaded();
 return {api:window.AlivaAnalytics,window,document,context,events,calls,scripts,listeners};
}
test('Production starts automatically once without consent UI, settings or browser storage',()=>{
 const {api,context,calls,scripts,listeners}=setup();
 assert.equal(scripts.length,1);assert.deepEqual(calls.map(c=>c[1]),['init']);
 assert.equal(api.choose,undefined);assert.equal(api.showSettings,undefined);
 vm.runInNewContext(source,context);assert.equal(scripts.length,1);assert.equal(calls.length,1);
 listeners.input();listeners.input();assert.equal(calls.filter(c=>c[2]==='aliva_questionnaire_start').length,1);
 const html=fs.readFileSync(path.join(__dirname,'../src/landing.template.html'),'utf8');
 const sections=fs.readFileSync(path.join(__dirname,'../concepts/function/sections.html'),'utf8');
 assert(!/analytics-consent|analytics-settings|Настройки аналитики/.test(source+html+sections));
});
test('Automatic counter masks URLs, enables only public click map, excludes health payloads',()=>{
 const {api,calls}=setup();assert.equal(calls[0][0],114646189);
 const opts=calls[0][2];assert.equal(opts.clickmap,true);
 for(const key of ['webvisor','trackLinks','trackHash','ecommerce','childIframe','sendTitle'])assert.equal(opts[key],false,key);
 assert.equal(opts.disableYtm,true);assert.equal(opts.url,'https://itemun.github.io/aliva/');assert.equal(opts.referrer,'https://example.org/');
 assert(!JSON.stringify(calls).includes('must-not-send'));
 for(const goal of api.goals)assert.equal(api.track(goal,{age:65,diabetes:'two'}),true);
 assert.deepEqual(calls.slice(1),Array.from(api.goals,goal=>[114646189,'reachGoal',goal]));assert.equal(api.track('smoking_former'),false);
});
test('Funnel steps deduplicate, separate downloads stay separate, external opt-out is respected',()=>{
 const {api,calls,window,events}=setup();
 api.track('aliva_plan_ready',true);api.track('aliva_plan_ready',true);api.track('aliva_pdf_download');api.track('aliva_pdf_download');
 assert.equal(events.length,3);
 window.disableYaCounter114646189=true;const n=calls.length;
 assert.equal(api.track('aliva_pdf_download'),false);assert.equal(calls.length,n);
 const disabled=setup('https://itemun.github.io/aliva/',true);
 assert.equal(disabled.scripts.length,0);assert.equal(disabled.calls.length,0);assert.equal(disabled.api.track('aliva_pdf_download'),false);
});
test('Local files and other hosts stay inert; tag failures leave the application functional',()=>{
 for(const url of ['file:///tmp/index.html','http://127.0.0.1:8770/','https://example.org/aliva/','https://itemun.github.io/other/','http://itemun.github.io/aliva/']){
  const {api,calls,scripts}=setup(url);api.track('aliva_pdf_download');assert.equal(calls.length,0);assert.equal(scripts.length,0);
 }
 const {api,calls,scripts}=setup();assert.doesNotThrow(()=>scripts[0].onerror());
 assert.equal(scripts[0].removed,true);assert.equal(api.track('aliva_pdf_download'),false);assert.equal(calls.length,1);
});
test('No health-dependent or arbitrary field event is in the allowlist; protected card stays excluded',()=>{
 const {api}=setup();assert(!api.goals.some(g=>/smoking|diabetes|country|age|sex|weight|waist|years|quit|refin/.test(g)));
 const html=fs.readFileSync(path.join(__dirname,'../src/landing.template.html'),'utf8');assert(html.includes('card ym-hide-content ym-disable-clickmap ym-disable-submit ym-disable-keys'));
 assert(!/\.value\b|FormData|userParams|setUserID|firstPartyParams/.test(source));
});
