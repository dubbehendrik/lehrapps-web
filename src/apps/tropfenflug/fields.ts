import type {Grid,Point,Parameters} from './types';
import {domain,inside,bellPolygon,electrodes} from './geometry';
/** Uniform-grid Laplace solver. Solid faces are omitted for homogeneous Neumann (air),
 * fixed for electrostatics. Far air boundary Phi=x; electric boundary 0 V.
 * Residual is max local algebraic defect in normalized potential units. */
export function solveLaplace(nx:number,ny:number,solid:Uint8Array,values:Float64Array,air:boolean,tolerance=1e-7){
 const omega=1.78;let residual=Infinity,iterations=0;
 for(;iterations<6500;iterations++){
  for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){const k=j*nx+i;if(solid[k])continue;let sum=0,count=0;
   for(const n of [k-1,k+1,k-nx,k+nx])if(!air||!solid[n]){sum+=values[n];count++;}
   if(count)values[k]+=omega*(sum/count-values[k]);
  }
  if(iterations%20===0){residual=0;for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){const k=j*nx+i;if(solid[k])continue;let sum=0,count=0;for(const n of [k-1,k+1,k-nx,k+nx])if(!air||!solid[n]){sum+=values[n];count++;}if(count)residual=Math.max(residual,Math.abs(sum/count-values[k]));}if(residual<tolerance)break;}
 }
 return {residual,iterations:iterations+1};
}
export function gradients(values:Float64Array,g:Pick<Grid,'nx'|'ny'|'h'|'solid'>,neumann:boolean){
 const x=new Float64Array(values.length),y=new Float64Array(values.length),{nx,ny,h,solid}=g;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(solid[k])continue;
 const derivative=(a:number,b:number,hasA:boolean,hasB:boolean)=>{
  const va=hasA?((neumann&&solid[a])?values[k]:values[a]):values[k],vb=hasB?((neumann&&solid[b])?values[k]:values[b]):values[k];return (vb-va)/((hasA&&hasB?2:1)*h);};
 x[k]=derivative(k-1,k+1,i>0,i<nx-1);y[k]=derivative(k-nx,k+nx,j>0,j<ny-1);
 }return {x,y};
}
export function buildFields(p:Parameters,geometry:Point[],resolution=1):Grid{
 const h=.005/resolution,nx=Math.round((domain.x1-domain.x0)/h)+1,ny=Math.round((domain.y1-domain.y0)/h)+1;
 const solid=new Uint8Array(nx*ny),potential=new Float64Array(nx*ny),phi=new Float64Array(nx*ny),bell=bellPolygon(p),es=electrodes(p);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,pt={x:domain.x0+i*h,y:domain.y0+j*h};
 solid[k]=inside(pt,geometry)?1:inside(pt,bell)?2:es.some(e=>inside(pt,e))?3:0;
 potential[k]=solid[k]===3||(solid[k]===2&&p.charging==='contact')?1:0;phi[k]=pt.x;
 }
 const e=p.charging==='off'?{residual:0,iterations:0}:solveLaplace(nx,ny,solid,potential,false);
 const a=solveLaplace(nx,ny,solid,phi,true),g={nx,ny,h,solid},eg=gradients(potential,g,false),ag=gradients(phi,g,true);
 const volts=p.charging==='off'?0:p.voltage*1000;
 for(let k=0;k<potential.length;k++){potential[k]=potential[k]===0?0:potential[k]*volts;eg.x[k]*=-volts;eg.y[k]*=-volts;ag.x[k]*=p.airSpeed;ag.y[k]*=p.airSpeed;}
 return {...g,x0:domain.x0,y0:domain.y0,potential,ex:eg.x,ey:eg.y,ux:ag.x,uy:ag.y,electricResidual:e.residual,airResidual:a.residual,electricIterations:e.iterations,airIterations:a.iterations};
}
/** Interpolate fluid nodes only. Solid values never leak into sampled velocity/field. */
export function sample(g:Grid,values:Float64Array,p:Point):number{
 const fx=Math.max(0,Math.min(g.nx-1.000001,(p.x-g.x0)/g.h)),fy=Math.max(0,Math.min(g.ny-1.000001,(p.y-g.y0)/g.h));const i=Math.floor(fx),j=Math.floor(fy),tx=fx-i,ty=fy-j;let sum=0,weight=0;
 for(const [di,dj,w] of [[0,0,(1-tx)*(1-ty)],[1,0,tx*(1-ty)],[0,1,(1-tx)*ty],[1,1,tx*ty]]){const k=(j+dj)*g.nx+i+di;if(!g.solid[k]){sum+=values[k]*w;weight+=w;}}
 return weight?sum/weight:0;
}
