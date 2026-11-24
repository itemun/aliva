const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/analytics.js'),'utf8');
function setup(url='https://itemun.github.io/aliva/?private=must-not-send#questionnaire'){
 const events=[],calls=[],scripts=[],stored=new Map(),listeners={};
 const window={location:new URL(url),dispatchEvent:e=>events.push(e),ym:(...args)=>calls.push(args),localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},addEventListener:(k,f)=>listeners[k]=f};
 const document={readyState:'loading',referrer:'https://example.org/search?q=must-not-send',getElementById:()=>null,addEventListener:(k,f)=>listeners[k]=f,createElement:()=>({dataset:{},remove(){}}),head:{append:s=>scripts.push(s)}};
 const context={window,document,URL,Date,Set,setTimeout:()=>1,clearTimeout:()=>{},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}}};
 vm.runInNewContext(source,context);
 return {api:window.AlivaAnalytics,window,document,context,events,calls,scripts,stored,listeners};
}
test('Before consent and after refusal no script, goals, or retrospective queue exists',()=>{
 const {api,calls,scripts,events,stored}=setup();
 for(const goal of api.goals)assert.equal(api.track(goal),false);
 assert.equal(scripts.length,0);assert.equal(events.length,0);assert.equal(calls.length,0);
 api.choose('denied');assert.equal(scripts.length,0);assert.equal(calls.length,0);
 api.choose('granted');assert.deepEqual(calls.map(c=>c[1]),['init']);
 assert.equal(stored.size,1);const pref=JSON.parse([...stored.values()][0]);assert.deepEqual(Object.keys(pref).sort(),['choice','expires','version']);
});
test('Consent loads one tag, masks URLs, enables only public click map, excludes health payloads',()=>{
 const {api,context,calls,scripts}=setup();api.choose('granted');api.choose('granted');vm.runInNewContext(source,context);
 assert.equal(scripts.length,1);assert.equal(calls.length,1);assert.equal(calls[0][0],114646189);
 const opts=calls[0][2];assert.equal(opts.clickmap,true);
 for(const key of ['webvisor','trackLinks','trackHash','ecommerce','childIframe','sendTitle'])assert.equal(opts[key],false,key);
 assert.equal(opts.disableYtm,true);assert.equal(opts.url,'https://itemun.github.io/aliva/');assert.equal(opts.referrer,'https://example.org/');
 assert(!JSON.stringify(calls).includes('must-not-send'));
 for(const goal of api.goals)assert.equal(api.track(goal,{age:65,diabetes:'two'}),true);
 assert.deepEqual(calls.slice(1),Array.from(api.goals,goal=>[114646189,'reachGoal',goal]));assert.equal(api.track('smoking_former'),false);
});
test('Funnel steps deduplicate; separate downloads remain separate; revoke stops collection immediately',()=>{
 const {api,calls,window,events}=setup();api.choose('granted');
 api.track('aliva_plan_ready',true);api.track('aliva_plan_ready',true);api.track('aliva_pdf_download');api.track('aliva_pdf_download');
 assert.equal(events.length,3);api.choose('denied');assert.equal(window.disableYaCounter114646189,true);assert.equal(calls.at(-1)[1],'destruct');
 const n=calls.length;assert.equal(api.track('aliva_pdf_download'),false);assert.equal(calls.length,n);
 api.choose('granted');assert.equal(window.disableYaCounter114646189,false);assert.equal(calls.at(-1)[1],'init');
});
test('Local files and other hosts stay inert even with consent; blocked storage/tag do not throw',()=>{
 for(const url of ['file:///tmp/index.html','http://127.0.0.1:8770/','https://example.org/aliva/','https://itemun.github.io/other/']){
  const {api,calls,scripts}=setup(url);api.choose('granted');api.track('aliva_pdf_download');assert.equal(calls.length,0);assert.equal(scripts.length,0);
 }
 const {api,window,calls,scripts}=setup();window.localStorage.setItem=()=>{throw Error('blocked')};assert.doesNotThrow(()=>api.choose('granted'));scripts[0].onerror();
 assert.equal(api.track('aliva_pdf_download'),false);assert.equal(calls.length,1);
});
test('No health-dependent or arbitrary field event is in the allowlist; protected card stays excluded',()=>{
 const {api}=setup();assert(!api.goals.some(g=>/smoking|diabetes|country|age|sex|weight|waist|years|quit|refin/.test(g)));
 const html=fs.readFileSync(path.join(__dirname,'../src/landing.template.html'),'utf8');assert(html.includes('card ym-hide-content ym-disable-clickmap ym-disable-submit ym-disable-keys'));
 assert(!/\.value\b|FormData|userParams|setUserID|firstPartyParams/.test(source));
});
