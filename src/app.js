(()=>{
'use strict';
const $=id=>document.getElementById(id);
const data={country:'',sex:'',age:'',height:'',weight:'',waist:'',smoking:'',years:'',cigs:'',quit:'',diabetes:'',symptoms:null,medicalHistory:null,familyHistory:null};
let step='profile',overlay=null,resultPage=0,returnStep='profile',plan=null,resultTab='main',isExample=false,contentsPage=0,refineStep=0,refineDraft={};
let pdfBusy=false,pdfRequested=false;
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stages=()=>['profile','measurements','smoking',...(data.smoking&&data.smoking!=='never'?['years','cigs',...(data.smoking==='former'?['quit']:[])]:[]),'diabetes'];
const names={profile:'О Вас',measurements:'Ваши измерения',smoking:'О здоровье',years:'О курении',cigs:'О курении',quit:'О курении',diabetes:'Последний вопрос'};
const radio=(name,value,label)=>`<label class="option"><input type="radio" name="${name}" value="${value}" ${data[name]===value?'checked':''}><span>${label}</span></label>`;
const number=(name,label,unit,placeholder,min=0,required=false)=>`<label class="field" for="${name}"><span>${label}</span><span class="input-box"><input id="${name}" name="${name}" type="number" inputmode="${name==='age'?'numeric':'decimal'}" min="${min}" ${name==='age'?'max="120" step="1"':`max="${AlivaRules.limits[name]?.[1]??120}" step="any"`} ${required?'required':''} value="${data[name]}" placeholder="${placeholder}" autocomplete="off"><span>${unit}</span></span></label>`;
const heading=(title,sub='')=>`<div class="heading"><h2>${title}</h2>${sub?`<p class="subtitle">${sub}</p>`:''}</div>`;
const measurement=(key,label,unit,placeholder)=>`<div class="measurement-row"><div class="field-name"><label for="${key}">${label}</label>${key==='waist'?'<button class="help" id="waist-help" aria-label="Как измерить окружность талии">?</button>':''}</div><div class="input-box"><input id="${key}" name="${key}" type="number" inputmode="decimal" step="any" min="${AlivaRules.limits[key][0]}" max="${AlivaRules.limits[key][1]}" value="${data[key]}" placeholder="${placeholder}" autocomplete="off" required><span>${unit}</span></div></div>`;
const measurementIssue=values=>{
 for(const [key,label] of [['height','рост'],['weight','вес'],['waist','окружность талии']]){
  const value=values[key],n=Number(value),[min,max]=AlivaRules.limits[key];
  if(value===null||value===undefined||String(value).trim()==='')return {field:key,message:`Укажите ${label}, чтобы продолжить.`};
  if(!Number.isFinite(n)||n<min||n>max)return {field:key,message:`Проверьте ${label}: допустимо от ${min} до ${max}.`};
 }
 return null;
};
const sample={country:'ru',sex:'female',age:45,height:165,weight:68,waist:85,smoking:'never',diabetes:'no'};
const refinementQuestions=[
 {key:'symptoms',title:'Есть ли сейчас жалобы?',sub:'Беспокоящие симптомы важно обсудить отдельно от профилактики.'},
 {key:'medicalHistory',title:'Есть ли важная история здоровья?',sub:'Другие хронические болезни, постоянные лекарства или отклонения в прошлых обследованиях. Диабет мы уже учли.'},
 {key:'familyHistory',title:'Что известно о близких?',sub:'У родителей, братьев или сестёр были инфаркт или инсульт в молодом возрасте либо рак в любом возрасте?'}
];
function startRefinement(){refineDraft=Object.fromEntries(refinementQuestions.map(q=>[q.key,data[q.key]]));refineStep=0;overlay='refine';render()}
function contentsHTML(){
 const entries=[{title:'Обзор плана'},...plan.items],pages=Math.ceil(entries.length/3);
 const rows=entries.slice(contentsPage*3,contentsPage*3+3).map((item,i)=>{const n=contentsPage*3+i;return `<button class="contents-item" data-result-page="${n}" ${n===resultPage?'aria-current="step"':''}><span>${n||'•'}</span><span>${escape(item.title)}</span><span aria-hidden="true">→</span></button>`}).join('');
 return heading('Все пункты плана','Выберите пункт — название показано целиком.')+`<div class="contents-list">${rows}</div><div class="contents-pager"><button id="contents-prev" aria-label="Предыдущая страница списка" ${contentsPage===0?'disabled':''}>←</button><span>${contentsPage+1} / ${pages}</span><button id="contents-next" aria-label="Следующая страница списка" ${contentsPage===pages-1?'disabled':''}>→</button></div>`;
}
const localDate=()=>{const t=new Date();return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`};
function calculate(example=false){
 const missing=!example&&measurementIssue(data);
 if(missing){overlay=null;step='measurements';render();fail(missing.message,$(missing.field));return}
 const calculated=AlivaRules.buildPlan(example?sample:data,localDate());
 if(!calculated.ok){const e=calculated.errors[0];const fields={country:'profile',age:'profile',sex:'profile',height:'measurements',weight:'measurements',waist:'measurements',smoking:'smoking',years:'years',cigs:'cigs',quit:'quit',diabetes:'diabetes'};overlay=null;step=fields[e.field];render();fail(e.message,$(e.field));return}
 plan=calculated;isExample=example;pdfRequested=false;showOverlay('result');
}
function resultHTML(){
 const r=resultPage?plan.items[resultPage-1]:null;
 const tabs=`<div class="result-tabs" role="group" aria-label="Информация о пункте">${[['main','План'],['details','Важно'],['source','Источник']].map(([key,title])=>`<button type="button" id="tab-${key}" data-result-tab="${key}" aria-pressed="${resultTab===key}">${title}</button>`).join('')}</div>`;
 let content='';
 if(!r){
  const m=plan.metrics;
  const metrics=[m.bmi!==null?`ИМТ ${m.bmi.toFixed(1).replace('.',',')}`:'ИМТ: нет данных',m.packYears!==null?`${m.packYears.toFixed(1).replace('.',',')} пачка-лет`:plan.profile.smoking==='never'?'Не курите регулярно':'Стаж: неполные данные'].join(' · ');
  if(resultTab==='main')content=heading(isExample?'Пример: женщина, 45 лет':['ru','kz'].includes(plan.profile.country)?'Ваш план на год':'Предварительный план')+`<p class="result-text">${plan.items.length} пунктов: обследования и вопросы врачу. ${plan.context.reviewNeeded?'Сначала обсудите отмеченные риски.':''}</p><p class="result-caption metrics">${escape(metrics)}</p><p class="result-caption">В PDF — чек-лист, привычки по ВОЗ, объяснения и источники.</p>${AlivaRules.countryNotice(plan.profile.country)?`<p class="country-notice">${escape(AlivaRules.countryNotice(plan.profile.country))}</p>`:''}`;
  if(resultTab==='details')content=heading('Что учесть перед началом')+'<p class="result-text">Это базовый список, а не назначения. Жалобы, беременность, операции, наследственность и прошлые отклонения могут изменить его.</p><p class="result-text">Неизвестные данные не считаем нормой. Сроки повторения действуют после уточнения истории и результатов. Полный план лечения диабета здесь не рассчитывается.</p>';
  if(resultTab==='source')content=heading('Как сформирован план')+`<p class="result-text">${escape(AlivaRules.countryBasis(plan.profile.country))} Ссылки есть у каждого пункта.</p><p class="result-caption">Правила ${plan.version} · проверка основы: ${escape(plan.reviewed)}.<br>Пересмотр — до 01.03.2027. Клиническая экспертиза ещё не проведена.</p>${plan.stale?'<p class="error">Версия требует обновления. Не используйте её как актуальный план.</p>':''}`;
 }else{
  if(resultTab==='main')content=heading(r.title)+`<p class="result-text">${escape(r.reason)}</p><div class="result-when"><strong>${escape(r.when)}</strong><span>${escape(r.repeat)}</span></div>`;
  if(resultTab==='details')content=heading(r.title)+`<p class="result-text">${escape(r.detail)}</p>`;
  if(resultTab==='source')content=heading('Основание пункта')+`<div class="source-list">${r.refs.map(key=>{const s=AlivaRules.sources[key];return `<p><a href="${s.url}" target="_blank" rel="noopener noreferrer">${escape(s.label)} ↗</a><span>${escape(s.version)}</span></p>`}).join('')}</div><p class="result-caption">${escape(r.locator)}</p>`;
 }
 return `<div class="result-view"><div class="result-top"><span class="result-mark">${r?escape(AlivaRules.labels[r.section]):isExample?'ПРИМЕР · НЕ ВАШИ ДАННЫЕ':'ПО ВАШИМ ОТВЕТАМ'}</span>${r?`<button id="show-contents" class="contents-trigger" aria-label="Все пункты плана">${resultPage} / ${plan.items.length} <span aria-hidden="true">☰</span></button>`:''}</div><div class="result-body">${content}</div>${tabs}</div>`;
}

function render(){
 $('error').hidden=true;$('error').textContent='';
 const list=stages(),index=list.indexOf(step);
 $('progress-wrap').hidden=!!overlay&&overlay!=='refine';
 $('step-name').textContent=names[step];$('step-count').textContent=`${index+1} из ${list.length}`;
 $('progress').innerHTML=list.map((_,i)=>`<span class="${i<=index?'active':''}"></span>`).join('');
 $('progress').setAttribute('aria-valuenow',Math.round((index+1)/list.length*100));
 if(overlay==='refine'){$('step-name').textContent='Уточнение · необязательно';$('step-count').textContent=`${refineStep+1} из 3`;$('progress').innerHTML=refinementQuestions.map((_,i)=>`<span class="${i<=refineStep?'active':''}"></span>`).join('');$('progress').setAttribute('aria-valuenow',Math.round((refineStep+1)/3*100));}
 $('back').hidden=!overlay&&index===0;
 $('next').textContent=overlay==='refine'?(refineStep===2?'Обновить мой план →':'Продолжить →'):overlay==='contents'?'Вернуться к пункту':overlay==='result'&&resultPage===0?(pdfBusy?'Готовим PDF…':pdfRequested?'Скачать PDF ещё раз ↓':'Скачать план PDF ↓'):overlay==='result'?(resultPage===plan.items.length?'К обзору плана':'Следующий пункт →'):overlay?'Вернуться к анкете':step==='diabetes'?'Получить мой план →':'Продолжить →';
 $('next').disabled=pdfBusy&&overlay==='result'&&resultPage===0;
 $('back').disabled=overlay==='result'&&resultPage===0;
 $('back').setAttribute('aria-label',overlay==='result'?'Предыдущий пункт':'Назад');
 $('card-note').innerHTML=overlay==='result'?`<button class="text-button" id="edit-answers">${isExample?'Заполнить свою анкету':'Изменить ответы'}</button>${isExample?'<span>Пример</span>':'<button class="text-button" id="refine-plan">Уточнить план ↗</button>'}`:overlay==='refine'?'<button class="text-button" id="cancel-refine">Вернуться без изменений</button>':'Ответы остаются только в Вашем браузере.';
 document.querySelector('.card').classList.toggle('showing-profile',!overlay&&step==='profile');
 document.querySelector('.card').classList.toggle('showing-result',overlay==='result');
 document.querySelector('.card').classList.toggle('showing-contents',overlay==='contents');
 $('edit-answers')?.addEventListener('click',restore);
 $('refine-plan')?.addEventListener('click',startRefinement);
 $('cancel-refine')?.addEventListener('click',()=>{overlay='result';render()});
 let html='';
 if(overlay==='contents'){
  html=contentsHTML();
 }else if(overlay==='refine'){
  const q=refinementQuestions[refineStep];
  html=heading(q.title,q.sub)+`<div class="options refine-options">${[['yes','Да'],['no','Нет'],['unsure','Не знаю / пропустить']].map(([value,label])=>`<label class="option"><input type="radio" name="refinement" value="${value}" ${refineDraft[q.key]===value?'checked':''}><span>${label}</span></label>`).join('')}</div>`;
 }else if(overlay==='waist'){
  html=heading('Как измерить талию','Нужна обычная сантиметровая лента.')+'<div class="info-copy"><p>Расположите ленту посередине между нижним ребром и верхним краем тазовой кости.</p><p>Держите её горизонтально, не сдавливая кожу. Измерьте на обычном выдохе, не втягивая живот.</p><p>Нет сантиметровой ленты? Используйте нерастяжимую нить, затем измерьте её длину линейкой.</p><a href="https://www.who.int/docs/default-source/ncds/ncd-surveillance/steps/part3.pdf" target="_blank" rel="noopener noreferrer">Методика ВОЗ ↗</a></div>';
 }else if(overlay==='privacy'){
  html=heading('Ваши ответы — только у Вас')+'<div class="info-copy"><p>Анкета работает в браузере. Ответы не отправляются на сервер и не сохраняются в хранилище браузера.</p><p>Регистрация не нужна. После обновления или закрытия страницы ответы исчезнут.</p><p>PDF сохраняется на Вашем устройстве после нажатия кнопки.</p><p>Для оценки работы сайта подключена Яндекс Метрика: она получает технические данные о посещениях и события нажатия кнопок магазинов и скачивания PDF, может использовать cookie. Ответы анкеты и содержимое PDF в аналитику не передаются. Запись действий и полей через Вебвизор отключена.</p></div>';
 }else if(overlay==='about'){
  html=heading('О Вашем плане')+'<div class="info-copy"><p>Базовая профилактика для взрослых: программы России и Казахстана по выбранной стране. Предполагается отсутствие регулярных обследований.</p><p>При жалобах, беременности и хронических заболеваниях план необходимо уточнить с врачом.</p><p>Расчёт по фиксированным правилам, без ИИ. Версия '+escape(AlivaRules.VERSION)+'. Даты и основания рекомендаций указаны рядом с источниками в PDF. Клиническая экспертиза ещё не проведена; план не заменяет назначения.</p></div>';
 }else if(overlay==='result'){
  html=resultHTML();
 }else if(step==='profile'){
  html=heading('Пара минут до плана')+`<div class="fields"><label class="field country-field" for="country"><span>В какой стране Вы обычно получаете медицинскую помощь?</span><select class="select" id="country" name="country" required><option value="" disabled>Выберите страну</option>${Object.entries(AlivaRules.countries).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><fieldset><legend>Ваш пол</legend><div class="options two">${radio('sex','male','Мужской')}${radio('sex','female','Женский')}</div></fieldset>${number('age','Сколько Вам полных лет?','лет','Например, 35',18,true)}</div>`;
 }else if(step==='measurements'){
  html=heading('Ваши измерения','Укажите рост, вес и окружность талии. Все три поля обязательны.')+`<div class="fields measurements">${measurement('height','Рост','см','170')}${measurement('weight','Вес','кг','65')}${measurement('waist','Талия','см','80')}</div>`;
 }else if(step==='smoking'){
  html=heading('Курите ли Вы сигареты?','Учитываем и курение в прошлом.')+`<div class="options smoking">${radio('smoking','never','Никогда не курил(а) регулярно')}${radio('smoking','current','Курю сейчас')}${radio('smoking','former','Бросил(а)')}</div>`;
 }else if(step==='years'){
  html=heading('Сколько лет Вы курили?','Укажите суммарный стаж без длительных перерывов.')+number('years','Количество лет','лет','Например, 10',.1)+'<p class="subtitle">Если не помните, просто продолжите.</p>';
 }else if(step==='cigs'){
  html=heading('Сколько сигарет в день?','В среднем за весь период курения.')+number('cigs','Сигарет в день','шт.','Например, 10',.1)+'<p class="subtitle">В обычной пачке — 20 сигарет. Не помните? Можно пропустить.</p>';
 }else if(step==='quit'){
  html=heading('Как давно Вы бросили?','Сколько лет прошло после полного отказа от сигарет?')+number('quit','Количество лет','лет','Меньше года — укажите 0',0)+'<p class="subtitle">Если не помните, просто продолжите.</p>';
 }else if(step==='diabetes'){
  html=heading('Диагностирован ли у Вас диабет?','Имеем в виду диагноз, установленный врачом.')+`<label class="field" for="diabetes"><span>Выберите ответ</span><select class="select" id="diabetes" name="diabetes" required><option value="">Выберите ответ</option><option value="no">Не диагностирован</option><option value="one">Да, 1-й тип</option><option value="two">Да, 2-й тип</option><option value="other">Да, другой тип или не знаю тип</option></select></label><p class="subtitle" style="margin-top:16px">Предполагается отсутствие регулярных обследований.</p>`;
 }
 $('stage').innerHTML=html;
 if(!overlay&&step==='profile')$('country').value=data.country;
 if(!overlay&&step==='diabetes')$('diabetes').value=data.diabetes;
 $('waist-help')?.addEventListener('click',()=>showOverlay('waist'));
 $('show-contents')?.addEventListener('click',()=>{contentsPage=Math.floor(resultPage/3);overlay='contents';render()});
 $('contents-prev')?.addEventListener('click',()=>{contentsPage--;render()});
 $('contents-next')?.addEventListener('click',()=>{contentsPage++;render()});
 $('stage').querySelectorAll('[data-result-page]').forEach(el=>el.addEventListener('click',()=>{resultPage=Number(el.dataset.resultPage);resultTab='main';overlay='result';render()}));
 $('stage').querySelectorAll('[data-result-tab]').forEach(el=>el.addEventListener('click',()=>{resultTab=el.dataset.resultTab;render();$('tab-'+resultTab).focus({preventScroll:true})}));
 $('stage').querySelectorAll('input,select').forEach(el=>{
  el.addEventListener('input',()=>{
   if(el.name==='refinement')refineDraft[refinementQuestions[refineStep].key]=el.value;
   else if(el.name)data[el.name]=el.value;
   $('error').hidden=true;
  });
  if(el.matches('select')){
   // Close pointer/touch interactions without leaving the focus border behind.
   // Keyboard selection keeps focus so arrows and Tab remain usable.
   let pointerSelection=false;
   el.addEventListener('pointerdown',()=>{pointerSelection=true});
   el.addEventListener('keydown',()=>{pointerSelection=false});
   el.addEventListener('change',()=>{
    if(pointerSelection)requestAnimationFrame(()=>el.blur());
   });
   el.addEventListener('blur',()=>{pointerSelection=false});
  }
  if(el.name==='smoking')el.addEventListener('change',()=>{if(data.smoking==='never'){data.years='';data.cigs='';}if(data.smoking!=='former')data.quit='';const list=stages();$('step-count').textContent=`${list.indexOf(step)+1} из ${list.length}`;});
 });
}
function showOverlay(kind){document.activeElement?.blur();returnStep=step;overlay=kind;resultPage=0;resultTab='main';render()}
function restore(){if((overlay==='refine'||overlay==='contents')&&plan){overlay='result';render();return}overlay=null;step=returnStep;render()}
function fail(message,field){$('error').textContent=message;$('error').hidden=false;field?.focus();return false}
function validate(){
 if(step==='measurements'){const issue=measurementIssue(data);if(issue)return fail(issue.message,$(issue.field));}
 if(step==='profile'&&!Object.hasOwn(AlivaRules.countries,data.country))return fail('Выберите страну: Россия или Казахстан.',$('country'));
 if(step==='profile'&&!data.sex)return fail('Выберите пол.');
 if(step==='profile'&&(!$('age').value||!$('age').checkValidity()))return fail('Укажите полный возраст от 18 до 120 лет.',$('age'));
 if(step==='smoking'&&!data.smoking)return fail('Выберите ответ о курении.');
 if(step==='diabetes'&&!data.diabetes)return fail('Выберите ответ о диабете.',$('diabetes'));
 for(const el of $('stage').querySelectorAll('input[type=number]'))if(!el.disabled&&!el.checkValidity())return fail('Проверьте число в выделенном поле.',el);
 if(step==='years'&&Number(data.years)>Number(data.age))return fail('Стаж курения не может быть больше возраста.',$('years'));
 if(step==='quit'&&data.quit!==''&&Number(data.quit)+Number(data.years)>Number(data.age))return fail('Стаж и срок после отказа вместе не могут быть больше возраста.',$('quit'));
 const fields=[...$('stage').querySelectorAll('input[type=number]')].map(el=>el.name);
 const issue=AlivaRules.normalize(data).errors.find(e=>fields.includes(e.field));
 if(issue)return fail(issue.message,$(issue.field));
 return true;
}
$('next').addEventListener('pointerdown',event=>{if(step==='measurements'&&document.documentElement.classList.contains('keyboard'))event.preventDefault()});
async function downloadPlan(){
 if(pdfBusy)return;
 const exportedPlan=plan,exportedExample=isExample;
 pdfBusy=true;render();
 try{
  const bytes=await AlivaPDF.create(exportedPlan,{example:exportedExample});
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=`aliva-${exportedExample?'example':'plan'}-${exportedPlan.asOf}.pdf`;document.body.append(a);a.click();a.remove();
  window.AlivaAnalytics?.track(exportedExample?'aliva_example_pdf_download':'aliva_pdf_download');
  setTimeout(()=>URL.revokeObjectURL(url),60000);if(plan===exportedPlan)pdfRequested=true;
 }catch{fail('Не удалось подготовить PDF. Попробуйте ещё раз.');}
 finally{pdfBusy=false;const error=$('error').hidden?null:$('error').textContent;render();if(error)fail(error)}
}
$('next').addEventListener('click',()=>{
 if(overlay==='result'&&resultPage===0){downloadPlan();return}

 if(overlay==='refine'){
  const key=refinementQuestions[refineStep].key;if(!refineDraft[key])return fail('Выберите ответ или «Не знаю / пропустить».');
  if(refineStep<2){refineStep++;render();return}
  Object.assign(data,refineDraft);calculate(false);return;
 }
 if(overlay==='contents'){overlay='result';render();return}
 if(overlay==='result'){resultPage=resultPage===plan.items.length?0:resultPage+1;resultTab='main';render();return}
 if(overlay){restore();return}
 // When the keyboard is open, continue through the measurement inputs first.
 if(step==='measurements'&&document.documentElement.classList.contains('keyboard')){
  const inputs=[...$('stage').querySelectorAll('input[type=number]:not(:disabled)')];
  const focus=inputs.findIndex(el=>el===document.activeElement);if(focus>=0&&focus<inputs.length-1){$('stage').querySelectorAll('.measurement-row').forEach(row=>row.classList.remove('focused'));inputs[focus+1].closest('.measurement-row').classList.add('focused');inputs[focus+1].focus();return}
 }
 if(!validate())return;
 document.activeElement?.blur();
 if(step==='diabetes'){calculate();return}
 step=stages()[stages().indexOf(step)+1];render();
});
$('back').addEventListener('click',()=>{document.activeElement?.blur();if(overlay==='refine'){if(refineStep>0)refineStep--;else overlay='result';render();return}if(overlay==='contents'){overlay='result';render();return}if(overlay==='result'){resultPage=Math.max(0,resultPage-1);resultTab='main';render();return}if(overlay){restore();return}const list=stages();step=list[Math.max(0,list.indexOf(step)-1)];render()});
$('home').addEventListener('click',()=>{document.activeElement?.blur();overlay=null;step='profile';render()});
$('example').addEventListener('click',()=>calculate(true));$('mobile-example').addEventListener('click',()=>calculate(true));$('privacy').addEventListener('click',()=>showOverlay('privacy'));$('about').addEventListener('click',()=>showOverlay('about'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay)restore();if(event.key==='Enter'&&event.target.matches('input[type=number]')){event.preventDefault();$('next').click()}});
function size(){const viewport=window.visualViewport;const height=viewport?viewport.height:window.innerHeight;document.documentElement.style.setProperty('--view-height',height+'px');const editing=document.activeElement?.matches('input[type=number],textarea');document.documentElement.classList.toggle('keyboard',!!editing&&!document.body.classList.contains('inline-questionnaire')&&height<430&&window.innerWidth<700)}
window.visualViewport?.addEventListener('resize',size);window.addEventListener('resize',size);document.addEventListener('focusin',event=>{const row=event.target.closest('.measurement-row');if(row){document.querySelectorAll('.measurement-row').forEach(el=>el.classList.toggle('focused',el===row))}size()});document.addEventListener('focusout',()=>requestAnimationFrame(size));
render();size();
})();
