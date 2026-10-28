import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLLoader } from 'three/addons/loaders/VRMLLoader.js';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import { gunzipSync, strFromU8 } from 'fflate';
import robotUrl from './assets/robot.glb?url';
import toolUrl from './assets/tool.glb?url';
import cabinUrl from './assets/cabin.wrl.gz?url';
import { applyRobotAppearance } from './robot-appearance';
import { createRobotRig } from './robot-kinematics';

function decodeCabin(buffer:ArrayBuffer){const b=new Uint8Array(buffer);return strFromU8(b[0]===31&&b[1]===139?gunzipSync(b):b);}
export function dispose(root:T.Object3D){
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
  root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
export async function loadModels(signal:AbortSignal,software:boolean){
  const bytes=async(url:string)=>{const r=await fetch(url,{signal});if(!r.ok)throw Error('CAD-Modell konnte nicht geladen werden.');return r.arrayBuffer();};
  const glb=async(url:string)=>(await new GLTFLoader().parseAsync(await bytes(url),'')).scene;
  const settled=await Promise.allSettled([glb(robotUrl),glb(toolUrl),bytes(cabinUrl)]);
  const rejected=settled.find(r=>r.status==='rejected');
  if(rejected?.status==='rejected'){
    settled.forEach(r=>{if(r.status==='fulfilled'&&r.value instanceof T.Object3D)dispose(r.value);});throw rejected.reason;
  }
  const robot=(settled[0] as PromiseFulfilledResult<T.Group>).value,tool=(settled[1] as PromiseFulfilledResult<T.Group>).value;
  let cab:T.Object3D|undefined;
  try{
    cab=new VRMLLoader().parse(decodeCabin((settled[2] as PromiseFulfilledResult<ArrayBuffer>).value),'');
    if(signal.aborted)throw new DOMException('Abgebrochen','AbortError');
    if(software){
      // Only the fallback display is decimated. The imported articulated hierarchy stays intact.
      const modifier=new SimplifyModifier();
      for(const root of [robot,tool]){
        const meshes:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});
        for(const o of meshes){
          const triangles=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;
          if(triangles>250){const original=o.geometry;const keep=Math.max(.04,Math.min(1,900/triangles));o.geometry=await modifier.modify(original,Math.floor(original.getAttribute('position').count*(1-keep)));original.dispose();}
          o.geometry.computeVertexNormals();const id=Number(o.name.match(/HSF_shell_(\d+)/)?.[1]);
          const color=[112,24,27,30,33].includes(id)?0x252c34:[49,60,10,13].includes(id)?0x9daab4:[12,15].includes(id)?0x234d72:0xe4e3dc;
          (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());
          o.material=new T.MeshStandardMaterial({color,roughness:.55,metalness:.1,side:T.DoubleSide});
        }
      }
    }else applyRobotAppearance(robot,tool);
    const rig=createRobotRig(robot,tool),fixtures=new T.Group();fixtures.name='Originale Werkstückaufhängung und Sockel';
    cab.updateMatrixWorld(true);let index=0;const owners=new Map<T.Object3D,number>();const retained:T.Mesh[]=[];
    cab.traverse(o=>{if(!(o instanceof T.Mesh))return;let owner=o.parent;while(owner&&!owner.name.startsWith('part_'))owner=owner.parent;owner=owner||o;
      if(!owners.has(owner))owners.set(owner,++index);const id=owners.get(owner)!;
      if([933,1017,1018,1019].includes(id)){const clone=o.clone();clone.geometry=o.geometry.clone();clone.matrixAutoUpdate=false;clone.matrix.copy(o.matrixWorld);clone.material=new T.MeshStandardMaterial({color:id===933?0x74838e:0x3d4850,roughness:.65,metalness:.2,side:T.DoubleSide});retained.push(clone);o.visible=false;}
      else {(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());o.material=new T.MeshStandardMaterial({color:0xb7c6d0,roughness:.8,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide});}
    });retained.forEach(o=>fixtures.add(o));const cabin=cab;cabin.name='Lackierkabine';cab=undefined;
    return {rig,fixtures,cabin};
  }catch(e){dispose(robot);dispose(tool);if(cab)dispose(cab);throw e;}
}
