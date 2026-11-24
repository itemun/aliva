const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
global.AlivaBrand=require(base+'/pdf-brand.cjs')();
global.PDFLib=require(base+'/vendor/pdf-lib-1.17.1.min.js');
global.fontkit=require(base+'/vendor/fontkit-1.1.1.min.js');
global.AlivaFonts=Object.fromEntries([['regular','Regular'],['bold','Bold']].map(([k,v])=>[k,fs.readFileSync(base+`/vendor/LiberationSans-${v}.ttf`).toString('base64')]));
const R=require(base+'/src/rules.js'),PDF=require(base+'/src/pdf.js');
const basic={country:'ru',sex:'female',age:45,height:165,weight:68,waist:85,smoking:'never',diabetes:'no'};
test('Every rule has a purpose, including optional routes and age/diabetes variants',()=>{
 const seen=new Set();
 for(const smoking of ['never','current'])for(const weight of [55,85])for(const country of ['ru','kz'])for(let age=18;age<=120;age++)for(const sex of ['male','female'])for(const diabetes of ['no','one','two','other']){
  const p=R.buildPlan({...basic,weight,country,sex,age,diabetes,smoking,years:10,cigs:40,symptoms:'yes',medicalHistory:'yes',familyHistory:'yes'});
  for(const i of p.items){assert(PDF.purposes[i.id],i.id);seen.add(i.id)}
 }
 assert.equal(seen.size,Object.keys(PDF.purposes).length);
});
test('PDF has one first-page link per actual recommendation, with valid page destinations and source URLs',async()=>{
 for(const profile of [{...basic,age:64,diabetes:'two',smoking:'current',years:40,cigs:20,symptoms:'yes',medicalHistory:'yes',familyHistory:'yes'},{...basic,country:'kz',sex:'male',age:39},{...basic,country:'kz'},{...basic,country:'kz',age:65,sex:'male',smoking:'current',years:40,cigs:20,symptoms:'yes',medicalHistory:'yes',familyHistory:'yes'},{...basic,country:'kz',age:76,diabetes:'two'},basic,{...basic,age:65,diabetes:'two',smoking:'current',years:40,cigs:20,symptoms:'yes',medicalHistory:'yes',familyHistory:'yes'},{country:'ru',sex:'male',age:50,diabetes:'other',smoking:'former'}]){
  const plan=R.buildPlan(profile),before=JSON.stringify(plan);
  const bytes=await PDF.create(plan,{example:true});assert.equal(JSON.stringify(plan),before);
  const doc=await PDFLib.PDFDocument.load(bytes),pages=doc.getPages();assert(pages.length>3);
  const links=pages[0].node.Annots();assert.equal(links.size(),plan.items.length+1);
  const refs=new Set(pages.map(p=>p.ref.toString()));
  for(let i=0;i<links.size();i++){
   const a=doc.context.lookup(links.get(i));
   const dest=a.get(PDFLib.PDFName.of('Dest')).get(0).toString();assert(refs.has(dest));assert.notEqual(dest,pages[1].ref.toString());
  }
  const glossaryDest=doc.context.lookup(links.get(plan.items.length)).get(PDFLib.PDFName.of('Dest')).get(0).toString();
  const glossaryIndex=pages.findIndex(page=>page.ref.toString()===glossaryDest);
  assert(glossaryIndex>1);
  const glossaryUrls=pages.slice(glossaryIndex).flatMap(page=>(page.node.Annots()?.asArray()??[]).map(ref=>doc.context.lookup(ref).get(PDFLib.PDFName.of('A'))).filter(Boolean).map(a=>a.get(PDFLib.PDFName.of('URI')).decodeText()));
  for(const organization of PDF.glossaryOrganizations)assert(glossaryUrls.includes(organization.url));
  const vaccineIndex=plan.items.findIndex(item=>item.id==='vaccines');
  const vaccineDest=doc.context.lookup(links.get(vaccineIndex)).get(PDFLib.PDFName.of('Dest')).get(0).toString();
  const vaccinePage=pages.find(page=>page.ref.toString()===vaccineDest);
  const vaccineUrls=vaccinePage.node.Annots().asArray().map(ref=>doc.context.lookup(ref).get(PDFLib.PDFName.of('A')).get(PDFLib.PDFName.of('URI')).decodeText());
  assert(vaccineUrls.includes(PDF.educationSources.flu.url));
  const ownCountry=profile.country==='kz'?'kzVaccines':'vaccines';
  const otherCountry=profile.country==='kz'?'vaccines':'kzVaccines';
  assert(vaccineUrls.includes(R.sources[ownCountry].url));
  assert(!vaccineUrls.includes(R.sources[otherCountry].url));
  for(let i=0;i<links.size();i++)if(i!==vaccineIndex){
   assert.notEqual(doc.context.lookup(links.get(i)).get(PDFLib.PDFName.of('Dest')).get(0).toString(),vaccineDest,'Vaccination has a dedicated page');
  }
  const whoLinks=pages[1].node.Annots().asArray().map(ref=>doc.context.lookup(ref).get(PDFLib.PDFName.of('A')).get(PDFLib.PDFName.of('URI')).decodeText());
  for(const key of ['activity','diet','tobacco','alcohol'])assert(whoLinks.includes(PDF.educationSources[key].url));
  const uris=[];for(const page of pages)for(const ref of page.node.Annots()?.asArray()??[]){
   const a=doc.context.lookup(ref).get(PDFLib.PDFName.of('A'));
   if(a)uris.push(a.get(PDFLib.PDFName.of('URI')).decodeText());
  }
  for(const key of new Set(plan.items.flatMap(i=>i.refs)))assert(uris.includes(R.sources[key].url));
  assert(!uris.some(u=>u.includes('#feedback')));
  assert(!uris.some(u=>u.startsWith('mailto:')||/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(u)));
  assert(!uris.some(u=>u.includes('&body='))); // PDF does not include health answers in email links.
 }
});
test('Expired rules still export with a warning; invalid plans are rejected',async()=>{
 await assert.rejects(()=>PDF.create({ok:false}));
 const bytes=await PDF.create(R.buildPlan(basic,'2027-03-01'));assert(bytes.length>10000);
 const dense=R.buildPlan({...basic,age:64,diabetes:'two',smoking:'current',years:40,cigs:20,symptoms:'yes',medicalHistory:'yes',familyHistory:'yes'},'2027-03-01');
 assert((await PDF.create(dense)).length>10000);
});
test('Export stays inline/offline with no feedback destination',()=>{
 const source=fs.readFileSync(base+'/src/pdf.js','utf8');
 assert(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(source));
 const html=fs.readFileSync(base+'/aliva-landing.html','utf8');
 for(const marker of ['aliva_pdf','aliva_rules','aliva_app']){
  const script=html.match(new RegExp('<script id="'+marker+'">\\n([\\s\\S]*?)<\\/script>'))[1];
  new vm.Script(script);assert.equal(script,fs.readFileSync(base+'/src/'+marker.replace('aliva_','')+'.js','utf8'));
 }
 const app=fs.readFileSync(base+'/src/app.js','utf8');
 assert(!/mailto:|feedbackEmail|feedbackText|openFeedbackLink/.test(app));
 assert(!/<(?:script|iframe)[^>]*src=/.test(html));assert.equal(html.match(/connect-src ([^;]+)/)[1],'https://mc.yandex.ru https://mc.yandex.com https://mc.yandex.kz');
});


