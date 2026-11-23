const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const R=require('../src/rules.js');
const base={country:'ru',sex:'male',age:35,smoking:'never',diabetes:'no'};
const plan=patch=>{const p=R.buildPlan({...base,...patch});assert.equal(p.ok,true,JSON.stringify(p.errors));return p};
const item=(patch,id)=>plan(patch).items.find(i=>i.id===id&&!i.upcomingAge);
test('Required inputs and adult boundary are enforced independently of the UI',()=>{
 for(const age of [17,0,121,18.5,'',NaN,Infinity,'<script>',true])assert.equal(R.buildPlan({...base,age}).ok,false);
 assert.equal(plan({age:18}).profile.age,18);assert.equal(plan({age:120}).profile.age,120);
 for(const key of ['sex','smoking','diabetes'])assert.equal(R.buildPlan({...base,[key]:''}).ok,false);
});
test('Unknown optional values never become zero; stale hidden answers are ignored',()=>{
 assert.deepEqual(plan({}).metrics,{bmi:null,waistHeightRatio:null,waistInterpretable:false,packYears:null});
 const p=plan({height:180,weight:90,weightUnknown:true,years:30,cigs:20,quit:6});
 assert.equal(p.metrics.bmi,null);assert.equal(p.metrics.packYears,null);
 assert.equal(plan({height:180,weight:81,waist:90}).metrics.bmi,25);
 assert.equal(plan({height:180,weight:81,waist:90}).metrics.waistHeightRatio,0.5);
});
test('BMI / waist interpretation does not round into eligibility or invent a diagnosis',()=>{
 const below=plan({height:200,weight:99.99,waist:99.99});assert(below.metrics.bmi<25);assert(below.metrics.waistHeightRatio<0.5);
 assert(!item({height:200,weight:99.99,waist:99.99},'measure').reason.includes('Обсудите вес'));
 assert(item({height:200,weight:100,waist:100},'measure').reason.includes('Талия составляет'));
 assert.equal(plan({height:200,weight:140,waist:150}).metrics.waistInterpretable,false);
 assert.equal(plan({height:200,waist:100}).metrics.waistInterpretable,false);
});
test('Program thresholds for ECG, eye pressure and CBC',()=>{
 assert.equal(item({age:34},'ecg').section,'clarify');assert.equal(item({age:35},'ecg').section,'program');
 assert.equal(item({age:39},'iop').section,'clarify');assert.equal(item({age:40},'iop').section,'program');
 assert.equal(item({age:39},'cbc'),undefined);assert(item({age:40},'cbc'));
});
test('Five years without testing is not first-ever or a ten-year / once-only interval',()=>{
 assert.equal(item({age:24},'hcv'),undefined);assert.equal(item({age:25},'hcv').section,'clarify');
 assert.equal(item({age:80},'hcv').section,'clarify');assert.equal(item({age:44},'egd'),undefined);
 assert.equal(item({age:45},'egd').section,'discuss');assert.equal(item({age:46},'egd').section,'clarify');
});
test('Sex and inclusive upper age limits; no automatic stop with unknown cervical history',()=>{
 assert.equal(item({sex:'male',age:45},'breast'),undefined);
 assert.equal(item({sex:'female',age:39},'breast'),undefined);assert(item({sex:'female',age:40},'breast'));
 assert(item({sex:'female',age:75},'breast'));assert.equal(item({sex:'female',age:76},'breast'),undefined);
 assert.equal(item({sex:'female',age:20},'cervical').section,'discuss');assert.equal(item({sex:'female',age:21},'cervical').section,'additional');
 assert(item({sex:'female',age:64},'cervical'));assert(item({sex:'female',age:65},'cervical'));
 assert(item({sex:'female',age:66},'cervical-history'));
 assert.equal(item({age:39},'fit'),undefined);assert(item({age:40},'fit'));assert(item({age:64},'fit').national.repeat.includes('Раз в 2'));
 assert(item({age:65},'fit').national.repeat.includes('Ежегодно'));assert(item({age:75},'fit'));assert.equal(item({age:76},'fit').section,'discuss');
});
test('PSA is a shared decision, not blanket annual screening; missed milestones remain unknown',()=>{
 for(const age of [45,50,55,60,64])assert.equal(item({age},'psa').section,'discuss');
 assert.equal(item({age:46},'psa').section,'clarify');assert.equal(item({age:70},'psa'),undefined);
 assert.equal(item({sex:'female',age:55},'psa'),undefined);
});
test('Known diabetes replaces detection; type 1 duration is not inferred from screening gap',()=>{
 assert(item({},'glucose'));assert.equal(item({},'a1c'),undefined);
 for(const diabetes of ['one','two','other']){
  assert.equal(item({diabetes},'glucose'),undefined);assert(item({diabetes},'a1c'));assert(item({diabetes},'feet'));
 }
 assert.equal(item({diabetes:'two'},'kidney').section,'diabetes');
 assert.equal(item({diabetes:'one'},'kidney').section,'clarify');assert.equal(item({diabetes:'other'},'retina').section,'clarify');
});
test('LDCT uses unrounded pack-years, age 50–80, current or quit less than 15 years',()=>{
 const s={smoking:'current',years:20,cigs:20};
 assert.equal(item({...s,age:49},'ldct'),undefined);assert.equal(item({...s,age:50},'ldct').section,'additional');
 assert(item({...s,age:80},'ldct'));assert.equal(item({...s,age:81},'ldct'),undefined);
 assert.equal(item({...s,age:50,cigs:19.99},'ldct'),undefined);
 assert.equal(plan({...s,age:55,years:40,cigs:10}).metrics.packYears,20);
 assert(item({...s,age:55,smoking:'former',quit:14.99},'ldct'));
 assert.equal(item({...s,age:55,smoking:'former',quit:15},'ldct'),undefined);
 assert.equal(item({...s,age:55,smoking:'never'},'ldct'),undefined);
});
test('Incomplete smoking history is unknown only if no known exclusion applies',()=>{
 const s={age:65,smoking:'former'};
 assert.equal(item({...s},'ldct').section,'clarify');
 assert.equal(item({...s,years:20,cigs:20},'ldct').section,'clarify');
 assert.equal(item({...s,years:10,cigs:1},'ldct'),undefined);
 assert.equal(item({...s,quit:15},'ldct'),undefined);
 assert(item({...s,years:20,cigs:20,quit:0},'ldct'));
});
test('Impossible or inconsistent measurements cannot silently generate a plan',()=>{
 for(const patch of [{height:1.7},{weight:0},{waist:-5},{height:'oops'},{smoking:'current',years:36},{smoking:'former',years:20,quit:20},{smoking:'current',cigs:Infinity}])assert.equal(R.buildPlan({...base,...patch}).ok,false);
});
test('Every adult profile has unique actionable items, source/version and honest conditional handling',()=>{
 for(const sex of ['male','female'])for(let age=18;age<=120;age++)for(const diabetes of ['no','one','two','other']){
  const p=plan({sex,age,diabetes});assert.equal(new Set(p.items.map(x=>x.id)).size,p.items.length);
  for(const i of p.items){for(const key of ['title','reason','when','repeat','detail','locator'])assert(i[key]);for(const ref of i.refs){assert(R.sources[ref].version);assert(R.sources[ref].url.startsWith('https://'));}}
 }
});
test('Deterministic and non-mutating; version goes stale on the review date',()=>{
 const input=Object.freeze({...base,height:180,weight:80});assert.deepEqual(R.buildPlan(input),R.buildPlan(input));
 assert.equal(R.buildPlan(input,'2027-02-28').stale,false);assert.equal(R.buildPlan(input,'2027-03-01').stale,true);
});
test('Delivered file contains the tested engine, stays self-contained and does not persist/transmit answers',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../aliva-landing.html'),'utf8');
 const core=html.match(/<script id="aliva_rules">\n([\s\S]*?)<\/script>/)[1];
 assert.equal(core,fs.readFileSync(path.join(__dirname,'../src/rules.js'),'utf8'));
 const context=vm.createContext({});vm.runInContext(core,context);
 assert.equal(JSON.stringify(context.AlivaRules.buildPlan(base)),JSON.stringify(R.buildPlan(base)));
 const code=[core,fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8')].join('\n');
 assert(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|console\./.test(code));
 assert(!/<(?:script|iframe)[^>]*src=/.test(html));assert(html.includes("connect-src 'none'"));
});
test('Dental examination and vaccination-history review are part of every baseline plan',()=>{
 for(const patch of [{age:18},{age:120},{diabetes:'two',sex:'female'}]){
  assert(item(patch,'dental'));assert(item(patch,'vaccines'));
  assert.equal(item(patch,'vaccines').section,'clarify');
 }
});
test('Optional context routes concerns first without inventing eligibility for scans or extra tests',()=>{
 const before=plan({});
 const after=plan({symptoms:'yes',medicalHistory:'yes',familyHistory:'yes'});
 assert.deepEqual(after.items.slice(0,3).map(x=>x.id),['symptom-review','history-review','family-review']);
 assert.deepEqual(after.items.slice(3),before.items);
 assert.equal(after.context.reviewNeeded,true);assert.equal(after.context.answered,3);
 for(const answer of [undefined,null,'','unsure']){
  const p=plan({symptoms:answer,medicalHistory:answer,familyHistory:answer});
  assert.equal(p.context.answered,0);assert.deepEqual(p.items,before.items);
 }
 assert.equal(plan({symptoms:'no',medicalHistory:'no',familyHistory:'no'}).context.answered,3);
 assert.equal(R.buildPlan({...base,symptoms:'anything'}).ok,false);
});
test('All optional answer combinations stay independent, deterministic and reversible',()=>{
 for(const symptoms of ['yes','no','unsure'])for(const medicalHistory of ['yes','no','unsure'])for(const familyHistory of ['yes','no','unsure']){
  const patch={symptoms,medicalHistory,familyHistory};
  const p=plan(patch);assert.equal(Boolean(p.items.find(i=>i.id==='symptom-review')),symptoms==='yes');
  assert.equal(Boolean(p.items.find(i=>i.id==='history-review')),medicalHistory==='yes');
  assert.equal(Boolean(p.items.find(i=>i.id==='family-review')),familyHistory==='yes');
  assert.deepEqual(p,plan(patch));
 }
 assert.equal(item({symptoms:'no'},'symptom-review'),undefined);
});

