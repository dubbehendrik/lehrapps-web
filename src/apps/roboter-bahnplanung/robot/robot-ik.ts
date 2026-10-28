import * as T from 'three';
import {flangeMatrix,toolMatrix,JOINTS,REFERENCE_POSES,type AxisValues} from './robot-kinematics';

function solve(a:number[][],b:number[]){
 const m=a.map((r,i)=>[...r,b[i]]);
 for(let i=0;i<6;i++){
  let pivot=i;for(let j=i+1;j<6;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;
  [m[i],m[pivot]]=[m[pivot],m[i]];if(Math.abs(m[i][i])<1e-14)return null;
  const scale=m[i][i];for(let k=i;k<7;k++)m[i][k]/=scale;
  for(let j=0;j<6;j++)if(j!==i){const f=m[j][i];for(let k=i;k<7;k++)m[j][k]-=f*m[i][k];}
 }
 return m.map(r=>r[6]);
}
function error(goal:T.Matrix4,current:T.Matrix4){
 const p=new T.Vector3().setFromMatrixPosition(goal).sub(new T.Vector3().setFromMatrixPosition(current));
 const q=new T.Quaternion().setFromRotationMatrix(goal).multiply(new T.Quaternion().setFromRotationMatrix(current).invert()).normalize();if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);
 const length=Math.hypot(q.x,q.y,q.z),scale=length>1e-10?2*Math.atan2(length,q.w)/length:2;
 return [p.x,p.y,p.z,q.x*scale*.25,q.y*scale*.25,q.z*scale*.25];
}
const norm=(e:number[])=>Math.hypot(...e);
export function inverseTCP(target:T.Matrix4,tool:number|T.Matrix4,seed:AxisValues=REFERENCE_POSES[1].axes):{axes:AxisValues;positionError:number;angleError:number}|null{
 const goal=target.clone().multiply((typeof tool==='number'?toolMatrix(tool):tool.clone()).invert());
 const seeds=[seed,REFERENCE_POSES[1].axes,[0,-80,110,0,30,-180] as AxisValues,[0,-70,100,-90,30,0] as AxisValues];
 for(const initial of seeds){
  let q=[...initial] as AxisValues;
  for(let iteration=0;iteration<100;iteration++){
   const current=flangeMatrix(q),e=error(goal,current);
   if(Math.hypot(...e.slice(0,3))<.00005&&Math.hypot(...e.slice(3))<.0001)return {axes:q,positionError:Math.hypot(...e.slice(0,3)),angleError:Math.hypot(...e.slice(3))/.25};
   const jac=Array.from({length:6},()=>Array(6).fill(0));
   for(let j=0;j<6;j++){
    const next=[...q] as AxisValues,h=q[j]+.0572958<=JOINTS[j].max?.0572958:-.0572958;next[j]+=h;
    const shift=error(flangeMatrix(next),current);for(let i=0;i<6;i++)jac[i][j]=shift[i]/(h*Math.PI/180);
   }
   const normal=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>jac.reduce((sum,row)=>sum+row[i]*row[j],0)+(i===j?.00002:0)));
   const rhs=Array.from({length:6},(_,i)=>jac.reduce((sum,row,j)=>sum+row[i]*e[j],0)),step=solve(normal,rhs);if(!step)break;
   const largest=Math.max(...step.map(Math.abs)),factor=Math.min(1,.25/Math.max(largest,1e-9));let changed=false;
   for(const line of [1,.5,.25,.1]){
    const next=q.map((v,i)=>Math.max(JOINTS[i].min,Math.min(JOINTS[i].max,v+step[i]*factor*line*180/Math.PI))) as AxisValues;
    if(norm(error(goal,flangeMatrix(next)))<norm(e)){q=next;changed=true;break;}
   }
   if(!changed)break;
  }
 }
 return null;
}
