import { describe,it,expect } from 'vitest';
import { detectGrid } from '../src/apps/gitterschnitt/grid';
import { homography,mapPoint } from '../src/apps/gitterschnitt/logic';
const size=240;
function render(corners:{x:number;y:number}[],count=6){
 const data=new Uint8ClampedArray(size*size*4);for(let i=0;i<size*size;i++){data[i*4]=data[i*4+1]=data[i*4+2]=60;data[i*4+3]=255;}
 const m=homography(corners);const lines=[];
 for(let k=0;k<count;k++){const t=k/(count-1);lines.push([mapPoint(m,t,-.08),mapPoint(m,t,1.08)],[mapPoint(m,-.08,t),mapPoint(m,1.08,t)]);}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)for(const [a,b] of lines){const dx=b.x-a.x,dy=b.y-a.y,t=((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy);if(t>=0&&t<=1&&Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<1.2){for(let c=0;c<3;c++)data[(y*size+x)*4+c]=220;break;}}
 return data;
}
describe('Gittervorschlag',()=>{
 it('findet sechs Schnitte je Richtung und die äußeren Ecken',()=>{const c=[{x:45,y:40},{x:195,y:40},{x:195,y:190},{x:45,y:190}];const r=detectGrid(render(c),size,size);expect(r.status).toBe('suggested');r.corners!.forEach((p,i)=>{expect(p.x).toBeCloseTo(c[i].x/(size-1),1);expect(p.y).toBeCloseTo(c[i].y/(size-1),1)})});
 it('findet ein gedrehtes Gitter',()=>{const c=[{x:70,y:25},{x:210,y:70},{x:165,y:210},{x:25,y:165}];const r=detectGrid(render(c),size,size);expect(r.status).toBe('suggested');r.corners!.forEach((p,i)=>expect(Math.hypot(p.x-c[i].x/(size-1),p.y-c[i].y/(size-1))).toBeLessThan(.04))});
 it('erkennt leicht perspektivische Linien',()=>{const c=[{x:55,y:40},{x:185,y:48},{x:200,y:195},{x:40,y:190}];const r=detectGrid(render(c),size,size);expect(r.status).toBe('suggested');r.corners!.forEach((p,i)=>expect(Math.hypot(p.x-c[i].x/(size-1),p.y-c[i].y/(size-1))).toBeLessThan(.06))});
 it('lehnt gleichmäßige Fläche und zu kleine Bilder ab',()=>{expect(detectGrid(new Uint8ClampedArray(size*size*4).fill(128),size,size).status).toBe('not-found');expect(detectGrid(new Uint8ClampedArray(4),1,1).status).toBe('not-found')});
 it('lehnt ein Raster mit nur fünf Schnittlinien ab',()=>{expect(detectGrid(render([{x:40,y:40},{x:200,y:40},{x:200,y:200},{x:40,y:200}],5),size,size).status).toBe('not-found')});
});
