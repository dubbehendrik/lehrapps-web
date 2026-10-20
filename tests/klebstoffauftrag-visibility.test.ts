import {it,expect} from 'vitest';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {exposedPencilRanges} from '../src/apps/klebstoffauftrag/drawing';
import {defaultGeometry as g} from '../src/apps/klebstoffauftrag/logic';
import {LldFormula,SolidsFormula,BalanceFormula,WithdrawalFormula} from '../src/apps/klebstoffauftrag/Formulas';
it('retains the complete tip below the fixed shield after tool clearance',()=>{expect(exposedPencilRanges(g,172,240)).toEqual([[15,170]]);});
it('includes exposed conical portions but not the protected lid region',()=>{expect(exposedPencilRanges(g,165,230)).toEqual([[15,165]]);expect(exposedPencilRanges(g,15,80)).toEqual([[80,170]]);});
it('renders semantic mathematical equations with retained LaTeX source',()=>{for(const C of [LldFormula,SolidsFormula,BalanceFormula,WithdrawalFormula]){const html=renderToStaticMarkup(createElement(C));expect(html).toContain('<math');if(C!==BalanceFormula)expect(html).toContain('<mfrac>');expect(html).toContain('application/x-tex');}expect(renderToStaticMarkup(createElement(LldFormula))).toContain('<msup>');});

