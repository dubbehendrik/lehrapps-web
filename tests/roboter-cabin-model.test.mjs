import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { VRMLLoader } from 'three/addons/loaders/VRMLLoader.js';
import { prepareCabin, FLOOR_BOUNDS, REMOVED_PARTS, FLOOR_LABEL_PARTS } from '../src/apps/roboter-bahnplanung/robot/cabin-model';
import { CABIN_REFERENCE, overheadBounds } from '../src/apps/roboter-bahnplanung/robot/cabin-obstacles';
import { rotationFromDrag } from '../src/apps/roboter-bahnplanung/view-geometry';
const cad=new VRMLLoader().parse(gunzipSync(readFileSync('src/apps/roboter-bahnplanung/robot/assets/cabin.wrl.gz')).toString(),'');
const environment=prepareCabin(cad);
const meshes=[];environment.cabin.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o);});
const byId=(id)=>meshes.find(o=>o.userData.cabinPartId===id);
describe('Kabinenmodell aus dem aktuellen Bahnplaner',()=>{
 it('entfernt den alten Großboden, Raumlinien und Beschriftungsteile',()=>{
   const ids=meshes.map(o=>o.userData.cabinPartId).filter(Number.isFinite);
   expect(ids).not.toContain(4);
   ids.forEach(id=>{expect(REMOVED_PARTS.has(id)).toBe(false);expect(FLOOR_LABEL_PARTS.has(id)).toBe(false);});
   const floor=environment.cabin.getObjectByName('Begrenzter Kabinenboden');
   const b=new T.Box3().setFromObject(floor);
   expect(b.min.x).toBeCloseTo(FLOOR_BOUNDS.minX,6);expect(b.max.x).toBeCloseTo(FLOOR_BOUNDS.maxX,6);
   expect(b.max.z).toBeCloseTo(FLOOR_BOUNDS.top,6);
   const bounds=new T.Box3().setFromObject(environment.cabin);
   expect(bounds.min.x).toBeGreaterThanOrEqual(FLOOR_BOUNDS.minX-1e-6);expect(bounds.max.x).toBeLessThanOrEqual(FLOOR_BOUNDS.maxX+1e-6);
 });
 it('behält Einrichtung und separate Aufhängung/Sockel bei',()=>{
   for(const id of [988,990,991,994,995,1021,1022,1024])expect(byId(id)).toBeDefined();
   const ids=[];environment.fixtures.traverse(o=>{if(o instanceof T.Mesh)ids.push(o.userData.cabinPartId);});
   expect(ids.sort((a,b)=>a-b)).toEqual([933,1017,1018,1019]);
   environment.cabin.visible=false;expect(environment.fixtures.visible).toBe(true);environment.cabin.visible=true;
 });
 it('schaltet ausschließlich die acht Kabinenwände transparent und zurück auf deckend',()=>{
   expect(environment.walls).toHaveLength(8);
   for(const transparent of [true,false,true]){
     environment.setWallsTransparent(transparent);
     environment.walls.forEach(o=>{expect(o.material.transparent).toBe(transparent);expect(o.material.opacity).toBe(transparent?.14:1);expect(o.material.depthWrite).toBe(!transparent);});
     for(const id of [988,990,1021]){const m=byId(id).material;expect(m.transparent).toBe(false);expect(m.opacity).toBe(1);}
   }
 });
 it('übernimmt Deckenvorsprung und Querprofil samt Bodenbezug und Wandanschluss',()=>{
   const h=environment.cabin.getObjectByName('Gemessene Deckenhindernisse');expect(h).toBeDefined();
   const [box,beam]=overheadBounds();
   expect(box.min[2]-CABIN_REFERENCE.floor).toBeCloseTo(2.180,10);expect(box.max[2]).toBeCloseTo(CABIN_REFERENCE.ceiling,10);
   expect(beam.max[1]-beam.min[1]).toBeCloseTo(.180,10);
   const visual=h.getObjectByName('Deckenvorsprung · sichtbarer Anschluss an Kabinenwand');
   expect(new T.Box3().setFromObject(visual).max.x).toBeCloseTo(2.114,6);
 });
});
describe('Ziehrichtung des 3D-Schichtprofils',()=>{
 it('kehrt horizontale und vertikale Rotation gegenüber der alten Steuerung um',()=>{
   expect(rotationFromDrag(-35,55,80,50)).toEqual({yaw:-67,pitch:40});
   expect(rotationFromDrag(-35,55,-80,-50)).toEqual({yaw:-3,pitch:70});
 });
 it('bleibt bei großen Mausbewegungen innerhalb der Kamera-Grenzen',()=>{
   expect(rotationFromDrag(0,55,10000,10000)).toEqual({yaw:-180,pitch:20});
   expect(rotationFromDrag(0,55,-10000,-10000)).toEqual({yaw:180,pitch:85});
 });
});
