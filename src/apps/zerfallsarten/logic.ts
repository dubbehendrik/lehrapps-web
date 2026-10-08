export interface Parameters {
  flow: number; speed: number; diameter: number; angle: number;
  density: number; viscosity: number; surfaceTension: number;
}
export const defaults: Parameters = { flow: 50, speed: 40000, diameter: 60, angle: 55, density: 1100, viscosity: 30, surfaceTension: 30 };
export function diagramPoint(oh: number, b: number) {
  if (![oh, b].every(v => Number.isFinite(v) && v > 0)) throw new Error('Die Diagrammkoordinaten müssen positiv und endlich sein.');
  return { x: 170 + (Math.log10(oh) + 4) / 4 * 880,
    y: 601 + (Math.log10(b) + 2) / (Math.log10(3) + 2) * -551,
    inside: oh >= 1e-4 && oh <= 1 && b >= 1e-2 && b <= 3 };
}
export function calculate(p: Parameters) {
  if (!Object.values(p).every(Number.isFinite) || ![p.flow,p.speed,p.diameter,p.density,p.viscosity,p.surfaceTension].every(v => v > 0) || p.angle <= 0 || p.angle >= 180)
    throw new Error('Volumenstrom, Drehzahl, Durchmesser, Dichte, Viskosität und Oberflächenspannung müssen positiv und endlich sein; der Konturwinkel muss zwischen 0° und 180° liegen.');
  const flow = p.flow / 1e6 / 60, viscosity = p.viscosity / 1000,
    sigma = p.surfaceTension / 1000, diameter = p.diameter / 1000,
    omega = 2 * Math.PI * p.speed / 60, radius = diameter / 2;
  const oh = viscosity / Math.sqrt(p.density * sigma * diameter);
  const kb = flow ** 2 * p.density / (sigma * diameter ** 3);
  const we = omega ** 2 * diameter ** 3 * p.density / sigma;
  const b = we ** .5 * kb ** (5/6) * oh ** (10/36);
  // Newtonian liquid, constant viscosity; reference uses radius D/2.
  const thickness = Math.cbrt(3 * flow * viscosity / (p.density * 2 * Math.PI * omega ** 2 * radius ** 2 * Math.sin(p.angle * Math.PI / 180))) * 1e6;
  if (![oh,kb,we,b,thickness].every(v => Number.isFinite(v) && v > 0)) throw new Error('Diese Eingaben überschreiten den numerisch auswertbaren Bereich.');
  return { oh, kb, we, b, thickness, omega, peripheralSpeed: omega * radius, point: diagramPoint(oh,b) };
}
