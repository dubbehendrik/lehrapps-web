import {describe,it,expect} from 'vitest';
import {score,paretoIndices,buildModels,parseProject,metrics,targetDefaults} from '../src/apps/bayes-optimierung/multi';
const targets=[{...targetDefaults[0],maximize:true,scale:10},{...targetDefaults[1],maximize:false,scale:100}];
const factors=[{name:'x₁',unit:'',min:0,max:1}];
describe('Mehrzielauswertung',()=>{
 it('skaliert und berücksichtigt entgegen gesetzte Zielrichtungen',()=>expect(score([10,100],targets)).toBe(0));
 it('bestimmt Dominanz in allen Zielgrößen',()=>{const rows=[[10,100],[9,110],[11,120]].map(values=>({x:[0],values,source:'Test'}));expect(paretoIndices(rows,targets)).toEqual([0,2])});
 it('ignoriert gleiche Zielwerte nicht als dominiert',()=>expect(paretoIndices([0,1].map(()=>({x:[0],values:[10,100],source:'Test'})),targets)).toEqual([0,1]));
 it('berechnet separate Zielmodelle mit endlicher kombinierter Unsicherheit',()=>{const b=buildModels([{x:[0],values:[10,100],source:'Test'},{x:[1],values:[20,80],source:'Test'}],factors,targets,.25);expect(b.models).toHaveLength(2);expect(b.combined([.5]).sd).toBeGreaterThan(0)});
 it('lädt alte Einzielprojekte',()=>{const p=parseProject({factors,rows:[{x:[.5],y:3}],noise:.2,maximize:false});expect(p.rows[0].values).toEqual([3]);expect(p.targets[0].maximize).toBe(false)});
 it('weist fehlende Zielwerte zurück',()=>expect(()=>parseProject({factors,targets,rows:[{x:[.5],values:[3]}]})).toThrow());
 it('wertet nur vorab gespeicherte Vorhersagen aus',()=>{const m=metrics([{x:[0],values:[2],source:'Test',predictions:[{mean:1,sd:1}]},{x:[1],values:[100],source:'Import'}],0);expect(m).toEqual({count:1,rmse:1,coverage:1})});
});
