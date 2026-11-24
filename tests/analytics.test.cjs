const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/analytics.js'),'utf8');
function setup(){
 const events=[],calls=[],window={dispatchEvent:e=>events.push(e),ym:(...args)=>calls.push(args)};
 vm.runInNewContext(source,{window,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}});
 return {api:window.AlivaAnalytics,events,calls,window};
}
test('Conversion hooks are inert without a counter and expose only an allowlisted goal',()=>{
 const {api,events,calls}=setup();
 for(const goal of api.goals)assert.equal(api.track(goal,{age:65,country:'ru'}),true);
 assert.equal(calls.length,0);assert.equal(events.length,4);
 assert(events.every(e=>e.type==='aliva:conversion'&&Object.keys(e.detail).join()==='goal'&&Object.isFrozen(e.detail)));
 assert.equal(api.track('age_65'),false);assert.equal(events.length,4);
 assert(!/localStorage|sessionStorage|cookie|fetch\(|sendBeacon|XMLHttpRequest/.test(source));
});
test('Configured Metrica receives one parameterless reachGoal per action, no replay or failures affecting UI',()=>{
 const {api,events,calls,window}=setup();
 api.track('aliva_pdf_download');api.configure(12345);assert.equal(calls.length,0);
 api.track('aliva_app_store_click');assert.deepEqual(calls,[[12345,'reachGoal','aliva_app_store_click']]);
 for(const invalid of [0,-1,'12345',null,NaN,1.5]){api.configure(invalid);api.track('aliva_pdf_download')}
 assert.equal(calls.length,1);
 api.configure(12345);window.ym=()=>{throw new Error('blocked')};assert.doesNotThrow(()=>api.track('aliva_google_play_click'));
 delete window.ym;assert.doesNotThrow(()=>api.track('aliva_pdf_download'));
 assert.equal(events.at(-1).detail.goal,'aliva_pdf_download');
});
function production(href='https://itemun.github.io/aliva/?private=must-not-send#questionnaire'){
 const events=[],calls=[],scripts=[],location=new URL(href);
 const window={location,dispatchEvent:e=>events.push(e),ym:(...args)=>calls.push(args)};
 const document={referrer:'https://example.org/private-search?q=must-not-send',querySelector:()=>null,createElement:()=>({dataset:{}}),head:{append:s=>scripts.push(s)}};
 const context={window,document,URL,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}}};
 vm.runInNewContext(source,context);
 return {window,document,context,calls,scripts,events};
}
test('Published site loads one counter with recording disabled and sanitized URLs',()=>{
 const {window,context,calls,scripts}=production();
 assert.equal(calls.length,1);assert.equal(calls[0][0],114646189);assert.equal(calls[0][1],'init');
 const opts=calls[0][2];
 for(const key of ['webvisor','clickmap','trackLinks','trackHash','ecommerce','childIframe','sendTitle'])assert.equal(opts[key],false,key);
 assert.equal(opts.disableYtm,true);assert.equal(opts.url,'https://itemun.github.io/aliva/');assert.equal(opts.referrer,'https://example.org/');
 assert(!JSON.stringify(calls).includes('must-not-send'));assert.equal(scripts.length,1);assert.equal(scripts[0].src,'https://mc.yandex.ru/metrika/tag.js?id=114646189');
 assert.equal(scripts[0].async,true);assert.equal(scripts[0].referrerPolicy,'origin');
 vm.runInNewContext(source,context);assert.equal(calls.length,1);assert.equal(scripts.length,1);
 for(const goal of window.AlivaAnalytics.goals)window.AlivaAnalytics.track(goal,{diabetes:'two',age:65});
 assert.deepEqual(calls.slice(1),Array.from(window.AlivaAnalytics.goals,goal=>[114646189,'reachGoal',goal]));
});
test('Local files, previews and other sites do not load the counter',()=>{
 for(const url of ['file:///tmp/index.html','http://127.0.0.1:8770/aliva-concept-function.html','https://example.org/aliva/','https://itemun.github.io/another/','https://itemun.github.io/aliva-other/']){
  const {window,calls,scripts}=production(url);window.AlivaAnalytics.track('aliva_pdf_download');assert.equal(calls.length,0,url);assert.equal(scripts.length,0,url);
 }
});
test('A blocked tag disables delivery without breaking conversions or application code',()=>{
 const {window,calls,scripts,events}=production();scripts[0].onerror();
 assert.doesNotThrow(()=>window.AlivaAnalytics.track('aliva_pdf_download'));
 assert.equal(calls.length,1);assert.equal(events.length,1);
});