test('Embedded PDF fonts retain Kazakh letters in official source identifiers',()=>{
 for(const weight of ['Regular','Bold']){
  const font=fontkit.create(fs.readFileSync(base+`/vendor/LiberationSans-${weight}.ttf`));
  for(const char of 'ҚР ДСМ-174/2020')assert(font.hasGlyphForCodePoint(char.codePointAt(0)),char);
 }
});

test('Age discussion priorities use current items, preserve plans and respect clinical routes',()=>{
 for(const country of ['ru','kz'])for(const sex of ['male','female'])for(let age=18;age<=120;age++){
  const p=R.buildPlan({...basic,country,sex,age}),before=JSON.stringify(p),g=PDF.ageGuidance(p);
  assert.equal(JSON.stringify(p),before);assert(g.priorities.length<=3&&g.priorities.length>0);
  assert.equal(new Set(g.priorities.map(e=>e.id)).size,g.priorities.length);
  for(const e of g.priorities){assert(e.body&&e.short);assert(p.items.some(i=>i.id===e.id&&!i.upcomingAge));}
  for(const notes of Object.values(g.notes))for(const n of notes)for(const ref of n.refs)assert(R.sources[ref]||PDF.educationSources[ref],ref);
 }
 const g=profile=>PDF.ageGuidance(R.buildPlan({...basic,sex:'male',age:62,...profile}));
 assert.deepEqual(g({}).priorities.map(e=>e.id),['bp','fit','psa']);
 assert.equal(g({symptoms:'yes',diabetes:'two',smoking:'current',years:40,cigs:20}).priorities[0].id,'symptom-review');
 assert.equal(g({medicalHistory:'yes'}).priorities[0].id,'history-review');
 assert.equal(g({diabetes:'two'}).priorities[0].id,'dm-review');
 assert(g({age:39}).notes.bp===undefined);
 assert(g({age:40}).notes.bp.some(n=>n.refs.includes('cardiovascular')));
 assert(!g({age:39}).priorities.some(e=>e.id==='fit'));
 assert(g({age:76}).notes.visit.some(n=>n.body.includes('После 75 лет')));
 assert(g({age:76}).notes.bp.some(n=>n.body.includes('не основание самостоятельно отменять')));
});

