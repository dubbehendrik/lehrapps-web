// Synchronized from dubbehendrik/lackierroboter-dev @ 5ed97d773ae52cea82eafde169b3c798ee19aa84.
import * as T from 'three';

// Interior CAD faces, in metres. +X faces the filter; +Y is left when facing it.
// Floor is z=-0.520 in the supplied model, not the robot-base zero plane.
export const CABIN_REFERENCE={floor:-.520,filter:1.214,backWall:2.114,left:1.635,right:-1.435,opposite:-2.006,ceiling:2.340};
// User measurements: 1100 mm projection, 2180 mm clear height including lamps,
// 680 mm drop; beam 180 x 60 mm, near edge 1650 mm from left wall, 300 mm higher.
export const OVERHEAD_MEASUREMENTS={projection:1.100,clearHeight:2.180,drop:.680,beamWidth:.180,beamHeight:.060,beamNearEdgeFromLeft:1.650,beamRise:.300};
export function overheadBounds(){
 const c=CABIN_REFERENCE,m=OVERHEAD_MEASUREMENTS,front=c.filter-m.projection,bottom=c.floor+m.clearHeight,near=c.left-m.beamNearEdgeFromLeft;
 return [
  {name:'Deckenvorsprung einschließlich Leuchten · vereinfacht',min:[front,c.right,bottom],max:[c.filter,c.left,bottom+m.drop]},
  {name:'Oberes Querprofil · vereinfacht',min:[c.opposite,near-m.beamWidth,bottom+m.beamRise],max:[front,near,bottom+m.beamRise+m.beamHeight]},
 ] as const;
}
export function createOverheadObstacles(){
 const group=new T.Group();group.name='Gemessene Deckenhindernisse';
 const meshes=overheadBounds().map((b,i)=>{
  const min=new T.Vector3(...b.min),max=new T.Vector3(...b.max),size=max.clone().sub(min);
  const geometry=new T.BoxGeometry(size.x,size.y,size.z),material=new T.MeshStandardMaterial({color:i?0x73818a:0x8d989f,transparent:true,opacity:i?.13:.20,depthWrite:false,roughness:.9,side:T.DoubleSide});
  const mesh=new T.Mesh(geometry,material);mesh.name=b.name;mesh.position.copy(min).add(max).multiplyScalar(.5);group.add(mesh);
  // Extend only the visible envelope behind the filter, keeping measured
  // collision and spray-projection meshes unchanged.
  let display=mesh;
  if(i===0){material.visible=false;const visualSize=size.clone();visualSize.x=CABIN_REFERENCE.backWall-min.x;const visualMaterial=material.clone();visualMaterial.visible=true;display=new T.Mesh(new T.BoxGeometry(visualSize.x,visualSize.y,visualSize.z),visualMaterial);display.name='Deckenvorsprung · sichtbarer Anschluss an Kabinenwand';display.position.copy(mesh.position);display.position.x=(min.x+CABIN_REFERENCE.backWall)/2;group.add(display);}
  const edge=new T.LineSegments(new T.EdgesGeometry(display.geometry),new T.LineBasicMaterial({color:0x687883,transparent:true,opacity:i?.35:.45}));edge.position.copy(display.position);group.add(edge);return mesh;
 });
 const setVisible=(visible:boolean)=>{group.visible=visible;meshes.forEach(mesh=>mesh.visible=visible);};
 return {group,meshes,setVisible};
}
