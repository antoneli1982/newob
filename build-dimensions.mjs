import fs from 'node:fs';
const path=new URL('./index.html',import.meta.url);
let html=fs.readFileSync(path,'utf8');
// The repository is a self-contained bundled HTML. Keep that deployment model;
// markers let this readable feature be rebuilt without changing unrelated code.
const start='/* OB_DIMENSIONS_SOURCE_START */',end='/* OB_DIMENSIONS_SOURCE_END */';
const source=fs.readFileSync(new URL('./dimensions.js',import.meta.url),'utf8').replaceAll('</script','<\\/script');
const block=start+'\n'+source+'\n'+end;
if(html.includes(start))html=html.slice(0,html.indexOf(start))+block+html.slice(html.indexOf(end)+end.length);
else {
 const anchor='P6.add($1.group);';
 if(html.split(anchor).length!==2)throw Error('Scene integration anchor changed; inspect the new upstream bundle before patching.');
 html=html.replace(anchor,()=>block+`\nvar __obDimensions=installOBDimensions({THREE:e6,model:$1,scene:P6,camera:m7,viewport:A2,controls:A7,changed:A5,leaveNavigation:()=>{C6=null;if(__forkliftMode)__forkliftCloseMode();R2?.exit();A7.enabled=true;}});\n`+anchor);
 const frame='PBA.tick(r,m7)&&(H4=!0),';
 if(html.split(frame).length!==2)throw Error('Animation anchor changed.');
 html=html.replace(frame,frame+'__obDimensions.tick(r)&&(H4=!0),');
}
fs.writeFileSync(path,html);
console.log('Cotas incorporadas ao HTML independente.');
