import * as T from 'three';
import armLetterFaces from './robot-arm-letter-faces.json';
const ARM_LETTERS=new Set(armLetterFaces.faces);

export const ROBOT_FINISHES={
 housing:{name:'Gehäuse · gebrochenes Weiß',color:0xe4e3dc,metalness:.12,roughness:.48},
 silver:{name:'Glocke / Gelenkdeckel · Silber',color:0xbcc5cc,metalness:.3,roughness:.32},
 joint:{name:'Handgelenk · Metallgrau',color:0x84929e,metalness:.55,roughness:.36},
 dark:{name:'Basis / Adapter · Anthrazit',color:0x252c34,metalness:.25,roughness:.53},
 blue:{name:'Kennzeichnung · Dunkelblau',color:0x234d72,metalness:.12,roughness:.48},
} as const;
type Finish=keyof typeof ROBOT_FINISHES;
// Both single and grouped CAD materials are solid robot collision geometry.
export function isRobotSolid(o:T.Object3D):o is T.Mesh{
 return o instanceof T.Mesh&&(Array.isArray(o.material)?o.material:[o.material]).every(m=>m instanceof T.MeshStandardMaterial);
}
export function applyRobotAppearance(robot:T.Object3D,tool:T.Object3D){
 function paint(mesh:T.Mesh,base:Finish,choose?:(a:T.Vector3,b:T.Vector3,c:T.Vector3,face:number)=>Finish){
  // Clone only where material groups are needed. Positions, triangles,
  // transforms and kinematic nodes stay identical to the supplied CAD.
  // The neutral GLB carries no normals. Shared CAD vertices supply smooth
  // normals without changing positions, topology or collision surfaces.
  mesh.geometry=mesh.geometry.clone();mesh.geometry.computeVertexNormals();
  const keys=Object.keys(ROBOT_FINISHES) as Finish[],materials=keys.map(key=>new T.MeshStandardMaterial({...ROBOT_FINISHES[key],side:T.DoubleSide}));
  if(!choose){mesh.material=materials[keys.indexOf(base)];materials.forEach(m=>{if(m!==mesh.material)m.dispose();});return;}
  const g=mesh.geometry.clone(),p=g.getAttribute('position'),index=g.index,count=index?index.count:p.count;
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),buckets=keys.map(()=>[] as number[]);g.clearGroups();
  for(let i=0;i<count;i+=3){const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);buckets[keys.indexOf(choose(a,b,c,i/3))].push(ia,ib,ic);}
  const indices:number[]=[];buckets.forEach((bucket,material)=>{if(!bucket.length)return;g.addGroup(indices.length,bucket.length,material);for(const vertex of bucket)indices.push(vertex);});g.setIndex(indices);mesh.geometry=g;mesh.material=materials;

 }
 robot.traverse(o=>{
  if(!(o instanceof T.Mesh))return;const id=Number(o.name.match(/HSF_shell_(\d+)/)?.[1]);
  if(id===112){paint(o,'dark');return;}
  if(id===60||id===49){paint(o,id===60?'joint':'silver');return;}
  if([24,27,30,33].includes(id)){paint(o,'dark');return;}
  if([12,15].includes(id)){paint(o,'blue');return;}
  if([18,21].includes(id)){paint(o,'housing');return;}
  if([12,15,18,21,117,120,123,126,129,132,135,138,141].includes(id)){paint(o,id<100?'joint':'dark');return;}
  if([90,101,79].includes(id)){
   paint(o,'housing',id===90?(_a,_b,_c,face)=>ARM_LETTERS.has(face)?'dark':'housing':undefined);
   const m=(Array.isArray(o.material)?o.material.find(m=>m.name===ROBOT_FINISHES.housing.name):o.material) as T.MeshStandardMaterial;
   // A per-fragment disk follows the existing cover surface. Unlike assigning
   // complete triangles, the circular edge cannot spill into neighbouring arm faces.
   const radius=id===79?55:64,depth=id===79?60:id===101?49:50;
   const centerZ=id===101?400:980;
   m.onBeforeCompile=shader=>{
    shader.uniforms.capColor={value:new T.Color(ROBOT_FINISHES.silver.color)};
    shader.vertexShader='varying vec3 cadPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncadPosition = position;');
    shader.fragmentShader='varying vec3 cadPosition;\nuniform vec3 capColor;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     float capRadius = length(cadPosition.xz - vec2(25.0, ${centerZ}.0));
     float capMask = (1.0 - smoothstep(${radius-.15}, ${radius+.15}, capRadius)) * step(${depth}.0, abs(cadPosition.y));
     diffuseColor.rgb = mix(diffuseColor.rgb, capColor, capMask);`);
   };
   m.customProgramCacheKey=()=>`cad-cover-${id}`;return;
  }
  paint(o,'housing');
 });
 tool.updateMatrixWorld(true);
 const axis=new T.Vector3(Math.sqrt(3)/2,0,.5),nozzle=new T.Vector3(.223368,0,.252515);
 tool.traverse(o=>{
  if(!(o instanceof T.Mesh))return;const id=Number(o.name.match(/HSF_shell_(\d+)/)?.[1]);
  if(id===10){paint(o,'silver');return;}
  // Adapter is visible as a darker mechanical connection to the wrist.
  if(id===13){paint(o,'joint');return;}
  const matrix=new T.Matrix4().makeRotationX(Math.PI/2).multiply(o.matrixWorld);
  paint(o,'housing',(a,b,c)=>{const p=a.clone().add(b).add(c).multiplyScalar(1/3).applyMatrix4(matrix).sub(nozzle),along=p.dot(axis),radius=p.clone().addScaledVector(axis,-along).length();return along>-.055&&radius<.052?'silver':'housing';});
 });
}