test('Country is required: only Russia and Kazakhstan can produce a plan',()=>{
 assert.deepEqual(Object.keys(R.countries),['ru','kz']);
 for(const country of ['',null,undefined,'other','invalid']){
  const result=R.buildPlan({...base,country});assert.equal(result.ok,false);assert.equal(result.errors[0].field,'country');
 }
 for(const country of ['ru','kz'])assert.equal(plan({country}).profile.country,country);
});


const national=(p,id)=>p.items.filter(i=>!i.upcomingAge).map(i=>i.national||(i.layer==='national'?i:null)).filter(Boolean).find(i=>i.id===id);
test('Core criteria are country independent; national methods and intervals are retained once',()=>{
 for(const age of [18,29,35,39,40,45,55,65,74,76,85])for(const sex of ['male','female']){
  const input={age,sex,height:180,weight:83};
  const ru=plan({...input,country:'ru'}),kz=plan({...input,country:'kz'});
  assert.deepEqual(kz.coreItems,ru.coreItems);
  for(const p of [ru,kz])assert.equal(new Set(p.items.map(i=>({'kz-glycemia':'glucose','kz-stool':'fit','kz-lung':'ldct','cervical-history':'cervical'}[i.id]||i.id))).size,p.items.length);
 }
 const kz=plan({country:'kz',sex:'female',age:45});
 const c=kz.items.find(i=>i.id==='cervical');
 assert.match(c.core.repeat,/3 года/);assert.match(c.national.repeat,/4 года/);
 assert.match(c.repeat,/один график/);
 assert(!kz.items.some(i=>['chest','ecg','cbc','gyn','egd'].includes(i.id)));
});
test('Kazakhstan national boundaries survive composition and never imply Russian coverage',()=>{
 for(let age=18;age<=120;age++)for(const sex of ['male','female'])for(const diabetes of ['no','two']){
  const p=plan({country:'kz',age,sex,diabetes,smoking:'current',years:10,cigs:40,symptoms:'yes',medicalHistory:'yes',familyHistory:'yes'});
  const has=id=>!!national(p,id),female=sex==='female';
  for(const id of ['kz-lipids','kz-glycemia','iop'])assert.equal(has(id),age>=40&&age<=76&&diabetes==='no',id+' '+age);
  assert.equal(!!national(p,'breast')?.refs.includes('kz'),female&&age>=40&&age<=76);
  assert.equal(!!national(p,'cervical')?.refs.includes('kz'),female&&age>=30&&age<=74);
  assert.equal(has('kz-stool'),age>=50&&age<=76);
  assert.equal(has('kz-carotid'),!female&&age>=50&&age<=76);
  assert.equal(has('kz-lung'),age>=50&&age<=70);
  assert.equal(p.items.some(i=>i.id==='a1c'),diabetes!=='no');assert(has('kz-hepatitis'));
  assert.deepEqual(p.items.slice(0,3).map(i=>i.id),['symptom-review','history-review','family-review']);
  for(const i of p.items){
   assert(!i.refs.some(k=>['ru','dmru','vaccines'].includes(k)),i.id);
   assert(!/РФ|России|российск|404н|290_2|1122н/.test(JSON.stringify(i)),i.id);
   assert(R.labels[i.section]);for(const key of i.refs)assert(R.sources[key]?.url&&R.sources[key]?.version,key);
  }
 }
});
test('Kazakhstan calendar, eligibility and conflicts stay conditional in the local layer',()=>{
 const q={country:'kz',sex:'female'};
 assert.match(national(plan({...q,age:45}),'breast').when,/пропущенный/);
 assert.match(national(plan({...q,age:46}),'breast').when,/год участия/);
 assert.match(national(plan({...q,age:42}),'cervical').when,/год участия/);
 assert.match(national(plan({...q,age:45}),'cervical').detail,/Даты рождения нет/);
 assert.match(national(plan(q),'visit').detail,/не подтверждает право/);
 assert.match(item({...q,age:40},'kz-lipids').detail,/втором этапе при подозрении/);
 assert.match(national(plan({...q,age:50}),'kz-stool').detail,/положительном/);
 assert.match(item({...q,age:18},'kz-hepatitis').repeat,/3 года/);
 assert.match(item({...q,age:55,sex:'male'},'kz-carotid').detail,/не рекомендует/);
});
test('Lung criteria remain separate: annual international vs two-year local, no duplicate CT',()=>{
 const q={country:'kz',age:55,smoking:'current',years:20,cigs:20};
 const combined=item(q,'ldct');assert.match(combined.core.repeat,/ежегодно/);assert.match(combined.national.repeat,/2 года/);
 assert(!item(q,'kz-lung'));
 for(const patch of [{cigs:19.99},{smoking:'former',quit:15},{smoking:'former',quit:null},{years:null},{smoking:'never'}]){
  const i=national(plan({...q,...patch}),'kz-lung');assert.equal(i.section,'clarify');assert.match(i.detail,/Профессия в анкете не указана/);
 }
 assert(!national(plan({...q,age:49}),'kz-lung'));assert(national(plan({...q,age:70}),'kz-lung'));
 assert(!national(plan({...q,age:71}),'kz-lung'));assert.equal(item({...q,age:71},'ldct').section,'additional');
});
test('Diabetes screening uses exact BMI and age, unknown is a question, known diabetes is follow-up',()=>{
 const core=p=>plan({...p,country:'kz'}).coreItems.find(i=>i.id==='glucose');
 assert(!core({age:34,height:200,weight:100}));assert(core({age:35,height:200,weight:100}));
 assert(!core({age:39,height:200,weight:99.99}));assert(core({age:70,height:200,weight:100}));assert(!core({age:71,height:200,weight:100}));
 assert.equal(core({age:39}).section,'clarify');assert(!core({age:39,height:200,weight:100,diabetes:'two'}));
 for(const country of ['ru','kz'])assert(plan({country,age:39,height:180,weight:82.62}).items.some(i=>i.id==='glucose'&&!i.upcomingAge));
});
test('Next birthday adds future-only entries and merges changed schedules without inventing dates',()=>{
 const kz=plan({country:'kz',age:39,height:180,weight:82.62});
 assert.equal(kz.items.find(i=>i.id==='kz-lipids').upcomingAge,40);
 assert.equal(kz.items.find(i=>i.id==='iop').upcomingAge,40);
 const glucose=kz.items.find(i=>i.id==='glucose');assert(!glucose.upcomingAge);assert.match(glucose.nextAgeNote,/К 40 годам/);assert.match(glucose.nextAgeNote,/Казахстан/);
 const ru=plan({age:39});assert.equal(ru.items.find(i=>i.id==='cbc').upcomingAge,40);assert.match(ru.items.find(i=>i.id==='iop').nextAgeNote,/40/);
 assert.equal(plan({age:64,sex:'female',country:'kz'}).items.find(i=>i.id==='bone').upcomingAge,65);
 const near=plan({age:49,country:'kz',smoking:'current',years:19,cigs:20});assert(!near.items.some(i=>i.id==='ldct')); // no invented extra year of smoking
 assert.equal(plan({age:120}).upcomingCount,0);
});

