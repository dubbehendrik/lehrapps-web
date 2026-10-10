import { expect, it } from 'vitest';
import { fmt } from '../src/apps/gegenstromkaskade/format';
it('rundet normale Anzeigewerte auf eine Nachkommastelle', () => {
  expect(fmt(14.276852428799721)).toBe('14,3');
  expect(fmt(800)).toBe('800,0');
  expect(fmt(0)).toBe('0,0');
});
it('bewahrt kleine Konzentrationen vor der Rundung auf null', () => {
  expect(fmt(0.0625)).toBe('0,063');
  expect(fmt(0.0015)).toBe('0,0015');
});
it('verwendet eine Nachkommastelle in der Exponentialdarstellung', () => {
  expect(fmt(0.000015)).toBe('1,5 · 10⁻⁵');
  expect(fmt(0.00005)).toBe('5,0 · 10⁻⁵');
  expect(fmt(-0.000015)).toBe('-1,5 · 10⁻⁵');
  expect(fmt(1500000)).toBe('1,5 · 10⁶');
});
