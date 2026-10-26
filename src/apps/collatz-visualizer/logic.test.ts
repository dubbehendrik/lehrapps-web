import { describe, expect, it } from 'vitest';
import { sequence, inverseTree, log2big } from './logic';
describe('Collatz', () => {
 it('berechnet reguläre und reduzierte Folgen', () => {
  expect(sequence(7n,'regular').points.map(p=>p.n)).toEqual([7n,22n,11n,34n,17n,52n,26n,13n,40n,20n,10n,5n,16n,8n,4n,2n,1n]);
  expect(sequence(7n,'reduced').points.map(p=>p.n)).toEqual([7n,11n,17n,26n,13n,20n,10n,5n,8n,4n,2n,1n]);
 });
 it('bewahrt große Zahlen und kennzeichnet Abbrüche',()=>{const s=sequence(9007199254740993n,'regular',1);expect(s.points[1].n).toBe(27021597764222980n);expect(s.completed).toBe(false);expect(log2big(1n<<2000n)).toBe(2000);});
 it('liefert ausschließlich gültige Vorgänger ohne Wurzelzyklus',()=>{for(const variant of ['regular','reduced'] as const){const {nodes}=inverseTree(variant,12); expect(new Set(nodes.map(n=>n.n.toString())).size).toBe(nodes.length); for(const p of nodes.slice(1)){const m=p.n%2n===0n?p.n/2n:variant==='regular'?3n*p.n+1n:(3n*p.n+1n)/2n; expect(m).toBe(nodes[p.parent].n);}}});
 it('rekonstruiert affine Beiträge exakt',()=>{for(const v of ['regular','reduced'] as const) for(const p of sequence(27n,v).points) expect((3n**BigInt(p.u)*27n+p.numerator)).toBe(p.n*p.denominator);});
});
