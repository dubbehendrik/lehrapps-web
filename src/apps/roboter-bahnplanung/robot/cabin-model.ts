import * as T from 'three';
import classification from './cabin-classification.json';
import { createOverheadObstacles } from './cabin-obstacles';

/** Same scene preparation as PlannerScene.tsx / robot-motion.ts in
 * dubbehendrik/lackierroboter-dev @ 5ed97d773ae52cea82eafde169b3c798ee19aa84.
 * Raw cabin SHA: f47c7d453769d9d38f9a7d2f75e1847ea7e88462 (unchanged CAD).
 */
export const FLOOR_BOUNDS={minX:-3.6,maxX:2.3,minY:-1.65,maxY:2.05,top:-.52};
export const REMOVED_PARTS=new Set([934,...Array.from({length:11},(_,i)=>948+i)]);
export const FLOOR_LABEL_PARTS=new Set([1,2,3,...Array.from({length:11},(_,i)=>922+i),...Array.from({length:11},(_,i)=>948+i),...Array.from({length:12},(_,i)=>975+i)]);
const FIXTURES=new Set([933,1017,1018,1019]);
function release(mesh:T.Mesh|T.Line){mesh.geometry.dispose();(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(m=>m.dispose());}
export function prepareCabin(cad:T.Object3D) {
  cad.updateMatrixWorld(true);
  const cabin=new T.Group();cabin.name='Bereinigte Lackierkabine aus Bahnplanungsapp';cabin.add(cad);
  const fixtures=new T.Group();fixtures.name='Originale Werkstückaufhängung und Sockel';
  const walls:T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>[]=[];
  const parts:{mesh:T.Mesh;id:number}[]=[],owners=new Map<T.Object3D,number>();
  cad.traverse(o=>{
    if(!(o instanceof T.Mesh))return;
    let owner=o.parent;while(owner&&!owner.name.startsWith('part_'))owner=owner.parent;owner=owner||o;
    if(!owners.has(owner))owners.set(owner,owners.size+1);
    const id=owners.get(owner)!,key=`part-${String(id).padStart(4,'0')}`;
    const category=(classification.assignments as Record<string,{category:string}>)[key]?.category||key;
    const old=Array.isArray(o.material)?o.material[0]:o.material;
    const color=old instanceof T.MeshPhongMaterial?old.color.clone():new T.Color(0xbac4cc);
    o.material=new T.MeshStandardMaterial({color:id===933?0x626a73:color,roughness:.7,metalness:.1,side:T.DoubleSide});
    o.userData.cabinPartId=id;o.userData.cabinCategory=category;
    parts.push({mesh:o,id});
    if(category==='Kabine / Wand')walls.push(o as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>);
  });
  for(const {mesh,id} of parts){
    if(id===4||REMOVED_PARTS.has(id)||FLOOR_LABEL_PARTS.has(id)){mesh.removeFromParent();release(mesh);}
    else if(FIXTURES.has(id)){
      // Keep the existing teaching-sheet mount visible when the surrounding cabin is hidden.
      const world=mesh.matrixWorld.clone();mesh.removeFromParent();fixtures.add(mesh);mesh.matrixAutoUpdate=false;mesh.matrix.copy(world);mesh.matrixWorldNeedsUpdate=true;
    }
  }
  const oldLines:T.Line[]=[];
  cad.traverse(o=>{if(o instanceof T.Line){const b=new T.Box3().setFromObject(o);if(b.min.x<FLOOR_BOUNDS.minX||b.max.x>FLOOR_BOUNDS.maxX||b.min.y<FLOOR_BOUNDS.minY||b.max.y>FLOOR_BOUNDS.maxY)oldLines.push(o);}});
  oldLines.forEach(o=>{o.removeFromParent();release(o);});
  const b=FLOOR_BOUNDS,floor=new T.Mesh(new T.BoxGeometry(b.maxX-b.minX,b.maxY-b.minY,.05),new T.MeshStandardMaterial({color:0x929b9e,roughness:.9}));
  floor.name='Begrenzter Kabinenboden';floor.position.set((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,b.top-.025);cabin.add(floor);
  const overhead=createOverheadObstacles();cabin.add(overhead.group);
  let transparent:boolean|undefined;
  const setWallsTransparent=(value:boolean)=>{
    if(value===transparent)return;transparent=value;
    walls.forEach(o=>{const m=o.material;m.transparent=value;m.opacity=value?.14:1;m.depthWrite=!value;m.needsUpdate=true;});
  };
  setWallsTransparent(true);
  return {cabin,fixtures,walls,setWallsTransparent};
}
