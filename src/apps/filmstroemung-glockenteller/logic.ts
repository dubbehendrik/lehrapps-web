export interface Parameters { speed:number; diameter:number; angle:number; flow:number; density:number; viscosity:number; k:number; p:number; innerRadius:number }
export const defaults:Parameters={speed:60000,diameter:55,angle:40,flow:250,density:1030,viscosity:250,k:9034.6,p:.4353,innerRadius:3};
export interface Point { r:number; thickness:number; mean:number; max:number; shear:number; wallShear:number; viscosity:number; azimuthal:number }
export interface Iteration { points:Point[]; error:number }
export function validate(a:Parameters){
 if(Object.values(a).some(v=>!Number.isFinite(v)||v<=0))throw Error('Alle Eingaben müssen endliche, positive Zahlen sein.');
 if(a.angle<1||a.angle>90)throw Error('Der Konturwinkel muss zwischen 1° und 90° liegen.');
 if(a.p<.1||a.p>2)throw Error('Der Fließindex muss zwischen 0,1 und 2 liegen.');
 if(a.innerRadius>=a.diameter/2)throw Error('Der innere Radius muss kleiner als der Glockenradius sein.');
}
function quantities(a:Parameters,r:number,h:number,eta:number,ratio=1.5):Point{
 const mean=a.flow*1e-6/60/(2*Math.PI*r*h),max=ratio*mean;
 return {r,thickness:h,mean,max,shear:max/h,wallShear:(1+1/a.p)*max/h,viscosity:eta,azimuthal:2*Math.PI*a.speed/60*r};
}
export function newtonPoint(a:Parameters,r:number,eta=a.viscosity/1000):Point{
 const w=2*Math.PI*a.speed/60;
 const h=Math.cbrt(3*a.flow*1e-6/60*eta/(2*Math.PI*w*w*r*r*a.density*Math.sin(a.angle*Math.PI/180)));
 const point=quantities(a,r,h,eta);return {...point,wallShear:2*point.shear};
}
// Local stationary thin film: tau(y)=A(h-y), no slip, stress-free surface.
// q = p/(2p+1) * (A/k)^(1/p) * h^((2p+1)/p).
export function powerPoint(a:Parameters,r:number):Point{
 const q=a.flow*1e-6/60/(2*Math.PI*r),w=2*Math.PI*a.speed/60;
 const A=a.density*w*w*r*Math.sin(a.angle*Math.PI/180),k=a.k/1000;
 const h=Math.exp(a.p/(2*a.p+1)*(Math.log(q*(2*a.p+1)/a.p)+Math.log(k/A)/a.p));
 const point=quantities(a,r,h,0,(2*a.p+1)/(a.p+1));
 return {...point,viscosity:k*point.shear**(a.p-1)};
}
export function calculate(a:Parameters,count=201,tolerance=1e-6,maxIterations=200){
 validate(a);
 if(!Number.isInteger(count)||count<2||count>2001||!Number.isFinite(tolerance)||tolerance<=0||!Number.isInteger(maxIterations)||maxIterations<1||maxIterations>1000)throw Error('Ungültige numerische Einstellungen.');
 const radii=Array.from({length:count},(_,i)=>(a.innerRadius+(a.diameter/2-a.innerRadius)*i/(count-1))/1000);
 const newton=radii.map(r=>newtonPoint(a,r));
 const history:Iteration[]=[{points:newton,error:0}];let converged=false;
 for(let j=0;j<maxIterations;j++){
  const previous=history.at(-1)!.points;
  const points=previous.map(v=>newtonPoint(a,v.r,a.k/1000*v.shear**(a.p-1)));
  const error=Math.max(...points.map((v,i)=>Math.abs(v.thickness-previous[i].thickness)/v.thickness));
  if(points.some(v=>Object.values(v).some(n=>!Number.isFinite(n)||n<=0)))throw Error('Parameterkombination führt zu nicht darstellbaren Ergebnissen.');
  history.push({points,error});if(error<tolerance){converged=true;break;}
 }
 return {newton,history,power:radii.map(r=>powerPoint(a,r)),converged};
}
