import { defaultContact, type Boundary, type Mesh, type Parameters, type Simulation } from './types';

export function format(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value !== 0 && (Math.abs(value) < 1 || Math.abs(value) >= 1e6)) {
    const [coefficient, exponent] = value.toExponential(1).split('e');
    const sup: Record<string,string> = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return `${coefficient.replace('.',',')} · 10${String(Number(exponent)).split('').map(x=>sup[x]).join('')}`;
  }
  return value.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});
}
export function segmentAlpha(p: Parameters, i:number):number {return p.alphaPerSegment && p.segments.length>1 ? p.segments[i].alpha : p.alpha;}
export function segmentInitial(p: Parameters, i:number):number {return p.initialPerSegment && p.segments.length>1 ? p.segments[i].initial : p.initial;}
export function segmentAmbient(p:Parameters,i:number):number {return p.ambientPerSegment && p.segments.length>1 ? p.segments[i].ambient : p.ambient;}
export function endAmbient(p:Parameters,side:0|1):number {return segmentAmbient(p,side===0?0:p.segments.length-1);}
export function shoulderAmbient(p:Parameters,i:number):number {
  const larger=p.segments[i].diameter>=p.segments[i+1].diameter?i:i+1;
  return segmentAmbient(p,larger);
}
export function removeSegment(p:Parameters,index:number):Parameters {
  if(p.segments.length===1)return p;
  const segments=p.segments.filter((_,i)=>i!==index),contacts=[...p.contacts];
  if(index===0)contacts.shift();else if(index===p.segments.length-1)contacts.pop();else contacts.splice(index-1,2,defaultContact());
  const survivorIndex=index===0?1:0;
  return {...p,segments,contacts,
    ambient:segments.length===1?segmentAmbient(p,survivorIndex):p.ambient,
    ambientPerSegment:segments.length>1&&p.ambientPerSegment,
    initial:segments.length===1?segmentInitial(p,survivorIndex):p.initial,
    alpha:segments.length===1?segmentAlpha(p,survivorIndex):p.alpha,
    initialPerSegment:segments.length>1&&p.initialPerSegment,
    alphaPerSegment:segments.length>1&&p.alphaPerSegment};
}
export function setPerSegment(p:Parameters,key:'initialPerSegment'|'alphaPerSegment'|'ambientPerSegment',enabled:boolean):Parameters {
  const field=key==='initialPerSegment'?'initial':key==='ambientPerSegment'?'ambient':'alpha';
  const effective=(i:number)=>key==='initialPerSegment'?segmentInitial(p,i):key==='ambientPerSegment'?segmentAmbient(p,i):segmentAlpha(p,i);
  return {...p,[key]:enabled,[field]:!enabled?effective(0):p[field],
    segments:enabled?p.segments.map((s,i)=>({...s,[field]:effective(i)})):p.segments};
}
export function endAlpha(p: Parameters, side:0|1):number {
  const b=side===0?p.left:p.right;
  return b.inheritAlpha?segmentAlpha(p,side===0?0:p.segments.length-1):b.alpha;
}
export function shoulderAlpha(p: Parameters, i:number):number {
  const c=p.contacts[i];
  const larger=p.segments[i].diameter>=p.segments[i+1].diameter?i:i+1;
  return c.inheritAlpha?segmentAlpha(p,larger):c.alpha;
}
export function transverseBi(p:Parameters,i:number):number {return segmentAlpha(p,i)*p.segments[i].diameter/1000/(4*p.segments[i].conductivity);}
export function validate(p:Parameters):void {
  const finiteRange=(x:number,min:number,max:number,name:string)=>{if(!Number.isFinite(x)||x<min||x>max)throw new Error(`${name}: Wert zwischen ${format(min)} und ${format(max)} eingeben.`);};
  if(p.segments.length<1||p.segments.length>12)throw new Error('1 bis 12 Segmente sind möglich.');
  if(p.contacts.length!==p.segments.length-1)throw new Error('Anzahl der Kontaktstellen passt nicht zu den Segmenten.');
  finiteRange(p.ambient,-273.15,2000,'Umgebungstemperatur');
  finiteRange(p.initial,-273.15,2000,'Anfangstemperatur');
  finiteRange(p.alpha,0,1e5,'Mantelwärmeübergang');
  finiteRange(p.endTime,.01,1e7,'Endzeit');
  p.segments.forEach((s,i)=>{
    const name=`Segment ${i+1}`;
    finiteRange(s.length,.1,10000,`${name}, Länge [mm]`);
    finiteRange(s.diameter,.1,2000,`${name}, Durchmesser [mm]`);
    finiteRange(s.conductivity,.001,10000,`${name}, Wärmeleitfähigkeit`);
    finiteRange(s.density,1,30000,`${name}, Dichte`);
    finiteRange(s.cp,1,20000,`${name}, Wärmekapazität`);
    finiteRange(segmentAmbient(p,i),-273.15,2000,`${name}, Umgebungstemperatur`);
    finiteRange(segmentInitial(p,i),-273.15,2000,`${name}, Anfangstemperatur`);
    finiteRange(segmentAlpha(p,i),0,1e5,`${name}, Mantelwärmeübergang`);
  });
  p.contacts.forEach((c,i)=>{
    if(!c.perfect)finiteRange(c.resistance,1e-10,1e3,`Kontakt ${i+1}, R_K [m² K/W]`);
    if(c.shoulder==='convection')finiteRange(shoulderAlpha(p,i),0,1e5,`Schulter ${i+1}, Wärmeübergang`);
  });
  [p.left,p.right].forEach((b,i)=>{
    const side=i===0?'Linkes Ende':'Rechtes Ende';
    if(b.kind==='dirichlet')finiteRange(b.temperature,-273.15,2000,`${side}, Temperatur`);
    if(b.kind==='neumann')finiteRange(b.flux,-1e7,1e7,`${side}, Wärmestromdichte`);
    if(b.kind==='robin')finiteRange(endAlpha(p,i as 0|1),0,1e5,`${side}, Wärmeübergang`);
  });
}
export function modelWarnings(p:Parameters):string[] {
  const out:string[]=[];
  p.segments.forEach((s,i)=>{
    const bi=transverseBi(p,i);
    if(bi>.1)out.push(`Segment ${i+1}: Bi⊥ = ${format(bi)} > 0,1. Temperaturunterschiede innerhalb des Querschnitts können relevant sein. Die 1D-Annahme ist eingeschränkt.`);
    if(s.length/s.diameter<3)out.push(`Segment ${i+1}: L/d = ${format(s.length/s.diameter)} < 3,0. Kurzes, breites Segment: Die Stabannahme ist eingeschränkt (heuristische Warnschwelle).`);
    if(s.material==='aerogel')out.push(`Segment ${i+1}: Aerogel ist ein idealisierter Lehrdatensatz mit angenommener Wärmekapazität; kein Produktdatensatz.`);
    if(s.material==='pmma')out.push(`Segment ${i+1}: PMMA-Werte gelten näherungsweise bei Raumtemperatur. Erweichung und Änderungen der Stoffwerte werden nicht berechnet.`);
  });
  p.contacts.forEach((_,i)=>{
    const ratio=Math.max(p.segments[i].diameter,p.segments[i+1].diameter)/Math.min(p.segments[i].diameter,p.segments[i+1].diameter);
    if(ratio>1.5)out.push(`Kontakt ${i+1}: Durchmesserverhältnis ${format(ratio)}, kontaktierter Flächenanteil ${format(100/ratio**2)} %. ${ratio>3?'Deutlich eingeschränkte Aussagekraft: ':''}Räumliche Verengung/Aufweitung des Wärmeflusses wird nicht erfasst. Heuristische Warnschwelle, keine Fehlergrenze.`);
  });
  return out;
}
export function buildMesh(p:Parameters,targetCells=160):Mesh {
  validate(p);
  const length=p.segments.reduce((sum,s)=>sum+s.length/1000,0);
  const mesh:Mesh={x:[],dx:[],area:[],capacity:[],segment:[],conductivity:[],initial:[],conductance:[],sink:[],source:[],boundaryConductance:[0,0],interfaces:[],length};
  let x=0;
  p.segments.forEach((s,i)=>{
    const n=Math.max(8,Math.round(targetCells*(s.length/1000)/length));
    const dx=s.length/1000/n, area=Math.PI*(s.diameter/1000)**2/4;
    if(i>0)mesh.interfaces.push({x,left:mesh.x.length-1,right:mesh.x.length,contact:i-1});
    for(let j=0;j<n;j++) {
      mesh.x.push(x+(j+.5)*dx);mesh.dx.push(dx);mesh.area.push(area);
      mesh.capacity.push(s.density*s.cp*area*dx);mesh.segment.push(i);
      mesh.conductivity.push(s.conductivity);mesh.initial.push(segmentInitial(p,i));
      const h=segmentAlpha(p,i)*Math.PI*s.diameter/1000*dx;
      mesh.sink.push(h);mesh.source.push(h*segmentAmbient(p,i));
    }
    x+=s.length/1000;
  });
  for(let j=0;j<mesh.x.length-1;j++) {
    let resistance=mesh.dx[j]/(2*mesh.conductivity[j]*mesh.area[j])+mesh.dx[j+1]/(2*mesh.conductivity[j+1]*mesh.area[j+1]);
    if(mesh.segment[j]!==mesh.segment[j+1]) {
      const k=mesh.segment[j], c=p.contacts[k];
      if(!c.perfect)resistance+=c.resistance/Math.min(mesh.area[j],mesh.area[j+1]);
      // Shoulder convection is a lumped sink on the larger segment's boundary cell.
      // It does NOT introduce an unmodelled spreading resistance.
      if(c.shoulder==='convection') {
        const larger=mesh.area[j]>=mesh.area[j+1]?j:j+1;
        const h=shoulderAlpha(p,k)*Math.abs(mesh.area[j]-mesh.area[j+1]);
        mesh.sink[larger]+=h;mesh.source[larger]+=h*shoulderAmbient(p,k);
      }
    }
    mesh.conductance.push(1/resistance);
  }
  [p.left,p.right].forEach((b,side)=>{
    const j=side===0?0:mesh.x.length-1;
    if(b.kind==='neumann')mesh.source[j]-=b.flux*mesh.area[j];
    else {
      const alpha=endAlpha(p,side as 0|1);
      const g=b.kind==='dirichlet'?2*mesh.conductivity[j]*mesh.area[j]/mesh.dx[j]:alpha===0?0:1/(mesh.dx[j]/(2*mesh.conductivity[j]*mesh.area[j])+1/(alpha*mesh.area[j]));
      mesh.boundaryConductance[side]=g;mesh.sink[j]+=g;
      mesh.source[j]+=g*(b.kind==='dirichlet'?b.temperature:endAmbient(p,side as 0|1));
    }
  });
  return mesh;
}
function factor(diagonal:number[],off:number[]) {
  const d=[...diagonal],mult:number[]=[];
  for(let i=1;i<d.length;i++){mult[i]=-off[i-1]/d[i-1];d[i]-=mult[i]*(-off[i-1]);}
  if(d.some(x=>!Number.isFinite(x)||x<=0))throw new Error('Numerisch schlecht konditionierter Fall. Geometrie oder Kontaktwiderstände weniger extrem wählen.');
  return (rhs:number[])=>{
    const y=[...rhs];
    for(let i=1;i<y.length;i++)y[i]-=mult[i]*y[i-1];
    y[y.length-1]/=d[d.length-1];
    for(let i=y.length-2;i>=0;i--)y[i]=(y[i]+off[i]*y[i+1])/d[i];
    return y;
  };
}
function stationary(mesh:Mesh,diagonal:number[]):Pick<Simulation,'stationary'|'stationaryKind'|'stationaryMessage'> {
  if(mesh.sink.some(x=>x>0))return {stationary:factor(diagonal,mesh.conductance)(mesh.source),stationaryKind:'unique',stationaryMessage:'Stationärer Zustand separat aus der zeitunabhängigen Energiebilanz berechnet.'};
  const net=mesh.source.reduce((a,b)=>a+b,0),scale=mesh.source.reduce((a,b)=>a+Math.abs(b),0);
  if(Math.abs(net)>Math.max(1e-12,scale*1e-10))return {stationary:null,stationaryKind:'none',stationaryMessage:`Kein stationärer Zustand: Alle Wärmeübergänge sind null und die Netto-Wärmezufuhr beträgt ${format(net)} W. Die mittlere Temperatur ändert sich dauerhaft. T∞ wirkt ohne Wärmeübergang nicht.`};
  // Neumann-only matrix has a constant nullspace. Integrate face heat flows,
  // then fix the additive temperature with the conserved INITIAL thermal energy.
  const t=[0];let q=0;
  for(let i=0;i<mesh.conductance.length;i++){q+=mesh.source[i];t.push(t[i]-q/mesh.conductance[i]);}
  const capacity=mesh.capacity.reduce((a,b)=>a+b,0);
  const shift=mesh.capacity.reduce((a,c,i)=>a+c*(mesh.initial[i]-t[i]),0)/capacity;
  return {stationary:t.map(x=>x+shift),stationaryKind:'energy',stationaryMessage:'Keine Temperaturankopplung: Das stationäre Temperaturniveau wird aus der erhaltenen Anfangsenergie bestimmt. Bei ausgeglichenen Endwärmeströmen kann ein Temperaturgradient bleiben.'};
}
export function simulate(p:Parameters,options:{cells?:number;steps?:number;frames?:number}={}):Simulation {
  const mesh=buildMesh(p,options.cells??160),n=mesh.x.length;
  const frames=options.frames??201,steps=Math.max(frames-1,Math.ceil((options.steps??2000)/(frames-1))*(frames-1));
  const dt=p.endTime/steps;
  const diagonal=mesh.sink.map((h,i)=>h+(i>0?mesh.conductance[i-1]:0)+(i<n-1?mesh.conductance[i]:0));
  const steady=stationary(mesh,diagonal);
  const solve=factor(diagonal.map((x,i)=>x+mesh.capacity[i]/dt),mesh.conductance);
  const temperatures=[mesh.initial],times=[0];let t=[...mesh.initial];
  const stride=steps/(frames-1);
  for(let k=1;k<=steps;k++) {
    t=solve(t.map((v,i)=>mesh.source[i]+mesh.capacity[i]*v/dt));
    if(t.some(v=>!Number.isFinite(v)))throw new Error('Berechnung liefert keine endlichen Temperaturen. Eingaben prüfen.');
    if(k%stride===0){temperatures.push(t);times.push(k*dt);}
  }
  const warnings=modelWarnings(p);
  const extreme=[...temperatures.flat(),...(steady.stationary??[])];
  if(extreme.some(T=>T< -273.15))warnings.push('Die mathematische Lösung unterschreitet den absoluten Nullpunkt. Dieser Fall ist physikalisch unzulässig; Wärmestrom und Temperaturankopplung prüfen.');
  if(extreme.some(T=>T>2000))warnings.push('Berechnete Temperaturen über 2.000 °C: Konstante Stoffwerte und das Modell ohne Strahlung/Phasenübergänge sind für diesen Fall nicht belastbar.');
  return {mesh,times,temperatures,...steady,warnings,cells:n,steps};
}
export interface Profile { x:number[]; temperature:number[]; segment:number[] }
export function profile(mesh:Mesh,p:Parameters,t:number[],initial=false):Profile {
  const x:number[]=[],temperature:number[]=[],segment:number[]=[];
  const add=(pos:number,temp:number,seg:number)=>{x.push(pos*1000);temperature.push(temp);segment.push(seg);};
  const boundaryTemp=(b:Boundary,side:0|1)=>{
    const j=side===0?0:t.length-1;
    if(initial)return t[j];
    if(b.kind==='dirichlet')return b.temperature;
    const q=b.kind==='neumann'?b.flux*mesh.area[j]:mesh.boundaryConductance[side]*(t[j]-endAmbient(p,side));
    return t[j]-q*mesh.dx[j]/(2*mesh.conductivity[j]*mesh.area[j]);
  };
  add(0,boundaryTemp(p.left,0),0);
  for(let i=0;i<t.length;i++) {
    add(mesh.x[i],t[i],mesh.segment[i]);
    if(i<t.length-1&&mesh.segment[i]!==mesh.segment[i+1]) {
      const pos=mesh.x[i]+mesh.dx[i]/2;
      const q=initial?0:mesh.conductance[i]*(t[i]-t[i+1]);
      add(pos,t[i]-q*mesh.dx[i]/(2*mesh.conductivity[i]*mesh.area[i]),mesh.segment[i]);
      add(pos,t[i+1]+q*mesh.dx[i+1]/(2*mesh.conductivity[i+1]*mesh.area[i+1]),mesh.segment[i+1]);
    }
  }
  add(mesh.length,boundaryTemp(p.right,1),p.segments.length-1);
  return {x,temperature,segment};
}
