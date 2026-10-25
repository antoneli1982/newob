import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
process.on('uncaughtException',error=>{console.error(error.stack);process.exit(1);});
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require('C:/Users/IVAN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.attributes={};this.value='';this.hidden=false;this.style={};this.clientWidth=1400;this.clientHeight=900;this.isConnected=true;}
  append(...items){this.children.push(...items);if(this.tagName==='SELECT'&&!this.value&&items[0])this.value=items[0].value;}
  set id(value){this._id=value;nodes.set('#'+value,this);}
  get id(){return this._id;}
  appendChild(item){this.append(item);return item;}
  insertBefore(item){this.children.unshift(item);return item;}
  replaceChildren(...items){this.children=[...items];}
  querySelector(s){return get(s);}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
  dispatchEvent(e){for(const f of this.listeners[e.type]||[])f(e);}
  click(){this.dispatchEvent({type:'click'});}
  remove(){this.isConnected=false;}
}
const nodes=new Map();
function get(s){if(!nodes.has(s))nodes.set(s,new Element(s.includes('category')||s.includes('item')?'select':'div'));return nodes.get(s);}
const doc={head:new Element('head'),body:new Element('body'),createElement:tag=>tag==='canvas'?createCanvas(1,1):new Element(tag),createElementNS:(ns,tag)=>new Element(tag),querySelector:get,addEventListener(){}};
const context={console,document:doc,window:{},ImageData,performance,Event,Blob,URL,AbortController,Headers,Request,Response,fetch,setTimeout,clearTimeout,TextDecoder,TextEncoder,Uint8Array,Float32Array,ArrayBuffer,Int32Array,Uint32Array,Uint16Array};
vm.createContext(context);
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];new vm.Script(script);
const anchor='var A2=document.querySelector';const at=script.indexOf(anchor);assert(at>0,'Main initialization anchor');
vm.runInContext(script.slice(0,at)+'globalThis.obTest={THREE:e6,createModel:tl,createMaterials:Pa};})();',context,{timeout:15000});
const {THREE:T,createModel,createMaterials}=context.obTest;
const model=createModel(createMaterials(false),{optimize:false}),scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1400/900,.05,500);
scene.add(model.group);model.group.updateMatrixWorld(true);camera.position.set(105,68,69);camera.lookAt(39,0,-21);camera.updateMatrixWorld(true);
const controls={target:new T.Vector3(39,0,-21),update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);}};
vm.runInContext(fs.readFileSync(new URL('./dimensions.js',import.meta.url),'utf8'),context);
let changes=0,exits=0;const beforeChildren=model.group.children.length;
const controller=context.installOBDimensions({THREE:T,model,scene,camera,viewport:get('#viewport'),controls,changed(){changes++;},leaveNavigation(){exits++;}});
assert.equal(controller.enabled,false);assert.equal(controller.overlay.visible,false);assert.equal(model.group.children.length,beforeChildren);
assert.equal(controller.entries.filter(e=>e.category==='buildings').length,3);
assert.equal(controller.entries.filter(e=>e.category==='equipment').length,model.equipment.children.length);
assert.equal(new Set(controller.entries.map(e=>e.id)).size,controller.entries.length);
for(const e of controller.entries)assert(controller.dimensions(e).every(n=>Number.isFinite(n)&&n>=0));
const main=controller.entries.find(e=>e.id==='building_new');
assert.equal(controller.dimensions(main).join(','),'28.75,47.54,9');
get('#dimension-toggle').click();assert(controller.enabled);assert(!get('#dimension-panel').hidden);assert.equal(get('#dimension-toggle').attributes['aria-pressed'],'true');
controller.tick(1000,true);assert(controller.overlay.children.some(g=>g.visible));
function checkLabels(){
 const labels=[];controller.overlay.traverseVisible(o=>{if(o.isSprite&&o.userData.screenRect)labels.push(o);});
 assert(labels.length>0,'At least one readable measurement is present');
 for(const label of labels){const r=label.userData.screenRect;assert(r.right-r.left>=150&&r.bottom-r.top===50);}
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i].userData.screenRect,b=labels[j].userData.screenRect;assert(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top),'Measurement labels overlap');}
}
checkLabels();
const truck=controller.entries.find(e=>e.id==='equipment_MUNCK_QUARENTENA');assert(truck);controller.select(truck.id);assert.equal(exits,1);controller.tick(1200,true);
assert.equal(controller.overlay.children.filter(g=>g.visible).length,1);
assert(get('#dimension-readout').children[1].textContent.includes(' m'));
assert(!/\d+,\d{2}/.test(get('#dimension-readout').children[1].textContent),'Readout must use one decimal');checkLabels();
const machine=controller.entries.find(e=>e.object?.userData.forklift);assert(machine);const original=controller.dimensions(machine).join(',');controller.select(machine.id);controller.tick(1400,true);
machine.object.position.x+=.8;machine.object.rotation.y+=Math.PI/3;machine.object.updateMatrixWorld(true);controller.tick(1600,true);
const after=controller.dimensions(machine);const prior=original.split(',').map(Number);after.forEach((n,i)=>assert(Math.abs(n-prior[i])<1e-8,'Local dimensions are invariant under movement/rotation'));
assert(controller.overlay.children.filter(g=>g.visible).length===1);
for(const group of controller.overlay.children)for(const o of group.children){if(o.isSprite)assert(o.scale.toArray().every(Number.isFinite));if(o.isLineSegments)assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));}
get('#dimension-category').value='openings';get('#dimension-category').dispatchEvent({type:'change'});controller.tick(1800,true);assert(get('#dimension-item').children.length>1);
const csv=controller.csv();assert(csv.startsWith('\ufeff'));assert.equal(csv.split('\r\n').length,controller.entries.length+1);assert(csv.includes('Galpão novo'));
assert(csv.includes('"28,8";"47,5";"9,0"'));assert(!/"\d+,\d{2,}"/.test(csv),'CSV must use one decimal');
fs.writeFileSync(new URL('./OB_COTAS_DO_MODELO.csv',import.meta.url),csv);
get('#dimension-close').click();assert(!controller.enabled);assert(!controller.overlay.visible);assert(get('#dimension-panel').hidden);
controller.setEnabled(true);get('#viewport').clientWidth=390;get('#viewport').clientHeight=700;camera.aspect=390/700;camera.updateProjectionMatrix();controller.tick(2000,true);
controller.select(main.id);controller.tick(2200,true);checkLabels();
assert.equal(html.split('OB_DIMENSIONS_SOURCE_START').length,2);assert(html.includes('__obDimensions.tick(r)'));
const result={parsed_bundle:true,elements:controller.entries.length,buildings:3,equipment:model.equipment.children.length,opening_dimensions:controller.entries.filter(e=>e.category==='openings').length,toggle_and_hide:true,category_and_selection:true,moving_forklift_local_dimensions:true,mobile_projection_finite:true,offline_html:true,model_not_modified:true,complete_csv:true,visual_browser_check:false};
fs.writeFileSync(new URL('./VERIFICACAO_COTAS.json',import.meta.url),JSON.stringify(result,null,2));
controller.dispose();assert(!scene.children.some(g=>g.name==='COTAS_APENAS_VISUALIZACAO'));
console.log(JSON.stringify(result,null,2));
