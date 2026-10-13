import type { Point } from './types';
import { validCorners } from './logic';
export interface GridSuggestion { corners?: Point[]; status: 'suggested' | 'not-found' }
type Line = { theta: number; rho: number; votes: number };
type Family = { theta: number; lines: Line[]; score: number };
// Six equally spaced lines are evidence for a grid, not proof of correct geometry.
function family(hist: Float32Array,theta:number,diagonal:number,minStep:number):Family|null {
 const smooth=hist.map((v,i)=>v+(hist[i-1]??0)+(hist[i+1]??0));
 const peaks:Line[]=[];
 for(let i=2;i<smooth.length-2;i++)if(smooth[i]>=smooth[i-1]&&smooth[i]>smooth[i+1]&&smooth[i]>8)peaks.push({theta,rho:i-diagonal,votes:smooth[i]});
 const selected:Line[]=[];
 for(const p of peaks.sort((a,b)=>b.votes-a.votes)){if(selected.every(q=>Math.abs(q.rho-p.rho)>5))selected.push(p);if(selected.length>=30)break;}
 selected.sort((a,b)=>a.rho-b.rho);
 let best:Family|null=null;
 for(let a=0;a<selected.length;a++)for(let b=a+1;b<selected.length;b++){
 const step=(selected[b].rho-selected[a].rho)/5;if(step<minStep)continue;
 const lines:Line[]=[];
 for(let k=0;k<6;k++){const target=selected[a].rho+k*step;const nearby=selected.filter(p=>Math.abs(p.rho-target)<Math.max(3,step*.22));if(!nearby.length)break;lines.push(nearby.reduce((p,q)=>p.votes>q.votes?p:q));}
 if(lines.length!==6||new Set(lines).size!==6)continue;
 const strongest=Math.max(...lines.map(l=>l.votes)),weakest=Math.min(...lines.map(l=>l.votes));
 if(weakest<strongest*.23||weakest<minStep*3.2)continue;
 const residual=lines.reduce((s,l,k)=>s+Math.abs(l.rho-selected[a].rho-k*step),0)/step;
 const score=lines.reduce((s,l)=>s+l.votes,0)*(1-residual*.15)*(weakest/strongest)**.25;
 if(!best||score>best.score)best={theta,lines,score};
 }return best;
}
function intersect(a:Line,b:Line):Point {const ca=Math.cos(a.theta),sa=Math.sin(a.theta),cb=Math.cos(b.theta),sb=Math.sin(b.theta),det=ca*sb-sa*cb;return{x:(a.rho*sb-sa*b.rho)/det,y:(ca*b.rho-a.rho*cb)/det};}
export function detectGrid(pixels:Uint8ClampedArray,width:number,height:number):GridSuggestion {
 if(width<80||height<80||pixels.length!==width*height*4)return{status:'not-found'};
 const gray=new Float32Array(width*height);
 for(let i=0;i<gray.length;i++)gray[i]=pixels[i*4]*.299+pixels[i*4+1]*.587+pixels[i*4+2]*.114;
 const edges:{x:number;y:number;strength:number;angle:number}[]=[];
 for(let y=2;y<height-2;y++)for(let x=2;x<width-2;x++){
 const i=y*width+x;
 const gx=gray[i-width+1]+2*gray[i+1]+gray[i+width+1]-gray[i-width-1]-2*gray[i-1]-gray[i+width-1];
 const gy=gray[i+width-1]+2*gray[i+width]+gray[i+width+1]-gray[i-width-1]-2*gray[i-width]-gray[i-width+1];
 const strength=Math.hypot(gx,gy);if(strength>35)edges.push({x,y,strength,angle:Math.atan2(gy,gx)});
 }
 if(edges.length<200)return{status:'not-found'};
 edges.sort((a,b)=>b.strength-a.strength);const usable=edges.slice(0,12000);
 const diagonal=Math.ceil(Math.hypot(width,height)),families:Family[]=[];
 for(let degrees=0;degrees<180;degrees+=2){const theta=degrees*Math.PI/180,cos=Math.cos(theta),sin=Math.sin(theta),hist=new Float32Array(diagonal*2+1);for(const e of usable)if(Math.abs(Math.cos(e.angle-theta))>.98)hist[Math.round(e.x*cos+e.y*sin)+diagonal]++;const f=family(hist,theta,diagonal,Math.min(width,height)*.065);if(f)families.push(f);}
 let pair:[Family,Family]|null=null,score=0;
 for(const a of families)for(const b of families){let difference=Math.abs(a.theta-b.theta)*180/Math.PI;if(difference>90)difference=180-difference;if(difference<72)continue;const s=Math.min(a.score,b.score);if(s>score){score=s;pair=[a,b]}}
 if(!pair)return{status:'not-found'};
 // Refine each outer line independently; this permits mild perspective convergence.
 function refine(line:Line):Line{
 let best=line;
 for(let offset=-12;offset<=12;offset+=.5){const theta=line.theta+offset*Math.PI/180,cos=Math.cos(theta),sin=Math.sin(theta),hist=new Float32Array(diagonal*2+1);const center={x:width/2,y:height/2};const rho=line.rho+center.x*(cos-Math.cos(line.theta))+center.y*(sin-Math.sin(line.theta));
 for(const e of usable){const d=e.x*cos+e.y*sin;if(Math.abs(d-rho)<7)hist[Math.round(d)+diagonal]++;}
 for(let k=Math.max(1,Math.round(rho)+diagonal-5);k<=Math.min(hist.length-2,Math.round(rho)+diagonal+5);k++){const votes=hist[k-1]+hist[k]+hist[k+1];if(votes>best.votes)best={theta,rho:k-diagonal,votes};}
 }return best;
 }
 const [a,b]=pair;const ar=a.lines.map(refine),br=b.lines.map(refine);
 // Perspective refinement must not collapse two proposed cuts onto one real cut.
 for(const lines of [ar,br]){const positions=lines.map(l=>l.rho-(width/2)*Math.cos(l.theta)-(height/2)*Math.sin(l.theta));const step=(positions[5]-positions[0])/5;if(step<=0||positions.some((p,i)=>i>0&&(p-positions[i-1]<step*.55||p-positions[i-1]>step*1.6)))return{status:'not-found'};}
 const [a0,a5,b0,b5]=[ar[0],ar[5],br[0],br[5]];
 let corners=[intersect(a0,b0),intersect(a5,b0),intersect(a5,b5),intersect(a0,b5)];
 const center={x:corners.reduce((s,p)=>s+p.x,0)/4,y:corners.reduce((s,p)=>s+p.y,0)/4};corners.sort((p,q)=>Math.atan2(p.y-center.y,p.x-center.x)-Math.atan2(q.y-center.y,q.x-center.x));
 const first=corners.reduce((best,p,i)=>p.x+p.y<corners[best].x+corners[best].y?i:best,0);corners=[...corners.slice(first),...corners.slice(0,first)].map(p=>({x:p.x/(width-1),y:p.y/(height-1)}));
 if(!validCorners(corners)||corners.some(p=>p.x<0||p.x>1||p.y<0||p.y>1))return{status:'not-found'};
 const area=Math.abs(corners.reduce((s,p,i)=>s+p.x*corners[(i+1)%4].y-corners[(i+1)%4].x*p.y,0))/2;
 if(area<.04||area>.85)return{status:'not-found'};
 return{status:'suggested',corners};
}
