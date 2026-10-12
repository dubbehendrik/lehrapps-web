import { createElement, type ReactNode } from 'react';
import { MathExpression, math as m } from '../../components/MathNotation';
export const idx=m.index,op=m.operator,id=m.identifier,row=m.row,frac=m.fraction;
export const power=(base:ReactNode,exponent:string)=>createElement('msup',null,base,m.number(exponent));
export const dotQ=createElement('mover',null,id('Q'),op('˙'));
export function Formula({children,label}:{children:ReactNode;label:string}) {return <div className="rod-formula"><MathExpression label={label}>{children}</MathExpression></div>;}
const derivative=(variable:string,order=1)=>frac(row(order===1?id('∂'):power(id('∂'),'2'),id('T')),row(id('∂'),order===1?id(variable):power(id(variable),'2')));
export function SegmentEquation(){return <Formula label="Zeitliche Temperaturänderung gleich Temperaturleitfähigkeit mal zweite Ortsableitung minus Mantelwärmeübergang"><>{derivative('t')}{op('=')}{frac(id('λ'),row(id('ρ'),idx('c','p')))}{derivative('x',2)}{op('−')}{frac(row(m.number('4'),idx('α','M')),row(id('ρ'),idx('c','p'),id('d')))}{row(op('('),id('T'),op('−'),idx('T','∞'),op(')'))}</></Formula>;}
export function BoundaryEquation({kind,side}:{kind:'dirichlet'|'neumann'|'robin';side:'left'|'right'}) {
 const normalFlux=row(op('−'),id('λ'),frac(row(id('∂'),id('T')),row(id('∂'),id('n'))));
 return <><Formula label="Randbedingung am Stabende">{kind==='dirichlet'?row(id('T'),op('='),idx('T','R')):row(normalFlux,op('='),kind==='neumann'?power(idx('q','R'),'″'):row(idx('α','E'),op('('),id('T'),op('−'),idx('T','∞'),op(')')))}</Formula>{kind!=='dirichlet'&&<Formula label={side==='left'?'Links: Ableitung nach außen ist negative Ortsableitung':'Rechts: Ableitung nach außen ist positive Ortsableitung'}>{row(frac(row(id('∂'),id('T')),row(id('∂'),id('n'))),op('='),...(side==='left'?[op('−')]:[]),frac(row(id('∂'),id('T')),row(id('∂'),id('x'))))}</Formula>}</>;
}
export function ContactEquation(){return <><Formula label="Temperatursprung gleich Wärmestrom mal flächenbezogenem Kontaktwiderstand geteilt durch Kontaktfläche">{row(power(id('T'),'−'),op('−'),power(id('T'),'+'),op('='),dotQ,frac(idx('R','K'),idx('A','K')))}</Formula><Formula label="Kontaktfläche ist die kleinere Querschnittsfläche">{row(idx('A','K'),op('='),id('min'),op('('),idx('A','i'),op(','),idx('A','i+1'),op(')'))}</Formula></>;}
export function BiEquation(){return <Formula label="Querschnitts-Biot-Zahl gleich alpha M mal Durchmesser geteilt durch vier lambda">{row(idx('Bi','⊥'),op('='),frac(row(idx('α','M'),id('d')),row(m.number('4'),id('λ'))))}</Formula>;}
