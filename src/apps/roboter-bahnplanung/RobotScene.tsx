import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModels, dispose } from './robot/load-models';
import { makeLayer, updateLayer, sheetPoint, displayPose, SUSPENSION, SHEET_FRONT, tcpPathPoint, tcpPathMaterial, sectionPlane, sectionCurve, type Layer } from './robot/scene-model';
import { type AxisValues, REFERENCE_POSES, toolMatrix } from './robot/robot-kinematics';
import { makeKernel, poseAt, type Result } from './model';
import { format } from './spray';
import { colorAt } from './MapView';
type Props = { result: Result; values: Float32Array; time: number; max: number; profile: boolean; axis: 'u' | 'v'; cut: number; showCut: boolean; showCabin: boolean; transparentWalls: boolean };
type Engine = { update: (p: Props, height: number) => void; fit: (close: boolean) => void };
export default function RobotScene(props: Props) {
  const host = useRef<HTMLDivElement>(null), engine = useRef<Engine | null>(null), latest = useRef(props);
  latest.current = props;
  const [status, setStatus] = useState('Originale CAD-Modelle werden geladen …'), [error, setError] = useState('');
  const [height, setHeight] = useState(80), [poseWarning, setPoseWarning] = useState('');
  const heightRef = useRef(height);heightRef.current=height;
  useEffect(() => {
    const el = host.current!; let stopped = false, frame = 0, dirty = true, lastRender = 0;
    let renderer: T.WebGLRenderer; const soft = false;
    try { renderer = new T.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(2,devicePixelRatio)); }
    catch { setError('Die CAD-Ansicht benötigt WebGL. Bitte „Blech & Bahn · 2D“ wählen oder einen Browser mit aktivierter Hardwarebeschleunigung verwenden.'); return; }
    renderer.setClearColor(new T.Color(0xeef3f6),1);renderer.domElement.setAttribute('role','img');
    renderer.domElement.setAttribute('aria-label','Drehbare Roboteransicht mit zentral aufgehängtem Blech und räumlich wachsender Auftragsschicht');
    renderer.domElement.style.touchAction='none';el.appendChild(renderer.domElement);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(40,1,.01,30);camera.up.set(0,0,1);
    const controls = new OrbitControls(camera, renderer.domElement as unknown as HTMLElement);controls.enableDamping=!soft;
    controls.addEventListener('change',()=>{dirty=true;});
    scene.add(new T.HemisphereLight(0xffffff,0x5c6c7a,2.4));
    const light=new T.DirectionalLight(0xffffff,3);light.position.set(-2,3,4);scene.add(light);
    const fill=new T.DirectionalLight(0xe5eefb,.8);fill.position.set(2,-2,1);scene.add(fill);
    const fit=(close:boolean)=>{
      const c=latest.current.result.config;
      if(close){const span=Math.max(c.sheetWidth,c.sheetHeight)/1000;camera.position.set(SHEET_FRONT-span*1.65,SUSPENSION.y+span*.95,SUSPENSION.z+span*.6);controls.target.set(SHEET_FRONT-.03,SUSPENSION.y,SUSPENSION.z);}
      else {camera.position.set(-3.5,4,3);controls.target.set(.3,.1,.7);}
      controls.update();dirty=true;
    };fit(latest.current.profile);
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();dirty=true;};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    let layer:Layer|null=null, layerMesh:T.Mesh|null=null, result:Result|null=null;
    let robot:Awaited<ReturnType<typeof loadModels>>|null=null, path:T.LineSegments|null=null, past:T.LineSegments|null=null;
    const beam=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x3a9cae,transparent:true,opacity:.25}));scene.add(beam);
    const thicknessAxis=new T.Group();scene.add(thicknessAxis);let axisKey='';
    const coordinateAxes=new T.Group();scene.add(coordinateAxes);
    const clearDecorations=(group:T.Group)=>{group.traverse(o=>{if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}});dispose(group);group.clear();};
    const clearAxis=()=>clearDecorations(thicknessAxis);
    const label=(text:string,at:T.Vector3,parent=thicknessAxis)=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d')!;
      ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(0,0,512,96);ctx.font='44px system-ui';ctx.fillStyle='#173748';ctx.textAlign='center';ctx.fillText(text,256,64);
      const texture=new T.CanvasTexture(canvas);const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));sprite.position.copy(at);sprite.scale.set(.22,.041,1);sprite.renderOrder=210;parent.add(sprite);};
    const sheet=new T.Mesh(new T.BoxGeometry(.001,1,1),new T.MeshStandardMaterial({color:0xc6d0d8,metalness:.2,roughness:.6,side:T.DoubleSide}));scene.add(sheet);
    const abort=new AbortController();let seed:AxisValues=[...REFERENCE_POSES[1].axes],goalKey='';
    const line=(segments:number[],color:number,overlay=false)=>new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(segments,3)),overlay?tcpPathMaterial(color):new T.LineBasicMaterial({color}));
    const cutSurface=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color:0x673b9e,transparent:true,opacity:.14,side:T.DoubleSide,depthTest:false,depthWrite:false}));cutSurface.name='Ausgewählte Schnittebene';cutSurface.renderOrder=190;scene.add(cutSurface);
    const cutBorder=new T.LineLoop(new T.BufferGeometry(),tcpPathMaterial(0x673b9e));cutBorder.renderOrder=202;scene.add(cutBorder);
    const cutProfile=new T.Line(new T.BufferGeometry(),tcpPathMaterial(0x673b9e));cutProfile.renderOrder=204;scene.add(cutProfile);
    const tcpMarker=new T.Mesh(new T.SphereGeometry(.005,12,8),new T.MeshBasicMaterial({color:0xe49025,depthTest:false,depthWrite:false}));tcpMarker.name='Geplanter TCP auf der Zielfläche';tcpMarker.renderOrder=205;scene.add(tcpMarker);
    const update=(p:Props,growthHeight:number)=>{
      if(stopped||!robot)return;
      robot.cabin.visible=p.showCabin;robot.setWallsTransparent(p.transparentWalls);
      if(result!==p.result){
        result=p.result;goalKey='';
        if(layerMesh){scene.remove(layerMesh);dispose(layerMesh);}if(path){scene.remove(path);dispose(path);}if(past){scene.remove(past);dispose(past);}
        layer=makeLayer(result,soft?3:1);
        layerMesh=new T.Mesh(layer.geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.68,metalness:0,side:T.DoubleSide}));layerMesh.name='Überhöhte wachsende Auftragsschicht';scene.add(layerMesh);
        const c=result.config;sheet.scale.set(1,c.sheetWidth/1000,c.sheetHeight/1000);sheet.position.set(SHEET_FRONT+.0005,SUSPENSION.y,SUSPENSION.z);
        const vertices:number[]=[];
        for(const s of result.path.segments){const a=tcpPathPoint(result,s.a),b=tcpPathPoint(result,s.b);vertices.push(...a.toArray(),...b.toArray());}
        path=line(vertices,0xd7484c,true);path.renderOrder=203;path.name='Geplante TCP-Bahn auf der Zielfläche';scene.add(path);past=line([],0x007053,true);past.renderOrder=204;scene.add(past);
        clearDecorations(coordinateAxes);const origin=sheetPoint(result,{u:0,v:0});
        for(const [name,tip] of [['u',sheetPoint(result,{u:Math.min(120,c.sheetWidth*.35),v:0})],['v',sheetPoint(result,{u:0,v:Math.min(100,c.sheetHeight*.35)})]] as const){const delta=tip.clone().sub(origin);const arrow=new T.ArrowHelper(delta.clone().normalize(),origin,delta.length(),0x173748,.018,.009);arrow.traverse(o=>{o.renderOrder=206;if(o instanceof T.Mesh||o instanceof T.Line){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{m.depthTest=false;m.depthWrite=false;});}});coordinateAxes.add(arrow);label(`${name} / mm`,tip.clone().add(new T.Vector3(-.015,.015,-.015)),coordinateAxes);}
        fit(p.profile);
      }
      updateLayer(layer!,p.values,p.max,growthHeight,colorAt);
      const nextAxisKey=[p.result.config.sheetWidth,p.result.config.sheetHeight,p.max,growthHeight].join('/');
      if(axisKey!==nextAxisKey){clearAxis();axisKey=nextAxisKey;
        const origin=sheetPoint(p.result,{u:-30,v:p.result.config.sheetHeight});const end=origin.clone().add(new T.Vector3(-growthHeight/1000,0,0));
        const vertices=[...origin.toArray(),...end.toArray()];
        for(const f of [0,.5,1]){const at=origin.clone().lerp(end,f);vertices.push(...at.toArray(),...at.clone().add(new T.Vector3(0,-.012,0)).toArray());label(`${format(p.max*f)} µm`,at.clone().add(new T.Vector3(0,-.13,0)));}
        label('Trockenschicht',end.clone().add(new T.Vector3(0,-.13,.06)));thicknessAxis.add(line(vertices,0x173748));
      }
      cutSurface.visible=cutBorder.visible=cutProfile.visible=p.showCut;
      if(p.showCut){const points=sectionPlane(p.result,p.axis,p.cut,growthHeight*1.04);cutSurface.geometry.dispose();cutSurface.geometry=new T.BufferGeometry().setFromPoints(points);cutSurface.geometry.setIndex([0,1,2,0,2,3]);cutBorder.geometry.dispose();cutBorder.geometry=new T.BufferGeometry().setFromPoints(points);cutProfile.geometry.dispose();cutProfile.geometry=new T.BufferGeometry().setFromPoints(sectionCurve(p.result,p.values,p.axis,p.cut,p.max,growthHeight));}
      const pose=poseAt(p.result.path,p.time),c=p.result.config;
      tcpMarker.position.copy(tcpPathPoint(p.result,pose));
      const key=[pose.u.toFixed(4),pose.v.toFixed(4),c.brush.distance].join('/');
      let valid=goalKey===key;
      if(valid)setPoseWarning('');
      if(goalKey!==key){
        const solution=displayPose(p.result,pose,seed);valid=!!solution;
        if(solution){seed=solution.axes;robot.rig.setAxes(seed);robot.rig.setToolDistance(c.brush.distance);goalKey=key;setPoseWarning('');}
        else {setPoseWarning('Für diese Zielposition wurde keine Gelenkstellung gefunden. Der Roboter bleibt in der letzten darstellbaren Stellung; die geometrische Auftragsrechnung läuft unabhängig davon weiter.');}
      }
      const previous:number[]=[];
      for(const s of p.result.path.segments){if(s.start>=p.time)break;const f=Math.min(1,(p.time-s.start)/(s.end-s.start));
        const a=tcpPathPoint(p.result,s.a),b=tcpPathPoint(p.result,{u:s.a.u+(s.b.u-s.a.u)*f,v:s.a.v+(s.b.v-s.a.v)*f});previous.push(...a.toArray(),...b.toArray());}
      past!.geometry.dispose();past!.geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(previous,3));
      beam.visible=valid&&pose.spray&&c.brush.flow>0;
      if(beam.visible){
        const origin=new T.Vector3().setFromMatrixPosition(robot.rig.flange.matrixWorld.clone().multiply(toolMatrix(2)));
        const k=makeKernel(c.brush),vertices:number[]=[];
        for(let i=0;i<20;i++){const a=i/20*Math.PI*2;const hit=sheetPoint(p.result,{u:pose.u+(k.radius+2*k.sigma)*Math.cos(a),v:pose.v+(k.radius+2*k.sigma)*Math.sin(a)});vertices.push(...origin.toArray(),...hit.toArray());}
        beam.geometry.dispose();beam.geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3));
      }
      dirty=true;
    };
    const animate=(now:number)=>{
      if(stopped)return;controls.update();
      if(dirty&&(!soft||now-lastRender>160)){renderer.render(scene,camera);dirty=false;lastRender=now;}
      frame=requestAnimationFrame(animate);
    };frame=requestAnimationFrame(animate);
    loadModels(abort.signal,soft).then(loaded=>{
      if(stopped){dispose(loaded.rig.root);dispose(loaded.fixtures);dispose(loaded.cabin);return;}
      robot=loaded;scene.add(loaded.rig.root,loaded.fixtures,loaded.cabin);engine.current={update,fit};
      update(latest.current,heightRef.current);setStatus('Originalmodell: EcoRP 10 R1100 · EcoBell 2 EC · Werkstückaufhängung');dirty=true;
    }).catch(e=>{if(!stopped&&(e as Error).name!=='AbortError')setError((e as Error).message);});
    return()=>{stopped=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();engine.current=null;
      clearAxis();clearDecorations(coordinateAxes);dispose(scene);if(renderer instanceof T.WebGLRenderer)renderer.dispose();renderer.domElement.remove();};
  },[]);
  useEffect(()=>{engine.current?.update(props,height);},[props.result,props.values,props.time,props.max,props.axis,props.cut,props.showCut,props.showCabin,props.transparentWalls,height]);
  useEffect(()=>{engine.current?.fit(props.profile);},[props.profile]);
  return <div className="rb-robot-scene">
    <div className="rb-robot-host" ref={host} />
    {error?<p className="error" role="alert">{error}</p>:<p className="rb-small" role="status">{status}</p>}
    {poseWarning&&<p className="rb-notice" role="status">{poseWarning}</p>}
    <div className="rb-space-controls"><button onClick={()=>engine.current?.fit(false)}>Roboter & Kabine</button><button onClick={()=>engine.current?.fit(true)}>Blech-Nahansicht</button>
      <label>Überhöhung · Höhe bei Skalenmaximum: {height} mm<input aria-label="Darstellungshöhe am Skalenmaximum" type="range" min={5} max={200} step={5} value={height} onChange={e=>setHeight(Number(e.target.value))}/></label></div>
    <p className="rb-small">Bereinigte Kabine und vereinfachte Deckenhindernisse aus der Bahnplanungsapp. „Wände transparent“ verändert nur die Kabinenwände; Einrichtung und Boden bleiben sichtbar.</p>
    <p className="rb-small">Rot: geplante TCP-Bahn · Grün: abgefahren · Orange: geplanter TCP auf dem Blech. Die Bahn wird im Vordergrund gezeichnet und bleibt trotz überhöhter Lackschicht sichtbar. {props.showCut && <>Violette Schnittebene: {props.axis === 'u' ? 'v' : 'u'} = {format(props.cut)} mm.</>}</p>
    <p className="rb-small">Ziehen: drehen · Mausrad / zwei Finger: zoomen. Das Blech hängt zentral. Die Schicht wächst überhöht aus der Oberfläche zum Roboter; {format(props.max)} µm Modell-Trockenschichtdicke entsprechen hier {height} mm Darstellungshöhe. Die µm-Achse zeigt Modellwerte, die Geometrie ist überhöht. Der Maßstab bleibt über die Zeit konstant.</p>
  </div>;
}
