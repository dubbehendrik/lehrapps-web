import {it,expect} from 'vitest';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {exposedPencilRanges} from '../src/apps/klebstoffauftrag/drawing';
import {defaultGeometry as g} from '../src/apps/klebstoffauftrag/logic';
import {LldFormula,SolidsFormula,BalanceFormula,WithdrawalFormula} from '../src/apps/klebstoffauftrag/Formulas';
it('retains the complete tip after the upper tool edge passes the pencil end',()=>{expect(exposedPencilRanges(g,172,240)).toEqual([[10,170]]);});
it('includes the exposed conical portion before complete clearance',()=>{expect(exposedPencilRanges(g,165,230)).toEqual([[10,165]]);expect(exposedPencilRanges(g,15,80)).toEqual([[10,15],[80,170]]);});
it('renders semantic mathematical equations with retained LaTeX source',()=>{for(const C of [LldFormula,SolidsFormula,BalanceFormula,WithdrawalFormula]){const html=renderToStaticMarkup(createElement(C));expect(html).toContain('<math');if(C!==BalanceFormula)expect(html).toContain('<mfrac>');expect(html).toContain('application/x-tex');}expect(renderToStaticMarkup(createElement(LldFormula))).toContain('<msup>');});
