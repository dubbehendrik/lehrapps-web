import * as THREE from 'three';

// Dimensions, controller limits and tool frames: supplied KRC $machine.dat /
// $config.dat. Joint-axis convention cross-checked against ROS-Industrial:
// https://github.com/ros-industrial/kuka_experimental/blob/melodic-devel/kuka_kr10_support/urdf/kr10r1100sixx_macro.xacro
// The HSF mesh zero pose already uses controller joint angles. Do not apply
// $MAMES a second time. Source mesh origin is 400 mm above the mounting plane.

export type AxisValues = [number,number,number,number,number,number];
export const JOINTS = [
 {name:'A1',min:-170,max:170,pivot:[0,0,0],axis:[0,0,-1]},
 {name:'A2',min:-190,max:45,pivot:[.025,0,0],axis:[0,1,0]},
 {name:'A3',min:-120,max:156,pivot:[.585,0,0],axis:[0,1,0]},
 {name:'A4',min:-185,max:185,pivot:[.585,0,.035],axis:[-1,0,0]},
 {name:'A5',min:-120,max:120,pivot:[1.1,0,.035],axis:[0,1,0]},
 {name:'A6',min:-350,max:350,pivot:[1.18,0,.035],axis:[-1,0,0]},
] as const;

// Manually transcribed from the Achsposition panel in Medien2.mp4.
// These are sampled poses, not a recorded/interpolated robot program.
export const REFERENCE_POSES:{name:string;videoSeconds:number;axes:AxisValues}[] = [
 {name:'Video · 0 s',videoSeconds:0,axes:[82.87,-52.83,63.44,-54.38,38.42,67.30]},
 {name:'Video · 15 s',videoSeconds:15,axes:[40.46,-83.78,108.69,3.24,21.55,-130.67]},
 {name:'Video · 30 s',videoSeconds:30,axes:[45.08,-61.03,117.47,170.34,15.05,-293.04]},
];
export const TOOLS = [
 {id:2,name:'Düse / Tool 2',position:[.223368,0,.252515]},
 {id:3,name:'TCP 150 mm / Tool 3',position:[.353272,0,.327515]},
 {id:4,name:'TCP 200 mm / Tool 4',position:[.396573,0,.352515]},
 {id:5,name:'TCP 250 mm / Tool 5',position:[.439875,0,.377515]},
] as const;
export type Mount = {x:number;y:number;z:number;yaw:number};
export const DEFAULT_MOUNT:Mount={x:0,y:0,z:0,yaw:0};

export function axisMatrix(index:number,degrees:number) {
 const joint=JOINTS[index];
 if(!joint || !Number.isFinite(degrees))throw Error('Ungültiger Achswert.');
 const pivot=new THREE.Vector3(...joint.pivot);
 return new THREE.Matrix4().makeTranslation(pivot)
  .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...joint.axis),THREE.MathUtils.degToRad(degrees)))
  .multiply(new THREE.Matrix4().makeTranslation(pivot.clone().negate()));
}

export function validateAxes(axes:readonly number[]):AxisValues {
 if(axes.length!==6 || axes.some((value,index)=>!Number.isFinite(value)||value<JOINTS[index].min||value>JOINTS[index].max))throw Error('Achswerte außerhalb der Softwaregrenzen.');
 return [...axes] as AxisValues;
}

/** A separate FK calculation, independent of the imported mesh scene graph. */
export function flangeMatrix(axes:readonly number[]) {
 const values=validateAxes(axes);
 const result=new THREE.Matrix4().makeTranslation(0,0,.4);
 values.forEach((angle,index)=>result.multiply(axisMatrix(index,angle)));
 return result.multiply(new THREE.Matrix4().makeTranslation(1.18,0,.035))
  .multiply(new THREE.Matrix4().makeRotationY(Math.PI/2));
}

export function toolMatrix(toolId:number) {
 const tool=TOOLS.find(item=>item.id===toolId);
 if(!tool)throw Error('Unbekanntes Werkzeug.');
 return new THREE.Matrix4().makeTranslation(new THREE.Vector3(...tool.position))
  .multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(-30)));
}

