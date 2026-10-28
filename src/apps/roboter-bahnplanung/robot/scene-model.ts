import * as T from 'three';
import { section, type Point, type Result } from '../model';
import { sectionEndpoints } from '../view-geometry';
export { sectionEndpoints } from '../view-geometry';
import { inverseTCP } from './robot-ik';
import { distanceToolMatrix, type AxisValues } from './robot-kinematics';

// Original suspension CAD: x 1.074..1.079, y -.445...645, z .341301...801301 m.
export const SUSPENSION = { x: 1.074, y: .1, z: .571301, width: 1.09, height: .46 };
export const SHEET_FRONT = SUSPENSION.x - .012;
export function sheetPoint(r: Result, p: Point, growth = 0): T.Vector3 {
  return new T.Vector3(SHEET_FRONT - growth,
    SUSPENSION.y + (p.u - r.config.sheetWidth / 2) / 1000,
    SUSPENSION.z + (r.config.sheetHeight / 2 - p.v) / 1000);
}
/** Same tool orientation as the development planner. Display pose only. */
export function displayPose(r: Result, p: Point, seed?: AxisValues) {
  const target = new T.Matrix4().makeTranslation(sheetPoint(r, p))
    .multiply(new T.Matrix4().makeRotationX(T.MathUtils.degToRad(146.3)));
  return inverseTCP(target, distanceToolMatrix(r.config.brush.distance), seed);
}
export type Layer = { geometry: T.BufferGeometry; nx: number; ny: number; grid: number[]; boundary: number[]; baseStart: number };
export function makeLayer(r: Result, stride = 1): Layer {
  const picks = (n: number) => [...Array.from({length: Math.ceil((n - 1) / stride)}, (_,i)=>i*stride), n-1];
  const ii = picks(r.u.length), jj = picks(r.v.length);
  const u = [0, ...ii.map(i=>r.u[i]), r.config.sheetWidth], v = [0, ...jj.map(j=>r.v[j]), r.config.sheetHeight];
  const nx = u.length, ny = v.length, grid: number[] = [], positions: number[] = [], indices: number[] = [];
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const p=sheetPoint(r,{u:u[i],v:v[j]});positions.push(...p.toArray());
    grid.push(jj[Math.max(0,Math.min(jj.length-1,j-1))]*r.u.length+ii[Math.max(0,Math.min(ii.length-1,i-1))]);
    if(i<nx-1&&j<ny-1){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;indices.push(a,c,b,b,c,d);}
  }
  const boundary:number[]=[];
  for(let i=0;i<nx;i++)boundary.push(i);
  for(let j=1;j<ny;j++)boundary.push(j*nx+nx-1);
  for(let i=nx-2;i>=0;i--)boundary.push((ny-1)*nx+i);
  for(let j=ny-2;j>0;j--)boundary.push(j*nx);
  const baseStart=nx*ny;
  boundary.forEach((index,k)=>{positions.push(...positions.slice(index*3,index*3+3));const next=(k+1)%boundary.length;indices.push(index,baseStart+k,boundary[next],boundary[next],baseStart+k,baseStart+next);});
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(positions.length),3));geometry.setIndex(indices);
  return {geometry,nx,ny,grid,boundary,baseStart};
}
/** Absolute scale stays fixed across time and A/B; growth moves towards the robot (-X). */
export function updateLayer(layer:Layer,values:Float32Array,max:number,heightAtMaxMm:number,color:(t:number)=>number[]) {
  const position=layer.geometry.getAttribute('position'),colors=layer.geometry.getAttribute('color');
  layer.grid.forEach((index,k)=>{
    const ratio=Math.max(0,Math.min(1,values[index]/Math.max(max,1e-12)));
    position.setX(k,SHEET_FRONT-.0003-ratio*heightAtMaxMm/1000);
    const c=color(ratio);const rgb=new T.Color(`rgb(${c.join(',')})`);colors.setXYZ(k,rgb.r,rgb.g,rgb.b);
  });
  layer.boundary.forEach((index,k)=>{const j=layer.baseStart+k;position.setX(j,SHEET_FRONT);colors.setXYZ(j,colors.getX(index)*.8,colors.getY(index)*.8,colors.getZ(index)*.8);});
  position.needsUpdate=true;colors.needsUpdate=true;layer.geometry.computeVertexNormals();layer.geometry.computeBoundingSphere();
}

/** Virtual process TCP is on the sheet; nozzle position is a different frame. */
export const tcpPathPoint = (r: Result, p: Point) => sheetPoint(r, p);
export function sectionPlane(r: Result, axis: 'u' | 'v', position: number, heightMm: number) {
  const [a,b]=sectionEndpoints(r,axis,position);
  return [sheetPoint(r,a),sheetPoint(r,b),sheetPoint(r,b,heightMm/1000),sheetPoint(r,a,heightMm/1000)];
}
export function sectionCurve(r: Result, values: Float32Array, axis: 'u' | 'v', position: number, max: number, heightMm: number) {
  const [a]=sectionEndpoints(r,axis,position), heights=section(r,values,axis,position), coords=axis==='u'?r.u:r.v;
  return coords.map((coordinate,i)=>sheetPoint(r,axis==='u'?{u:coordinate,v:a.v}:{u:a.u,v:coordinate},Math.max(0,heights[i])/Math.max(max,1e-12)*heightMm/1000));
}
/** Overlay at the true TCP coordinates, even when an exaggerated layer covers them. */
export function tcpPathMaterial(color: number) {
  return new T.LineBasicMaterial({color,depthTest:false,depthWrite:false});
}
