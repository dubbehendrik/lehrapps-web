import {it,expect} from 'vitest';
import {defaults,stationary,sum} from '../src/apps/pulverkreislauf/logic';
it('solves stationary class balances and cabinet inventory',()=>{const r=stationary(defaults);for(let i=0;i<r.d.length;i++)expect(r.streams.fresh[i]+r.streams.back[i]).toBeCloseTo(r.streams.spray[i],10);expect(Math.abs(r.balance)).toBeLessThan(1e-10);expect(sum(r.streams.direct)+sum(r.streams.wallOut)).toBeCloseTo(sum(r.streams.separatorIn),10);});
it('residence time changes stock but not stationary flows',()=>{const a=stationary(defaults),b=stationary({...defaults,residence:20});expect(b.streams).toEqual(a.streams);expect(sum(b.wall)).toBeCloseTo(2*sum(a.wall),10)});
it('without recycle fresh feed equals spray',()=>{const r=stationary({...defaults,recycle:0});expect(sum(r.streams.fresh)).toBeCloseTo(defaults.flow,12)});
