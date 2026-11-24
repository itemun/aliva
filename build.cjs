const fs=require('node:fs');
const path=require('node:path');
const base=__dirname;
let html=fs.readFileSync(path.join(base,'src/landing.template.html'),'utf8');
const vendor=path.join(base,'vendor');
const fonts=Object.fromEntries([['regular','Regular'],['bold','Bold']].map(([key,style])=>[key,fs.readFileSync(path.join(vendor,`LiberationSans-${style}.ttf`)).toString('base64')]));
const pdfAssets=['pdf-lib-1.17.1.min.js','fontkit-1.1.1.min.js'].map(file=>'<script>'+fs.readFileSync(path.join(vendor,file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>').join('\n')+'\n<script>globalThis.AlivaFonts='+JSON.stringify(fonts)+';globalThis.AlivaBrand='+JSON.stringify(require('./pdf-brand.cjs')())+';</script>';
html=html.replace('<!-- ALIVA_PDF_ASSETS -->',()=>pdfAssets);
for(const [marker,file] of [['ALIVA_RULES','rules.js'],['ALIVA_PDF','pdf.js'],['ALIVA_EXAMPLE','example.js'],['ALIVA_ANALYTICS','analytics.js'],['ALIVA_APP','app.js']]){
 const source=fs.readFileSync(path.join(base,'src',file),'utf8');
 if(/<\/script/i.test(source))throw new Error('Inline script terminator in '+file);
 html=html.replace('<!-- '+marker+' -->',()=>'<script id="'+marker.toLowerCase()+'">\n'+source+'</script>');
}
fs.writeFileSync(path.join(base,'aliva-landing.html'),html);
console.log('Built standalone aliva-landing.html');
