import type {Point} from './types';
export interface Panel {x:number;y:number;tx:number;ty:number;length:number;density:number;potential:number}
export interface ElectricSolution {panels:Panel[];reference:number;residual:number}
const tau=2*Math.PI;
function primitive(u:number,y:number){const r2=u*u+y*y;return r2?u*.5*Math.log(r2)-u+(y?y*Math.atan(u/y):0):0;}
/** Analytic integral of the 2D free-space single-layer kernel over a straight panel.
 * The reference length in log(r/1m) cancels because total source charge is zero. */
export function influence(p:Point,s:Panel){const dx=p.x-s.x,dy=p.y-s.y,x=dx*s.tx+dy*s.ty,y=Math.abs(-dx*s.ty+dy*s.tx);return -(primitive(x,y)-primitive(x-s.length,y))/tau;}
/** Open 2D electrostatics: conductor potentials plus zero net charge per depth.
 * The floating constant at infinity is solved, not prescribed on the image border. */
export function solveElectric(conductors:{contour:Point[];potential:number}[],maxLength=.006):ElectricSolution{
 const panels:Panel[]=[];
 for(const c of conductors)for(let i=0;i<c.contour.length;i++){const a=c.contour[i],b=c.contour[(i+1)%c.contour.length],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<1e-10)continue;const count=Math.ceil(length/maxLength);for(let j=0;j<count;j++)panels.push({x:a.x+(b.x-a.x)*j/count,y:a.y+(b.y-a.y)*j/count,tx:(b.x-a.x)/length,ty:(b.y-a.y)/length,length:length/count,density:0,potential:c.potential});}
 const n=panels.length+1,matrix=Array.from({length:n},()=>new Float64Array(n+1));
 for(let i=0;i<n-1;i++){const a=panels[i],point={x:a.x+a.tx*a.length/2,y:a.y+a.ty*a.length/2};for(let j=0;j<n-1;j++)matrix[i][j]=influence(point,panels[j]);matrix[i][n-1]=1;matrix[i][n]=a.potential;matrix[n-1][i]=a.length;}
 // Dense pivoted Gaussian elimination; hundreds of panels, no external solver dependency.
 for(let k=0;k<n;k++){let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(matrix[i][k])>Math.abs(matrix[pivot][k]))pivot=i;
 if(Math.abs(matrix[pivot][k])<1e-15)throw Error('Elektroden oder Konturen überlagern sich; Feldsystem ist singulär.');[matrix[k],matrix[pivot]]=[matrix[pivot],matrix[k]];
 for(let i=k+1;i<n;i++){const f=matrix[i][k]/matrix[k][k];if(!f)continue;matrix[i][k]=0;for(let j=k+1;j<=n;j++)matrix[i][j]-=f*matrix[k][j];}}
 const solution=new Float64Array(n);for(let i=n-1;i>=0;i--){let sum=matrix[i][n];for(let j=i+1;j<n;j++)sum-=matrix[i][j]*solution[j];solution[i]=sum/matrix[i][i];}
 panels.forEach((s,i)=>s.density=solution[i]);const result={panels,reference:solution[n-1],residual:0};let residual=0;
 for(const s of panels){const pt={x:s.x+s.tx*s.length/2,y:s.y+s.ty*s.length/2};residual=Math.max(residual,Math.abs(electricAt(result,pt).potential-s.potential));}result.residual=residual;return result;
}
/** Field evaluation is independent of the display grid and resolves submillimetre tips. */
export function electricAt(solution:ElectricSolution,p:Point){let ex=0,ey=0,potential=solution.reference;
 for(const s of solution.panels){const dx=p.x-s.x,dy=p.y-s.y,x=dx*s.tx+dy*s.ty,y=-dx*s.ty+dy*s.tx;
 const a=Math.max(1e-30,x*x+y*y),b=Math.max(1e-30,(x-s.length)**2+y*y),tangent=.5*Math.log(a/b);let normal=Math.atan2(x,y)-Math.atan2(x-s.length,y);if(normal>Math.PI)normal-=tau;if(normal< -Math.PI)normal+=tau;
 const f=s.density/tau;ex+=f*(tangent*s.tx-normal*s.ty);ey+=f*(tangent*s.ty+normal*s.tx);potential+=s.density*influence(p,s);
 }return {x:ex,y:ey,potential};
}
