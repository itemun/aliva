// Extract the approved website vector at build time; no duplicate logo artwork.
const fs=require('node:fs');
const path=require('node:path');
module.exports=()=>{
 const svg=fs.readFileSync(path.join(__dirname,'concepts/function/brand.html'),'utf8');
 const groups=[...svg.matchAll(/<g\s+([^>]+)>([\s\S]*?)<\/g>/g)].map(([,attrs,content])=>{
  const transform=attrs.match(/transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)(?: ([-\d.]+))?\)"/);
  if(!transform)throw new Error('Unsupported brand transform');
  return {x:+transform[1],y:+transform[2],sx:+transform[3],sy:+(transform[4]??transform[3]),stroke:attrs.includes('stroke="currentColor"'),width:+(attrs.match(/stroke-width="([\d.]+)"/)?.[1]??0),paths:[...content.matchAll(/<path d="([^"]+)"/g)].map(m=>m[1])};
 });
 if(groups.length!==2||groups.some(g=>!g.paths.length))throw new Error('Missing approved brand paths');
 return {groups};
};
