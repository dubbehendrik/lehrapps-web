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
import { prepareCabin } from './cabin-model';

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
    const rig=createRobotRig(robot,tool),environment=prepareCabin(cab);cab=undefined;
    return {rig,...environment};
  }catch(e){dispose(robot);dispose(tool);if(cab)dispose(cab);throw e;}
}
