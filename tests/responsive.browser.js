async () => {
 await document.fonts.ready;
 const $=id=>document.getElementById(id), issues=[], steps=[];
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
 const visible=e=>!!(e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
 const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
 const set=(id,v)=>{const e=$(id);if(!e)throw Error('Missing field '+id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));};
 const geometry=()=>{const c=rect(document.querySelector('#questionnaire .card')),a=rect(document.querySelector('.app-preview'));return {cardHeight:c.h,appHeight:a.h,buttonY:rect($('next')).y+scrollY};};
 const stageCheck=name=>{
  const s=$('stage'),r=rect(s),c=rect(document.querySelector('#questionnaire .card')),b=rect($('next'));
  steps.push({name,...geometry(),stageScroll:s.scrollHeight>s.clientHeight+1});
  if(s.scrollWidth>s.clientWidth+2)issues.push(name+': horizontal stage overflow');
  if(b.bottom>c.bottom-5)issues.push(name+': action outside card');
 };
 window.scrollTo({top:0,behavior:'instant'});
 const h=rect(document.querySelector('.ridge-header')),copy=rect(document.querySelector('.hero-copy')),facts=rect(document.querySelector('.hero-facts')),hero=rect($('top'));
 if(copy.y<h.bottom+8)issues.push('Hero copy under header');
 if(copy.bottom>hero.bottom||facts.bottom>hero.bottom)issues.push('Hero content below background');
 if(overlap(rect($('ridge-start')),facts)||overlap(rect(document.querySelector('.hero-description')),facts))issues.push('Hero text overlaps facts');
 const nav=[...document.querySelectorAll('.ridge-header > .brand,.main-nav,.header-actions')].filter(visible).map(rect);
 for(let i=0;i<nav.length-1;i++)if(overlap(nav[i],nav[i+1]))issues.push('Header items overlap');
 $('ridge-menu-toggle').click();const menu=rect($('ridge-menu'));
 if(menu.x<0||menu.right>innerWidth+1||menu.bottom>innerHeight+1)issues.push('Menu outside viewport');
 $('ridge-menu-toggle').click();
 const wide=[...document.querySelectorAll('.landing-sections h2,.landing-sections p,.landing-sections button,.landing-sections a,.landing-sections .paper-sheet,.hero-copy,.hero-facts')].filter(visible).filter(e=>{const r=rect(e);return r.x<-2||r.right>innerWidth+2}).map(e=>e.className||e.id||e.tagName);
 if(wide.length)issues.push('Elements outside width: '+[...new Set(wide)].join(','));
 const overflow=document.documentElement.scrollWidth>innerWidth+1;
 if(overflow)issues.push('Document horizontal overflow');
 $('header-start').click();const card=rect(document.querySelector('#questionnaire .card'));
 if(card.y<h.bottom-1)issues.push('Questionnaire under header');
 set('country','kz');document.querySelector('[name=sex][value=male]').click();const clean=geometry();$('next').click();const invalid=geometry();
 if(JSON.stringify(clean)!==JSON.stringify(invalid))issues.push('Age error moves layout');
 stageCheck('profile-error');set('age','65');$('next').click();
 const mb=geometry();$('next').click();if(JSON.stringify(mb)!==JSON.stringify(geometry()))issues.push('Measurement error moves layout');stageCheck('measurements-error');
 set('height','180');set('weight','82');set('waist','92');$('waist-help').click();stageCheck('waist-help');$('next').click();$('next').click();
 document.querySelector('[name=smoking][value=former]').click();stageCheck('smoking');$('next').click();set('years','30');stageCheck('years');$('next').click();set('cigs','20');stageCheck('cigs');$('next').click();set('quit','10');stageCheck('quit');$('next').click();set('diabetes','two');stageCheck('diabetes');$('next').click();
 for(const tab of ['main','details','source']){$('tab-'+tab).click();stageCheck('result-'+tab)}
 document.querySelector('[data-app-store=app_store]').click();const d=rect($('app-coming-dialog'));
 if(d.x<0||d.right>innerWidth+1||d.y<0||d.bottom>innerHeight+1)issues.push('Dialog outside viewport');
 if($('app-coming-dialog').scrollWidth>$('app-coming-dialog').clientWidth+1)issues.push('Dialog horizontal overflow');
 const dialogScroll=$('app-coming-dialog').scrollHeight>$('app-coming-dialog').clientHeight+1;
 $('app-coming-dismiss').click();
 return {viewport:[innerWidth,innerHeight],issues,hero:{header:h,copy,facts},steps,dialogScroll};
}