test('Female explanations preserve uncertainty, country context and upper-age review',()=>{
 const g=(age,country='ru')=>PDF.ageGuidance(R.buildPlan({...basic,age,country}));
 assert(g(62).notes.visit.some(n=>n.body.startsWith('Если менопауза уже наступила')));
 assert(!R.buildPlan({...basic,age:62}).items.some(i=>i.id==='bone'));
 assert(g(65).notes.bone.some(n=>n.body.includes('С 65 лет')));
 assert(!g(65).notes.visit?.some(n=>n.body.startsWith('Если менопауза')));
 assert(g(66,'kz').notes['cervical-history'].some(n=>n.body.includes('до 74 лет')));
 assert(g(66).notes['cervical-history'].some(n=>n.body.includes('до 64 лет')));
 assert(g(75).notes.breast.some(n=>n.body.includes('недостаточно')));
 assert(g(76).notes.visit.some(n=>n.body.startsWith('Маммография:')));
 assert(g(76,'kz').notes.breast.some(n=>n.body.includes('недостаточно')));
 assert(g(77,'kz').notes.visit.some(n=>n.body.startsWith('Маммография:')));
});

test('Public example always uses the current engine and PDF, shared synthetic profile, and requested date',async()=>{
 global.AlivaRules=R;const example=require('../src/example.js');
 const p=example.build('2026-11-24'),before=JSON.stringify(example.profile);
 assert.deepEqual(p,R.buildPlan({...basic},'2026-11-24'));assert.equal(p.version,R.VERSION);assert(Object.isFrozen(example.profile));
 const doc=await PDFLib.PDFDocument.load(await PDF.create(p,{example:true}));assert.match(doc.getTitle(),/пример/);assert.equal(JSON.stringify(example.profile),before);
 const interactions=fs.readFileSync(base+'/concepts/function/interactions.js','utf8');assert(interactions.includes('const example=AlivaExample.build()'));assert(interactions.includes('AlivaPDF.create(example,{example:true})'));
 assert(fs.readFileSync(base+'/src/app.js','utf8').includes('const sample=AlivaExample.profile'));
});
