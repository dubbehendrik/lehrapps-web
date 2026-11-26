import { inverseTree } from './logic';
export type SpatialNode = { value: bigint; parent: number; depth: number; x: number; y: number; z: number };
/** Deterministic spring and repulsion layout. Coordinates have no numerical Collatz meaning. */
export function spatialGraph(maxNodes: number, depth = 30): SpatialNode[] {
  const source = inverseTree('regular', depth, maxNodes).nodes;
  const nodes: SpatialNode[] = source.map((n, i) => {
    if (i === 0) return {value:n.n,parent:-1,depth:0,x:0,y:0,z:0};
    const angle = i * 2.399963229728653;
    const radius = 2 + Math.sqrt(i) * 0.65;
    return {value:n.n,parent:n.parent,depth:n.depth,x:Math.cos(angle)*radius,y:Math.sin(angle)*radius,z:(i%11-5)*0.65};
  });
  const epsilon=0.1;
  for(let iteration=0; iteration<90; iteration++) {
    const dx = new Float64Array(nodes.length), dy=new Float64Array(nodes.length), dz=new Float64Array(nodes.length);
    for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) {
      let x=nodes[i].x-nodes[j].x,y=nodes[i].y-nodes[j].y,z=nodes[i].z-nodes[j].z;
      let distance=Math.sqrt(x*x+y*y+z*z+epsilon);
      const repulsion=1.5/(distance*distance*distance); x*=repulsion; y*=repulsion; z*=repulsion;
      dx[i]+=x;dy[i]+=y;dz[i]+=z;dx[j]-=x;dy[j]-=y;dz[j]-=z;
    }
    for(let i=1;i<nodes.length;i++) {
      const p=nodes[i].parent, x=nodes[p].x-nodes[i].x, y=nodes[p].y-nodes[i].y, z=nodes[p].z-nodes[i].z;
      const distance=Math.sqrt(x*x+y*y+z*z+epsilon), force=0.055*(distance-2)/distance;
      dx[i]+=x*force;dy[i]+=y*force;dz[i]+=z*force;dx[p]-=x*force;dy[p]-=y*force;dz[p]-=z*force;
    }
    const step=0.2*(1-iteration/120);
    for(let i=1;i<nodes.length;i++){nodes[i].x+=Math.max(-1,Math.min(1,dx[i]))*step;nodes[i].y+=Math.max(-1,Math.min(1,dy[i]))*step;nodes[i].z+=Math.max(-1,Math.min(1,dz[i]))*step;}
  }
  return nodes;
}