/** Virtual TCP along the calibrated nozzle's +X direction. No TOOL_DATA write. */
export function distanceToolMatrix(distanceMm:number){
 if(!Number.isFinite(distanceMm)||distanceMm<0||distanceMm>1000)throw Error('Ungültiger virtueller Werkzeugabstand.');
 return toolMatrix(2).multiply(new THREE.Matrix4().makeTranslation(distanceMm/1000,0,0));
}

export function createRobotRig(robotScene:THREE.Group,toolScene:THREE.Group) {
 const root=new THREE.Group();root.name='Roboterbasis auf Kabinensockel';
 const cad=new THREE.Group();cad.name='HSF zu Roboterbasis';cad.rotation.x=Math.PI/2;cad.position.z=.4;
 root.add(cad);cad.add(robotScene);
 const links=JOINTS.map((_,index)=>{
  const link=robotScene.getObjectByName(`r2s-k${index+2}`);
  if(!link)throw Error(`Roboterglied ${index+2} fehlt.`);
  link.matrixAutoUpdate=false;return link;
 });
 const flange=robotScene.getObjectByName('r2s-toolframe');
 if(!flange)throw Error('Werkzeugrahmen fehlt.');
 const toolCad=new THREE.Group();toolCad.name='EcoBell mit Adapter';toolCad.rotation.x=Math.PI/2;
 flange.add(toolCad);toolCad.add(toolScene);
 const helperGroup=new THREE.Group();root.add(helperGroup);
 helperGroup.add(new THREE.AxesHelper(.2));
 const flangeAxes=new THREE.AxesHelper(.12);flange.add(flangeAxes);
 const tcp=new THREE.Group();tcp.name='Aktiver TCP';flange.add(tcp);
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.009,12,8),new THREE.MeshBasicMaterial({color:0xe05a13}));tcp.add(dot);
 const tcpAxes=new THREE.AxesHelper(.1);tcp.add(tcpAxes);
 const rayGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...TOOLS[0].position),new THREE.Vector3(...TOOLS[3].position)]);
 const distanceLine=new THREE.Line(rayGeometry,new THREE.LineBasicMaterial({color:0xe05a13}));flange.add(distanceLine);
 let angles=REFERENCE_POSES[1].axes;
 function setAxes(next:readonly number[]){angles=validateAxes(next);links.forEach((link,index)=>link.matrix.copy(axisMatrix(index,angles[index])));root.updateMatrixWorld(true);}
 function setTool(id:number){const tool=TOOLS.find(item=>item.id===id);if(!tool)throw Error('Unbekanntes Werkzeug.');tcp.position.fromArray(tool.position);tcp.rotation.set(0,THREE.MathUtils.degToRad(-30),0);distanceLine.geometry.setFromPoints([new THREE.Vector3(...TOOLS[0].position),new THREE.Vector3(...tool.position)]);root.updateMatrixWorld(true);}
 function setToolDistance(mm:number){const m=distanceToolMatrix(mm);tcp.position.setFromMatrixPosition(m);tcp.quaternion.setFromRotationMatrix(m);distanceLine.geometry.setFromPoints([new THREE.Vector3(...TOOLS[0].position),tcp.position.clone()]);root.updateMatrixWorld(true);}
 function setMount(mount:Mount){if(!Object.values(mount).every(Number.isFinite))throw Error('Ungültige Einbaulage.');root.position.set(mount.x/1000,mount.y/1000,mount.z/1000);root.rotation.z=THREE.MathUtils.degToRad(mount.yaw);root.updateMatrixWorld(true);}
 function showHelpers(visible:boolean){helperGroup.visible=visible;flangeAxes.visible=visible;tcpAxes.visible=visible;}
 setAxes(angles);setTool(5);showHelpers(false);
 return {root,flange,tcp,links,setAxes,setTool,setToolDistance,setMount,showHelpers};
}
