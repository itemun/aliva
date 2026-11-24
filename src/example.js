/* One synthetic profile, recalculated with the same live rules as a personal plan. */
(function(root){
 'use strict';
 const profile=Object.freeze({country:'ru',sex:'female',age:45,height:165,weight:68,waist:85,smoking:'never',diabetes:'no'});
 const api=Object.freeze({profile,build(asOf){return root.AlivaRules.buildPlan({...profile},asOf)}});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.AlivaExample=api;
})(typeof globalThis!=='undefined'?globalThis:this);