test('Colorectal screening: age 45 in both countries, national age 40, future entry and upper limits',()=>{
 for(const country of ['ru','kz'])for(const sex of ['male','female']){
  for(const age of [45,50,64,65,75]){
   const p=plan({country,sex,age});const i=p.items.find(i=>i.id==='fit');
   assert(i&&!i.upcomingAge);assert.equal(i.layer,'core');assert.equal(i.title,'Скрининг рака кишечника');
   assert.match((i.core||i).repeat,/10 лет/);assert.match(i.detail,/полного качественного/);assert.match(i.detail,/После положительного FIT нужна колоноскопия/);
   assert.equal(p.items.filter(i=>['fit','kz-stool'].includes(i.id)).length,1);
  }
  for(const age of [76,85])assert.equal(item({country,sex,age},'fit').section,'discuss');
  assert.equal(item({country,sex,age:86},'fit'),undefined);
 }
 const ru42=item({country:'ru',age:42},'fit');assert.equal(ru42.layer,'national');assert.match(ru42.reason,/FIT/);
 assert.equal(item({country:'kz',age:42},'fit'),undefined);
 const ru44=plan({country:'ru',age:44}).items.filter(i=>i.id==='fit');assert.equal(ru44.length,1);assert.match(ru44[0].nextAgeNote,/К 45 годам/);assert.match(ru44[0].nextAgeNote,/10 лет/);
 assert.equal(plan({country:'kz',age:44}).items.find(i=>i.id==='fit').upcomingAge,45);
});


