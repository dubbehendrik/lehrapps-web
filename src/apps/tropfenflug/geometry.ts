import type {Point,Parameters} from './types';
export const domain={x0:-.1,x1:.55,y0:-.25,y1:.25};
export const editor={x0:.08,x1:.45,y0:-.15,y1:.15};
export const templates:Record<string,Point[]>={
 'Ebene Platte':[{x:.25,y:-.12},{x:.27,y:-.12},{x:.27,y:.12},{x:.25,y:.12}],
 'Winkel':[{x:.22,y:.12},{x:.32,y:.12},{x:.32,y:-.12},{x:.30,y:-.12},{x:.30,y:.10},{x:.22,y:.10}],
 'U-Profil':[{x:.20,y:.12},{x:.32,y:.12},{x:.32,y:-.12},{x:.20,y:-.12},{x:.20,y:-.10},{x:.30,y:-.10},{x:.30,y:.10},{x:.20,y:.10}],
 'Tasche':[{x:.22,y:.13},{x:.33,y:.13},{x:.33,y:-.13},{x:.22,y:-.13},{x:.22,y:-.07},{x:.29,y:-.07},{x:.29,y:.07},{x:.22,y:.07}],
};
export const inside=(p:Point,poly:Point[])=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
}return yes;};
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
/** Earliest segment intersection, including collinear overlapping edges. */
export function segmentHit(a:Point,b:Point,c:Point,d:Point):number|null{
 const r={x:b.x-a.x,y:b.y-a.y},s={x:d.x-c.x,y:d.y-c.y},v={x:c.x-a.x,y:c.y-a.y};const den=cross(r,s);
 if(Math.abs(den)<1e-14){if(Math.abs(cross(v,r))>1e-12)return null;const rr=r.x*r.x+r.y*r.y;if(!rr)return null;
 const t0=(v.x*r.x+v.y*r.y)/rr,t1=t0+(s.x*r.x+s.y*r.y)/rr;const lo=Math.max(0,Math.min(t0,t1)),hi=Math.min(1,Math.max(t0,t1));return lo<=hi?lo:null;}
 const t=cross(v,s)/den,u=cross(v,r)/den;return t>=-1e-10&&t<=1+1e-10&&u>=-1e-10&&u<=1+1e-10?Math.max(0,Math.min(1,t)):null;
}
export function polygonHit(a:Point,b:Point,poly:Point[]):number|null{
 if(inside(a,poly))return 0;let best:number|null=null;for(let i=0;i<poly.length;i++){const t=segmentHit(a,b,poly[i],poly[(i+1)%poly.length]);if(t!==null&&(best===null||t<best))best=t;}return best;
}
export function validatePolygon(poly:Point[]):string|null{
 if(poly.length<3)return 'Mindestens drei Eckpunkte setzen.';if(poly.length>40)return 'Maximal 40 Eckpunkte verwenden.';
 if(poly.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<editor.x0||p.x>editor.x1||p.y<editor.y0||p.y>editor.y1))return 'Das Bauteil muss im markierten Zeichenbereich liegen.';
 let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(Math.hypot(b.x-a.x,b.y-a.y)<.01-1e-10)return 'Zwischen Eckpunkten mindestens 10 mm Abstand lassen.';area+=a.x*b.y-b.x*a.y;
 for(let j=i+1;j<poly.length;j++){if(j===i+1||(i===0&&j===poly.length-1))continue;if(segmentHit(a,b,poly[j],poly[(j+1)%poly.length])!==null)return 'Die Kontur darf sich nicht selbst schneiden.';}}
 return Math.abs(area)<.0001?'Die Bauteilfläche ist zu klein.':null;
}
/** Quadratic corner fillets; trim each adjacent edge by at most 25%. Same contour for field and collision. */
export function roundedPolygon(poly:Point[],radius:number):Point[]{
 if(radius<=0)return poly;const result:Point[]=[];
 poly.forEach((b,i)=>{const a=poly[(i+poly.length-1)%poly.length],c=poly[(i+1)%poly.length];const la=Math.hypot(a.x-b.x,a.y-b.y),lc=Math.hypot(c.x-b.x,c.y-b.y);const trim=Math.min(radius,la*.25,lc*.25);
 const p={x:b.x+(a.x-b.x)*trim/la,y:b.y+(a.y-b.y)*trim/la},q={x:b.x+(c.x-b.x)*trim/lc,y:b.y+(c.y-b.y)*trim/lc};
 for(let j=0;j<=6;j++){const t=j/6;result.push({x:(1-t)**2*p.x+2*t*(1-t)*b.x+t*t*q.x,y:(1-t)**2*p.y+2*t*(1-t)*b.y+t*t*q.y});}});return result;
}
export function bellPolygon(p:Parameters):Point[]{const r=p.bellDiameter/2000;return [{x:-.075,y:-r*.55},{x:-.025,y:-r*.55},{x:0,y:-r},{x:0,y:r},{x:-.025,y:r*.55},{x:-.075,y:r*.55}];}
export function electrodes(p:Parameters):Point[][]{
 return p.charging!=='external'?[]:[-1,1].map(sign=>Array.from({length:40},(_,i)=>({x:p.electrodeX/1000+p.electrodeRadius/1000*Math.cos(i*Math.PI/20),y:sign*p.electrodeY/1000+p.electrodeRadius/1000*Math.sin(i*Math.PI/20)})));
}
