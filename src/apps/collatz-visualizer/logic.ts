export type Variant = 'regular' | 'reduced';
export type Point = { n: bigint; u: number; g: number; numerator: bigint; denominator: bigint };
export function sequence(start: bigint, variant: Variant, limit = 5000) {
  if (start < 1n) throw new Error('Startwert muss eine positive ganze Zahl sein.');
  let n = start, u = 0, g = 0, numerator = 0n, denominator = 1n;
  const points: Point[] = [{ n, u, g, numerator, denominator }];
  while (n !== 1n && points.length <= limit) {
    if (n % 2n === 0n) { n /= 2n; denominator *= 2n; g++; }
    else { n = 3n * n + 1n; numerator = 3n * numerator + denominator; u++; if (variant === 'reduced') { n /= 2n; denominator *= 2n; g++; } }
    points.push({n,u,g,numerator,denominator});
  }
  return { points, completed: n === 1n };
}
// log2 from leading bits, without converting a large BigInt to Number.
export function log2big(n: bigint): number {
  if (n <= 0n) return NaN;
  const bits = n.toString(2), take = Math.min(52, bits.length);
  return bits.length - take + Math.log2(Number(BigInt('0b' + bits.slice(0, take))));
}
export type TreeNode = { n: bigint; depth: number; parent: number; x: number };
export function inverseTree(variant: Variant, depth: number, maxNodes = 2000) {
  const nodes: TreeNode[] = [{n:1n, depth:0, parent:-1, x:0}], seen = new Set(['1']);
  let truncated = false;
  for (let i = 0; i < nodes.length; i++) {
    const {n, depth: d, x} = nodes[i]; if (d >= depth) continue;
    const candidates = [2n*n];
    const candidate = variant === 'regular' ? n-1n : 2n*n-1n;
    if (candidate > 0n && candidate % 3n === 0n && (candidate / 3n) % 2n === 1n) candidates.push(candidate / 3n);
    for (let j=0; j<candidates.length; j++) {
      const v=candidates[j]; if (seen.has(v.toString())) continue;
      if (nodes.length >= maxNodes) { truncated=true; break; }
      seen.add(v.toString()); nodes.push({n:v,depth:d+1,parent:i,x:x+(j===0?-1:1)*Math.pow(0.55,d)});
    }
  }
  return {nodes,truncated};
}