test('AAA: male 65–75, shared across countries, upcoming 65 and no lung-screening thresholds',()=>{
 for(const country of ['ru','kz']){
  for(const smoking of ['current','former']){
   const q={country,sex:'male',smoking,years:1,cigs:1,quit:30};
   for(const age of [65,70,75]){
    const p=plan({...q,age}),i=item({...q,age},'aaa');
    assert(i);assert.equal(i.layer,'core');assert.equal(i.section,'additional');
    assert.deepEqual(i.refs,['aaa']);assert(!i.national);assert.equal(p.items.filter(x=>x.id==='aaa').length,1);
    assert.match(i.repeat,/Однократно/);assert.match(i.detail,/100 сигарет/);
    assert.match(i.detail,/ежегодный повтор автоматически не добавляется/);
    assert.match(i.detail,/При известной аневризме требуется отдельное наблюдение/);
   }
   assert(!plan({...q,age:63}).items.some(i=>i.id==='aaa'));
   assert.equal(plan({...q,age:64}).items.find(i=>i.id==='aaa').upcomingAge,65);
   assert.equal(item({...q,age:64},'aaa'),undefined);
   assert.equal(item({...q,age:76},'aaa'),undefined);
   assert(item({...q,age:65,years:null,cigs:null,quit:null},'aaa'));
   assert(!plan({...q,age:65,sex:'female'}).items.some(i=>i.id==='aaa'));
  }
 }
});
test('AAA: never regularly smoked is not assumed below 100 lifetime cigarettes',()=>{
 for(const country of ['ru','kz']){
  const i=item({country,age:65,smoking:'never'},'aaa');
  assert.equal(i.title,'Обсудить проверку брюшной аорты');assert.equal(i.section,'discuss');
  assert.match(i.repeat,/только по индивидуальному решению, не всем подряд/);
  assert.match(i.detail,/«не курил регулярно» его не исключает/);
  assert.match(i.detail,/УЗИ других органов не подтверждает/);
  assert.match(i.detail,/общее здоровье и возможность лечения/);
 }
});
