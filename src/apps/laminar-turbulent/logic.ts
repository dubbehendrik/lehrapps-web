/** Dimensionless local homogeneous-shear model: lengths / D, velocities / mean U,
 * time t* = t U/D. A single divergence-free cross-plane Fourier roll decays
 * viscously. Streamwise invariant linearized equations yield exact modal lift-up
 * for constant shear S. This is NOT a pipe stability or turbulence solver. */
export interface Parameters { speed: number; diameter: number; density: number; viscosity: number; amplitude: number; wavelength: number }
export const defaults: Parameters = { speed: 0.2, diameter: 10, density: 1000, viscosity: 1, amplitude: 1, wavelength: 0.4 };
export function validate(p: Parameters): string | null {
  const bounds: [keyof Parameters, number, number][] = [['speed',0.001,5],['diameter',1,100],['density',500,2000],['viscosity',0.1,100],['amplitude',0,2],['wavelength',0.2,0.6]];
  return bounds.every(([key,min,max]) => Number.isFinite(p[key]) && p[key]>=min && p[key]<=max) ? null : 'Bitte alle Eingaben innerhalb der angegebenen Grenzen halten.';
}
export function reynolds(p: Parameters) { return p.density*p.speed*(p.diameter/1000)/(p.viscosity/1000); }
export function pipeVelocity(radiusRatio: number) { return 2*(1-radiusRatio*radiusRatio); }
export const shear = -4;
export function modalState(p: Parameters, time: number) {
  const waveNumber = 2*Math.PI/p.wavelength;
  const decayRate = 2*waveNumber*waveNumber/reynolds(p);
  const initialAmplitude = p.amplitude/100;
  const cross = initialAmplitude*Math.exp(-decayRate*time);
  const axial = -shear*time*cross;
  return { cross, axial, decayRate, peakTime: 1/decayRate,
    energy: (2*cross*cross+axial*axial)/8,
    production: -shear*cross*axial/4,
    dissipation: decayRate*(2*cross*cross+axial*axial)/4 };
}
export function localVelocity(p: Parameters, time: number, y: number, z: number) {
  const state=modalState(p,time), k=2*Math.PI/p.wavelength;
  const shape=Math.cos(k*y)*Math.cos(k*z);
  return { u:1.5+shear*y+state.axial*shape, perturbation:state.axial*shape,
    v:state.cross*shape, w:state.cross*Math.sin(k*y)*Math.sin(k*z) };
}
export interface Marker { x:number; y:number; z:number }
export function initialMarkers(p: Parameters): Marker[] { return [{x:0,y:-0.04,z:0},{x:0,y:0.04,z:p.wavelength/2}]; }
/** RK4 paths in the reduced Eulerian velocity field; no particle-particle forces. */
export function advance(p: Parameters, marker: Marker, time:number, dt:number): Marker {
  const f=(m:Marker,t:number)=>{const v=localVelocity(p,t,m.y,m.z);return {x:v.u,y:v.v,z:v.w};};
  const add=(m:Marker,d:Marker,s:number)=>({x:m.x+d.x*s,y:m.y+d.y*s,z:m.z+d.z*s});
  const a=f(marker,time),b=f(add(marker,a,dt/2),time+dt/2),c=f(add(marker,b,dt/2),time+dt/2),d=f(add(marker,c,dt),time+dt);
  return {x:marker.x+dt*(a.x+2*b.x+2*c.x+d.x)/6,y:marker.y+dt*(a.y+2*b.y+2*c.y+d.y)/6,z:marker.z+dt*(a.z+2*b.z+2*c.z+d.z)/6};
}
export function trajectories(p: Parameters, end:number, step=0.025) {
  const paths=initialMarkers(p).map(m=>[m]); let time=0;
  while(time<end-1e-10) {const dt=Math.min(step,end-time); paths.forEach(path=>path.push(advance(p,path[path.length-1],time,dt)));time+=dt;}
  return paths;
}
export function pipeForces(p: Parameters) {
  const diameter=p.diameter/1000, viscosity=p.viscosity/1000;
  return { pressureGradient:32*viscosity*p.speed/diameter**2,
    shearStress:4*viscosity*p.speed/diameter, wallShear:8*viscosity*p.speed/diameter };
}
export function format(value:number): string { return value===0 ? "0" : value!==0 && (Math.abs(value)<1 || Math.abs(value)>=100000) ? value.toExponential(1).replace('.',',') : value.toLocaleString('de-DE',{maximumFractionDigits:1}); }
