import type { Point, RGB, GT } from './types';
export const SIZE = 500;
export const descriptions = [
 'Glatte Schnittränder, keine Abplatzung.',
 'Kleine Abplatzungen an Schnittpunkten; bis 5 %.',
 'Abplatzungen an Schnittkanten und/oder Schnittpunkten; über 5 bis 15 %.',
 'Breite Streifen und teilweise oder vollständig verlorene Quadrate; über 15 bis 35 %.',
 'Ausgedehnte Streifen- und Quadratverluste; über 35 bis 65 %.',
 'Stärkere Ablösung als GT4; über 65 % als Flächenorientierung.'
];
export function formatNumber(n: number) {
 return n === 0 ? '0,0' : Math.abs(n) >= 1 ? n.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}) : n.toLocaleString('de-DE',{maximumSignificantDigits:4});
}
export function recommendedSpacing(thickness: number, substrate: 'hard'|'soft') {
 if (!Number.isFinite(thickness) || thickness <= 0 || thickness > 250) return undefined;
 return thickness <= 60 ? substrate === 'hard' ? 1 : 2 : thickness <= 120 ? 2 : 3;
}
export function areaGT(percent: number): GT {
 if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw Error('Ungültiger Flächenanteil.');
 return percent === 0 ? 0 : percent <= 5 ? 1 : percent <= 15 ? 2 : percent <= 35 ? 3 : percent <= 65 ? 4 : 5;
}
export function validCorners(p: Point[]) {
 if (p.length !== 4 || p.some(a=>!Number.isFinite(a.x)||!Number.isFinite(a.y))) return false;
 const cross=p.map((a,i)=>{const b=p[(i+1)%4],c=p[(i+2)%4];return (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)});
 return cross.every(v=>v>0.00001) && Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%4];return s+a.x*b.y-b.x*a.y},0))>0.0001;
}
// Homography maps the unit square to four source-image corners in clockwise order.
export function homography(p: Point[]) {
 if(!validCorners(p)) throw Error('Die vier Eckpunkte müssen ein konvexes Gitter in Reihenfolge oben links, oben rechts, unten rechts, unten links bilden.');
 const [a,b,c,d]=p, dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x;
 const dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y;
 const det=dx1*dy2-dx2*dy1;
 const g=Math.abs(dx3)+Math.abs(dy3)<1e-10?0:(dx3*dy2-dx2*dy3)/det;
 const h=Math.abs(dx3)+Math.abs(dy3)<1e-10?0:(dx1*dy3-dx3*dy1)/det;
 return [b.x-a.x+g*b.x,d.x-a.x+h*d.x,a.x,b.y-a.y+g*b.y,d.y-a.y+h*d.y,a.y,g,h];
}
export function mapPoint(m: number[],u:number,v:number):Point {
 const den=m[6]*u+m[7]*v+1; return {x:(m[0]*u+m[1]*v+m[2])/den,y:(m[3]*u+m[4]*v+m[5])/den};
}
export function rectify(data: Uint8ClampedArray,width:number,height:number,corners:Point[],size=SIZE) {
 const matrix=homography(corners.map(p=>({x:p.x*(width-1),y:p.y*(height-1)})));
 const out=new Uint8ClampedArray(size*size*4);
 for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
  const p=mapPoint(matrix,x/(size-1),y/(size-1)),sx=Math.max(0,Math.min(width-1,p.x)),sy=Math.max(0,Math.min(height-1,p.y));
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0;
  for(let c=0;c<3;c++) out[(y*size+x)*4+c]=(1-fy)*((1-fx)*data[(y0*width+x0)*4+c]+fx*data[(y0*width+x1)*4+c])+fy*((1-fx)*data[(y1*width+x0)*4+c]+fx*data[(y1*width+x1)*4+c]);
  out[(y*size+x)*4+3]=255;
 }
 return out;
}
// CIELAB perceptual color distance: references may include illuminated and shadowed paint.
export function lab(rgb: RGB):RGB {
 const lin=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
 const f=(t:number)=>t>.008856?Math.cbrt(t):7.787*t+16/116;
 const x=f((lin[0]*.4124564+lin[1]*.3575761+lin[2]*.1804375)/.95047),y=f(lin[0]*.2126729+lin[1]*.7151522+lin[2]*.072175),z=f((lin[0]*.0193339+lin[1]*.119192+lin[2]*.9503041)/1.08883);
 return [116*y-16,500*(x-y),200*(y-z)];
}
export function segment(data:Uint8ClampedArray,coat:RGB[],bare:RGB[],tolerance:number,kerf:number,size=SIZE) {
 if(!coat.length) throw Error('Mindestens eine Referenz für intakte Beschichtung markieren.');
 const ca=coat.map(lab),ba=bare.map(lab),out=new Uint8Array(size*size);
 const dist=(p:RGB,refs:RGB[])=>Math.min(...refs.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,offset=i*4;
  const near=(t:number)=>Math.abs(t/(size-1)*5-Math.round(t/(size-1)*5))*(size-1)/5;
  if(near(x)<=kerf/2||near(y)<=kerf/2){out[i]=3;continue;}
  const p=lab([data[offset],data[offset+1],data[offset+2]]),dc=dist(p,ca);
  if(ba.length){const db=dist(p,ba);out[i]=Math.abs(dc-db)<3?2:dc<db?0:1;}
  else out[i]=dc<=tolerance?0:dc>=tolerance+6?1:2;
 }
 return out;
}
// Fixed full-grid denominator. Kerfs are represented separately and not counted as damage.
export function summarizeMask(mask:ArrayLike<number>) {
 let missing=0,unknown=0,kerf=0;
 for(let i=0;i<mask.length;i++){if(mask[i]===1)missing++;else if(mask[i]===2)unknown++;else if(mask[i]===3)kerf++;}
 if(!mask.length) throw Error('Leere Auswertungsfläche.');
 return {percent:100*missing/mask.length,upper:100*(missing+unknown)/mask.length,unknown:100*unknown/mask.length,kerf:100*kerf/mask.length};
}
export function paintMask(mask: number[],x:number,y:number,radius:number,value:number,size=SIZE) {
 const next=mask.slice();
 for(let yy=Math.max(0,Math.floor(y-radius));yy<=Math.min(size-1,y+radius);yy++)for(let xx=Math.max(0,Math.floor(x-radius));xx<=Math.min(size-1,x+radius);xx++)if((xx-x)**2+(yy-y)**2<=radius**2)next[yy*size+xx]=value;
 return next;
}
