/* Cotas do modelo, em metros. Embutido no index.html por build-dimensions.mjs.
 * Não altera a geometria nem participa das colisões/exportações de modelos.
 */
function installOBDimensions({THREE:T,model,scene,camera,viewport,controls,changed,leaveNavigation}) {
  const entries=[], byId=new Map(), visualCache=new Map();
  const categories={all:'Todas as cotas',buildings:'Prédios',structure:'Paredes, pilares e mobiliário',openings:'Vãos e acessos',equipment:'Equipamentos'};
  const colors=[0x56c8ff,0xffc569,0x77e1a8], axes=['L','C','H'];
  const overlay=new T.Group();overlay.name='COTAS_APENAS_VISUALIZACAO';overlay.visible=false;scene.add(overlay);
  const pt=new T.Vector3(), projected=new T.Vector3(), worldScale=new T.Vector3(), worldPosition=new T.Vector3(), worldRotation=new T.Quaternion();
  const format=value=>value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:3});
  function add(id,name,category,min,max,object=null,note='') {
    if(min.some((n,i)=>!Number.isFinite(n)||!Number.isFinite(max[i])||max[i]<n))return;
    const entry={id,name,category,min:[...min],max:[...max],object,note};entries.push(entry);byId.set(id,entry);return entry;
  }
  // Nominal envelopes of the architectural walls; roofs, solar panels and
  // equipment are measured separately so they do not inflate building sizes.
  add('building_new','Galpão novo · paredes','buildings',[0,0,-47.54],[28.75,9,0],null,'Envelope nominal das paredes; não inclui cobertura e placas solares.');
  add('building_existing','Prédio existente · paredes','buildings',[38.85,0,-45.9],[74.30,9,0],null,'Envelope nominal das paredes; não inclui cobertura.');
  add('building_annex','Anexo · paredes','buildings',[74.30,0,-29.80],[81.80,4.95,0],null,'Envelope nominal das paredes do anexo.');
  const friendly=name=>String(name||'Elemento').replace(/^EX_POSTO_/, 'Empilhadeira existente ').replace(/^forklift_/, 'Empilhadeira nova ').replace(/^EX_BANCADA_/, 'Bancada existente ').replace(/MUNCK_QUARENTENA/, 'Munck · estabilizadores abertos').replace(/^lathe_/, 'Torno ').replace(/^mill_/, 'Fresadora ').replace(/^workbench_/, 'Bancada ').replace(/^toilet_/, 'Vaso sanitário ').replace(/^sink_/, 'Lavatório ').replace(/^tireService_/, 'Borracharia ').replaceAll('_',' ');
  const nameCounts=new Map();
  for(const [i,b]of model.collisionBoxes.entries()){
    if(b.kind==='equipmentEnvelope')continue;
    const base=friendly(b.name),n=(nameCounts.get(base)||0)+1;nameCounts.set(base,n);
    add('structure_'+i,base+(n>1?' · '+n:''),'structure',b.min,b.max,null,'Dimensões do elemento modelado.');
    // A header's underside measures the clear height of the real opening.
    // Thickness is intentionally retained as the third dimension in the list.
    if(/verga/i.test(b.name)&&b.min[1]>=2){
      const floor=/mezanino/i.test(b.name)?3:0;
      add('opening_'+i,'Vão · '+base+(n>1?' · '+n:''),'openings',[b.min[0],floor,b.min[2]],[b.max[0],b.min[1],b.max[2]],null,'Altura até a face inferior da verga; largura entre as bordas do vão modelado.');
    }
  }
  // Capture the local boxes before static instancing. Moving forklifts retain
  // local axes, so turning them does not falsely enlarge width or length.
  model.equipment.updateMatrixWorld(true);
  for(const object of model.equipment.children){
    const inverse=object.matrixWorld.clone().invert(),local=new T.Box3();
    object.traverse(o=>{
      if(!o.isMesh)return;
      o.geometry.computeBoundingBox();
      const relative=inverse.clone().multiply(o.matrixWorld);
      if(o.isInstancedMesh){const matrix=new T.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);local.union(o.geometry.boundingBox.clone().applyMatrix4(relative.clone().multiply(matrix)));}}
      else local.union(o.geometry.boundingBox.clone().applyMatrix4(relative));
    });
    if(!local.isEmpty())add('equipment_'+object.name,friendly(object.name),'equipment',local.min.toArray(),local.max.toArray(),object,'Medida da geometria ilustrativa, incluindo os acessórios visíveis.');
  }
  function dimensions(e){const scale=e.object?e.object.getWorldScale(worldScale):worldScale.set(1,1,1);return [Math.abs((e.max[0]-e.min[0])*scale.x),Math.abs((e.max[2]-e.min[2])*scale.z),Math.abs((e.max[1]-e.min[1])*scale.y)];}
  function toWorld(e,p){pt.fromArray(p);if(e.object)pt.applyMatrix4(e.object.matrixWorld);return pt.clone();}
  function worldBox(e){return new T.Box3(new T.Vector3(...e.min),new T.Vector3(...e.max)).applyMatrix4(e.object?e.object.matrixWorld:new T.Matrix4());}
  const style=document.createElement('style');style.textContent=`
    #dimension-toggle{width:100%;font-weight:700;background:#214f70;border-color:#56c8ff}
    #dimension-toggle[aria-pressed=true]{background:#18775d;border-color:#77e1a8}
    #dimension-panel{margin-top:12px}#dimension-panel label{display:block;font-size:12px;margin:9px 0 5px}
    #dimension-panel select{margin-bottom:4px}#dimension-readout{padding:10px;background:#13212b;border:1px solid #455865;border-radius:7px;font-size:12px;line-height:1.7;overflow-wrap:anywhere}
    #dimension-readout strong{display:block;color:#fff}#dimension-readout .dim-values{font-variant-numeric:tabular-nums}
    #dimension-csv{width:100%;margin-top:9px}#dimension-status{font-size:11px;line-height:1.5;color:#bdcdda;margin:10px 0}
    #dimension-close{position:absolute;right:12px;bottom:12px;z-index:6;background:#173a51;border-color:#56c8ff;min-height:44px}
    .presenting #dimension-close{bottom:90px}@media(max-width:800px){#dimension-close{bottom:auto;top:64px;font-size:12px}}
  `;document.head.append(style);
  const section=document.createElement('section');section.id='dimensions-section';
  section.innerHTML=`<p class="eyebrow">Medidas do projeto</p><button id="dimension-toggle" type="button" aria-pressed="false" aria-expanded="false" aria-controls="dimension-panel">Mostrar cotas</button>
    <div id="dimension-panel" hidden><label for="dimension-category">Exibir medidas de</label><select id="dimension-category"></select>
    <label for="dimension-item">Elemento · ordem alfabética</label><select id="dimension-item"></select>
    <div id="dimension-readout" aria-live="polite"></div><p id="dimension-status" role="status"></p>
    <button id="dimension-csv" type="button">Baixar lista de cotas</button>
    <p class="note">L = largura · C = comprimento · H = altura. Valores em metros, medidos no modelo. Alturas e equipamentos ilustrativos. Aproxime para ver os detalhes ou escolha um elemento.</p></div>`;
  const aside=document.querySelector('aside');aside.insertBefore(section,aside.querySelector('#forklift-controls-section')||aside.firstChild);
  const close=document.createElement('button');close.id='dimension-close';close.type='button';close.textContent='Ocultar cotas';close.hidden=true;viewport.append(close);
  const toggle=section.querySelector('#dimension-toggle'),panel=section.querySelector('#dimension-panel'),category=section.querySelector('#dimension-category'),items=section.querySelector('#dimension-item'),readout=section.querySelector('#dimension-readout'),status=section.querySelector('#dimension-status');
  for(const [value,label]of Object.entries(categories)){const o=document.createElement('option');o.value=value;o.textContent=label;category.append(o);}
  let enabled=false,selected='all',lastUpdate=0,dirty=true,lastPose='',lastCount=-1,lastObjects='';
  function list(){return entries.filter(e=>category.value==='all'||e.category===category.value);}
  function fillItems(){items.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent='Todos os elementos desta categoria';items.append(all);for(const e of list().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{numeric:true}))){const option=document.createElement('option');option.value=e.id;option.textContent=e.name;items.append(option);}selected='all';items.value='all';updateReadout();dirty=true;}
  function updateReadout(){readout.replaceChildren();if(selected==='all'){readout.textContent=list().length+' elementos disponíveis. Na visão geral aparecem as cotas dos prédios; os detalhes surgem ao aproximar.';return;}const e=byId.get(selected),d=dimensions(e),title=document.createElement('strong'),values=document.createElement('div'),note=document.createElement('div');title.textContent=e.name;values.className='dim-values';values.textContent='L '+format(d[0])+' m  ·  C '+format(d[1])+' m  ·  H '+format(d[2])+' m';note.textContent=e.note;readout.append(title,values,note);}
  function setEnabled(value){enabled=!!value;overlay.visible=enabled;panel.hidden=close.hidden=!enabled;toggle.textContent=enabled?'Ocultar cotas':'Mostrar cotas';toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-expanded',String(enabled));dirty=true;changed();}
  toggle.addEventListener('click',()=>setEnabled(!enabled));close.addEventListener('click',()=>setEnabled(false));
  category.addEventListener('change',()=>{fillItems();changed();});
  items.addEventListener('change',()=>{
    selected=items.value;updateReadout();dirty=true;
    if(selected!=='all'){
      leaveNavigation();const e=byId.get(selected),box=worldBox(e),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
      camera.fov=44;camera.near=.05;camera.updateProjectionMatrix();
      const halfVertical=camera.fov*Math.PI/360,halfHorizontal=Math.atan(Math.tan(halfVertical)*camera.aspect),distance=Math.max(size.length(),2.5)*.575/Math.sin(Math.min(halfVertical,halfHorizontal));
      camera.position.copy(center).add(new T.Vector3(.85,.72,1).normalize().multiplyScalar(distance));controls.target.copy(center);controls.update();
    }changed();
  });
  function makeVisual(e){
    const root=new T.Group();root.name='Cota_'+e.id;overlay.add(root);
    const lines=[],labels=[];
    for(let a=0;a<3;a++){
      const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(36),3));
      const line=new T.LineSegments(geometry,new T.LineBasicMaterial({color:colors[a],depthTest:false,depthWrite:false,transparent:true,opacity:.95,toneMapped:false}));line.renderOrder=1000;line.frustumCulled=false;root.add(line);lines.push(line);
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
      const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false}));sprite.renderOrder=1001;sprite.frustumCulled=false;root.add(sprite);labels.push({sprite,canvas,texture,text:''});
    }
    const v={root,lines,labels};visualCache.set(e.id,v);return v;
  }
  function project(p){return projected.copy(p).project(camera).clone();}
  function visibleEntry(e,box,height,width){
    const center=box.getCenter(new T.Vector3()),projectedCenter=project(center);if(projectedCenter.z<-1||projectedCenter.z>1||Math.abs(projectedCenter.x)>1.3||Math.abs(projectedCenter.y)>1.3)return false;
    if(selected!=='all')return true;if(e.category==='buildings')return true;
    const distance=camera.position.distanceTo(center),size=box.getSize(new T.Vector3()),pixelSize=size.length()*height/(2*Math.tan(camera.fov*Math.PI/360)*Math.max(distance,.01));
    return distance<32&&pixelSize>125;
  }
  function renderEntry(e,v,height){
    const [x,y,z]=e.min,[X,Y,Z]=e.max,d=dimensions(e);
    const offset=e.category==='buildings'?1.35:.22;
    // Offset dimension lines and extension legs, with diagonal end ticks.
    const pairs=[[[x,y+.10,z-offset],[X,y+.10,z-offset],[x,y+.10,z],[X,y+.10,z]],[[X+offset,y+.10,z],[X+offset,y+.10,Z],[X,y+.10,z],[X,y+.10,Z]],[[X+offset,y,Z+offset],[X+offset,Y,Z+offset],[X,y,Z],[X,Y,Z]]];
    for(let a=0;a<3;a++){
      const [p0,p1,s0,s1]=pairs[a].map(p=>toWorld(e,p)),line=v.lines[a],label=v.labels[a],mid=p0.clone().add(p1).multiplyScalar(.5);
      const pixelWorld=2*Math.max(.2,camera.position.distanceTo(mid))*Math.tan(camera.fov*Math.PI/360)/Math.max(1,height);
      const tick=Math.max(.025,pixelWorld*4),diag=new T.Vector3(tick,tick,a===2?0:tick),segments=[p0,p1,s0,p0,s1,p1,p0.clone().sub(diag),p0.clone().add(diag),p1.clone().sub(diag),p1.clone().add(diag),p0,p0];
      const array=line.geometry.attributes.position;segments.forEach((p,i)=>array.setXYZ(i,p.x,p.y,p.z));array.needsUpdate=true;
      const text=axes[a]+' '+format(d[a])+' m';
      if(label.text!==text){const ctx=label.canvas.getContext('2d');ctx.clearRect(0,0,512,96);ctx.fillStyle='#102434';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#'+colors[a].toString(16);ctx.lineWidth=5;ctx.strokeRect(3,3,506,90);ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.fillText(text,256,49);label.texture.needsUpdate=true;label.text=text;}
      label.sprite.position.copy(mid);label.sprite.scale.set(pixelWorld*116,pixelWorld*22,1);
      const q=project(mid);label.sprite.visible=q.z>=-1&&q.z<=1;
    }
  }
  function tick(now=performance.now(),force=false){
    if(!enabled)return false;
    if(!force&&now-lastUpdate<100)return false;
    const width=viewport.clientWidth,height=viewport.clientHeight,pose=camera.matrixWorld.elements.join(',')+':'+width+':'+height;
    model.equipment.updateMatrixWorld(true);
    const objectPose=entries.filter(e=>e.object?.userData?.forklift).map(e=>e.object.matrixWorld.elements.join(',')).join(';');
    const moved=objectPose!==lastObjects;lastObjects=objectPose;
    if(!force&&!dirty&&pose===lastPose&&!moved)return false;
    lastPose=pose;lastUpdate=now;dirty=false;camera.updateMatrixWorld(true);model.equipment.updateMatrixWorld(true);
    let count=0;for(const v of visualCache.values())v.root.visible=false;
    const candidates=selected==='all'?list():[byId.get(selected)];
    // Near-camera priority keeps the global all-cotas mode legible. Every item
    // remains available in the alphabetical selector and complete CSV.
    candidates.sort((a,b)=>(a.category==='buildings'?-1:0)-(b.category==='buildings'?-1:0)||camera.position.distanceToSquared(worldBox(a).getCenter(new T.Vector3()))-camera.position.distanceToSquared(worldBox(b).getCenter(new T.Vector3())));
    for(const e of candidates){const box=worldBox(e);if(!visibleEntry(e,box,height,width))continue;if(selected==='all'&&count>=12)break;const v=visualCache.get(e.id)||makeVisual(e);v.root.visible=true;renderEntry(e,v,height);count++;}
    if(count!==lastCount){status.textContent=count+' elementos cotados nesta vista. Selecione um item para isolar suas três medidas.';lastCount=count;}
    if(selected!=='all')updateReadout();return true;
  }
  function csv(){const lines=[['Elemento','Categoria','Largura (m)','Comprimento (m)','Altura (m)','Observação'],...entries.map(e=>[e.name,categories[e.category],...dimensions(e).map(v=>v.toFixed(3).replace('.',',')),e.note])];return '\ufeff'+lines.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');}
  section.querySelector('#dimension-csv').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([csv()],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='OB_COTAS_DO_MODELO.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);});
  fillItems();setEnabled(false);
  return {tick,setEnabled,get enabled(){return enabled;},entries,dimensions,csv,overlay,select(id){items.value=id;items.dispatchEvent(new Event('change'));},dispose(){for(const v of visualCache.values()){v.lines.forEach(o=>{o.geometry.dispose();o.material.dispose();});v.labels.forEach(o=>{o.texture.dispose();o.sprite.material.dispose();});}overlay.removeFromParent();section.remove();close.remove();style.remove();}};
}
