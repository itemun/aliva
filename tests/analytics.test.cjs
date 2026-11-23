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
