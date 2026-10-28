export type Params={mode:string; q:number; atom:number; horn:number; distance:number; orientation:number; solids:number; speed:number; spacing:number; over:number; passes:number; flash:number; spot:number; width:number; height:number};
export const defaults:Params={mode:'meander',q:80,atom:2,horn:1.5,distance:200,orientation:0,solids:50,speed:200,spacing:50,over:60,passes:1,flash:0,spot:1,width:200,height:150};
export type Pose={x:number;y:number;angle:number;phase:string;on:boolean};
export type Segment={a:Pose;b:Pose;start:number;duration:number};
export function brush(p:Params){const base=18*p.distance/200*Math.pow(Math.max(.2,p.atom)/2,.12);return {sx:base*(1+1.2*p.horn),sy:base/(1+.16*p.horn)};}
export function kernel(x:number,y:number,p:Params){const {sx,sy}=brush(p),a=p.orientation*Math.PI/180,u=x*Math.cos(a)+y*Math.sin(a),v=-x*Math.sin(a)+y*Math.cos(a);return Math.exp(-.5*((u/sx)**2+(v/sy)**2))/(2*Math.PI*sx*sy);}
export function plan(p:Params){const s:Segment[]=[];let time=0;let cur:Pose={x:p.width/2+p.over,y:0,angle:0,phase:'Anfahren',on:true};const add=(b:Pose,duration:number)=>{s.push({a:{...cur},b:{...b},start:time,duration});time+=duration;cur=b;};const move=(x:number,y:number,angle:number,phase:string,duration:number,on=true)=>add({x,y,angle,phase,on},Math.max(.001,duration));
move(cur.x,0,0,'Anspritzen',1);
if(p.mode==='spot'){move(0,0,0,'Positionieren',1,false);move(0,0,0,'Spritzbild',p.spot);return s;}
for(let pass=0;pass<p.passes;pass++){const angle=p.mode==='cross'?(pass%2)*Math.PI/2:0;const w=angle?p.height:p.width,h=angle?p.width:p.height,end=w/2+p.over;
if(angle!==cur.angle)move(cur.x,cur.y,angle,'Werkstück drehen',2);
const rows=p.mode==='single'?[0]:Array.from({length:Math.ceil(h/p.spacing)+1},(_,i)=>(i-Math.ceil(h/p.spacing)/2)*p.spacing);
move(end,rows[0],angle,'Startposition',1,false);
for(let i=0;i<rows.length;i++){if(i)move(cur.x,rows[i],angle,'Düsenversatz',.3+Math.abs(rows[i]-rows[i-1])/ (50/1.2));move(i%2?end:-end,rows[i],angle,'Beschichtungsbahn',2*end/p.speed);}
if(pass<p.passes-1&&p.flash>0)move(cur.x,cur.y,angle,'Ablüften',p.flash,false);
}return s;}
export function at(s:Segment[],t:number):Pose{const g=s.find(g=>t<g.start+g.duration)||s[s.length-1];const f=Math.max(0,Math.min(1,(t-g.start)/g.duration));return {x:g.a.x+(g.b.x-g.a.x)*f,y:g.a.y+(g.b.y-g.a.y)*f,angle:g.a.angle+(g.b.angle-g.a.angle)*f,phase:g.b.phase,on:g.b.on&&t<g.start+g.duration};}
export function consumed(s:Segment[],t:number,q:number){return Math.min(100,s.reduce((v,g)=>v+(g.b.on?Math.max(0,Math.min(g.duration,t-g.start)):0),0)*q/60);}
export function simulate(p:Params){const segments=plan(p),duration=segments.reduce((v,s)=>v+s.duration,0),nx=51,ny=39,dx=p.width/nx,dy=p.height/ny;let used=0;const frames:{time:number;z:Float32Array;used:number}[]=[{time:0,z:new Float32Array(nx*ny),used:0}];const z=new Float32Array(nx*ny);let steps=0;
for(const g of segments){const n=Math.ceil(g.duration/Math.min(.04,2/p.speed));for(let k=0;k<n;k++){const dt=g.duration/n,t=g.start+(k+.5)*dt,pose=at(segments,t);const vol=g.b.on?Math.min(p.q/60*dt,100-used):0;used+=vol;if(vol&&g.b.phase!=='Anspritzen'){const c=Math.cos(pose.angle),s=Math.sin(pose.angle);for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const u=-p.width/2+(i+.5)*dx,v=-p.height/2+(j+.5)*dy;const x=c*u-s*v-pose.x,y=s*u+c*v-pose.y;z[j*nx+i]+=vol*1e6*.7*kernel(x,y,p);}}if(++steps%10===0)frames.push({time:t+dt/2,z:z.slice(),used});}}
frames.push({time:duration,z:z.slice(),used});return {segments,duration,frames,nx,ny,dx,dy};}
