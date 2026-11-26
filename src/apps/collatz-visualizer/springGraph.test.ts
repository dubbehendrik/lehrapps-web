import { describe, expect, it } from 'vitest';
import { spatialGraph } from './springGraph';
describe('räumlicher Graph',()=>{it('enthält nur gültige inverse Collatz-Kanten',()=>{const nodes=spatialGraph(100);expect(nodes.length).toBe(100);expect(nodes[0].value).toBe(1n); for(const n of nodes.slice(1)){expect(Number.isFinite(n.x+n.y+n.z)).toBe(true);expect(n.value%2n===0n?n.value/2n:3n*n.value+1n).toBe(nodes[n.parent].value);}})});
