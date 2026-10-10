import { createElement, type ReactNode } from 'react';
import { MathExpression, math as m } from '../../components/MathNotation';
// Native MathML equivalent of \dot{V}; a baseline dot avoids a second built-in elevation.
export const dot = (base: string) => createElement('mover', { accent: 'true' },
  m.identifier(base), createElement('mo', { stretchy: 'false', accent: 'true' }, '.'));
export const flow = (index: string) => createElement('msub', null, dot('V'), m.text(index));
export const power = (base: ReactNode, exponent: ReactNode) => createElement('msup', null, base, exponent);
export function Symbol({ base, index }: { base: string; index: string }) {
  return <MathExpression label={`${base} ${index}`}>{m.index(base, index)}</MathExpression>;
}
export function Formula({ children, label }: { children: ReactNode; label: string }) {
  return <div className="cascade-equation"><MathExpression label={label}>{children}</MathExpression></div>;
}
