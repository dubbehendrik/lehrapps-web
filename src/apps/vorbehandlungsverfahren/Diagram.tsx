import { useId, type ReactNode } from 'react';
import type { Parameters, Result } from './logic';
import { format as f } from './logic';

const blue = '#164a87', orange = '#a34c00', grey = '#425d70', loop = '#713c91';
function SymbolText({base, sub, dotted = false}: {base:string; sub:string; dotted?:boolean}) {
  return <>{dotted ? base + '\u0307' : base}<tspan baselineShift="sub" fontSize="13">{sub}</tspan></>;
}
function Label({x,y,children,anchor='start',color=grey}: {x:number;y:number;children:ReactNode;anchor?:'start'|'middle'|'end';color?:string}) {
  return <text x={x} y={y} textAnchor={anchor} fill={color} className="vt-svg-label">{children}</text>;
}
function Dimension({x1,y1,x2,y2,text,vertical=false,side=1,offset=24}: {
  x1:number;y1:number;x2:number;y2:number;text:ReactNode;vertical?:boolean;side?:1|-1;offset?:number;
}) {
  const marker='vt-dim-'+useId().replace(/:/g,'');
  return <g stroke={grey} strokeWidth="1.2" fill="none" className="vt-dimension">
    <defs><marker id={marker} viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L9 4L0 8" fill="none" stroke={grey} strokeWidth="1.3"/></marker></defs>
    <path d={'M'+x1+' '+y1+'L'+x2+' '+y2} markerStart={'url(#'+marker+')'} markerEnd={'url(#'+marker+')'}/>
    {vertical ? <><path d={'M'+(x1-6)+' '+y1+'h12M'+(x2-6)+' '+y2+'h12'}/><text transform={'translate('+(x1+side*offset)+' '+((y1+y2)/2)+') rotate(-90)'} textAnchor="middle" dominantBaseline="middle" stroke="none" fill={grey} className="vt-svg-dim">{text}</text></>
    : <><path d={'M'+x1+' '+(y1-6)+'v12M'+x2+' '+(y2-6)+'v12'}/><text x={(x1+x2)/2} y={y1+side*offset} textAnchor="middle" dominantBaseline="middle" stroke="none" fill={grey} className="vt-svg-dim">{text}</text></>}
  </g>;
}
function Adiabatic({x,y,width,height}: {x:number;y:number;width:number;height:number}) {
  return <g fill={grey} fontSize="16" aria-label="Adiabate Wände und Boden">
    {Array.from({length:Math.floor(width/24)},(_,i)=><text key={'b'+i} x={x+12+i*24} y={y+height+22}>×</text>)}
    {Array.from({length:Math.floor(height/25)},(_,i)=><g key={'s'+i}><text x={x-22} y={y+18+i*25}>×</text><text x={x+width+12} y={y+18+i*25}>×</text></g>)}
  </g>;
}
// Allocate nozzles across all four sides; each side is drawn with uniform spacing.
// Very large arrays are represented by a bounded subset; the calculated count is unchanged.
function Nozzles({r,x,y,w,h,marker,jets=false}: {r:Result;x:number;y:number;w:number;h:number;marker:string;jets?:boolean}) {
  const count=Math.min(40,Math.max(4,r.nozzlesPerRing));
  const horizontal=Math.max(1,Math.min(Math.floor((count-2)/2),Math.round(count/2*r.ringWidth/(r.ringWidth+r.ringHeight))));
  const vertical=count-2*horizontal;
  const sides=[horizontal,Math.ceil(vertical/2),horizontal,Math.floor(vertical/2)];
  return <g aria-label="Düsen an allen vier Seiten des Spritzrings">
    {sides.flatMap((n,side)=>Array.from({length:n},(_,i)=>{
      const t=(i+1)/(n+1);
      const px=side===0||side===2?x+t*w:side===1?x+w:x;
      const py=side===1||side===3?y+t*h:side===0?y:y+h;
      const angle=[90,180,270,0][side];
      return <g key={side+'-'+i} data-nozzle-side={side} transform={'translate('+px+' '+py+') rotate('+angle+')'} stroke={blue} strokeWidth="1.8" fill="white"><path d="M0 -5L9 0L0 5Z"/>{jets&&<path d="M12 0H33" fill="none" markerEnd={'url(#'+marker+')'}/>}</g>;
    }))}
  </g>;
}
export function Diagram({p,r}: {p:Parameters;r:Result}) {
  const spray=r.kind==='spray', marker='vt-flow-'+useId().replace(/:/g,'');
  const arrow=(d:string,color=blue,width=2.5)=><path d={d} fill="none" stroke={color} strokeWidth={width} markerEnd={'url(#'+marker+')'}/>;
  return <figure className="vt-schema"><figcaption>
    <h2>{spray?'Spritzentfettung: Querschnitt und Flüssigkeitskreislauf':'Tauchentfettung: Ein- und Austauchen'}</h2>
    <p>Schema, nicht maßstäblich. Blau: Wasserströme; orange: Wärmeströme; violett und kräftig: Umlaufleitung. Orange gestrichelt: Systemgrenze. ×: adiabate Wände und Boden.</p>
  </figcaption><div className="vt-schema-scroll"><svg viewBox={spray?'0 0 1200 850':'0 0 1200 760'} role="img" aria-label={spray?'Spritzanlage mit Vorratsbecken, vierseitiger Düsenanordnung und eindeutig abgegrenztem Umlauf':'Tauchbad mit einem Werkstück sowie Pfeilen für Ein- und Austauchen'}>
    <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="context-stroke"/></marker></defs>
    <rect x="180" y="175" width="850" height={spray?555:465} rx="8" fill="none" stroke={orange} strokeWidth="2" strokeDasharray="10 7"/>
    <Label x={185} y={spray?760:670} color={orange}>Systemgrenze</Label>
    <Label x={1110} y={150} anchor="end"><SymbolText base="T" sub="∞"/> = {f(p.ambient)} °C</Label>
    {spray ? <>
      <rect x="295" y="290" width="430" height="245" rx="8" fill="#f8fafb" stroke={grey}/>
      <rect x="330" y="325" width="250" height="175" rx="6" fill="none" stroke={blue} strokeWidth="3"/>
      <Nozzles r={r} x={330} y={325} w={250} h={175} marker={marker} jets/>
      <rect x="400" y="380" width="110" height="70" fill="#d7dcdf" stroke={grey}/>
      <Label x={455} y={419} anchor="middle">Werkstück</Label>
      <Label x={605} y={505}>Spritzring</Label>
      <path d="M300 555V690H750V555" fill="none" stroke={grey} strokeWidth="3"/>
      <rect x="302" y="590" width="446" height="98" fill="#d6effa"/>
      <Adiabatic x={300} y={555} width={450} height={135}/>
      <Label x={525} y={617} anchor="middle">Wasseroberfläche: {f(r.area)} m²</Label>
      <Label x={525} y={662} anchor="middle"><SymbolText base="T" sub="B"/> = {f(p.temperature)} °C</Label>
      {arrow('M40 550H265V640H330')}<Label x={40} y={506} color={blue}>Frischwasser</Label><Label x={40} y={533} color={blue}><SymbolText base="m" sub="F" dotted/></Label>
      <Dimension x1={235} y1={590} x2={235} y2={690} vertical side={-1} offset={23} text={<><SymbolText base="h" sub="Bad"/> = {f(p.sprayHeight)} m</>}/>
      <path d="M650 665H900V300H455V325" fill="none" stroke={loop} strokeWidth="5"/>
      {arrow('M900 648V624',loop,4)}
      <Label x={940} y={245} anchor="end" color={loop}><SymbolText base="V" sub="Umlauf" dotted/></Label>
      <circle cx="900" cy="600" r="23" fill="white" stroke={grey} strokeWidth="2"/><path d="M883 615L900 580L917 615" fill="none" stroke={grey} strokeWidth="2"/>
      <Label x={945} y={606}>Pumpe</Label>
      <rect x="884" y="475" width="32" height="60" fill="white" stroke={grey} strokeWidth="2"/><path d="M884 505H916" stroke={grey} strokeWidth="2" strokeDasharray="6 5"/>
      <Label x={945} y={511}>Filter</Label>
      <circle cx="900" cy="365" r="24" fill="white" stroke={grey} strokeWidth="2"/><path d="M922 349H887L906 365L887 381H922" fill="none" stroke={grey} strokeWidth="2"/>
      <Label x={945} y={357}>Wärme-</Label><Label x={945} y={383}>tauscher</Label>
      {arrow('M1130 315H925',orange)}<Label x={1120} y={282} anchor="end" color={orange}>Heizwärme <SymbolText base="Q" sub="H" dotted/></Label>
      {/* The bridge distinguishes a crossing stream from a piping junction. */}
      {arrow('M510 440H886Q900 418 914 440H1130')}
      <Label x={1120} y={466} anchor="end" color={blue}>Verschleppung <SymbolText base="m" sub="S" dotted/></Label>
      <Label x={525} y={804} anchor="middle">Vorratsbecken: {f(r.volume)} m³</Label>
    </> : <>
      <path d="M300 380V580H860V380" fill="none" stroke={grey} strokeWidth="3"/>
      <rect x="302" y="410" width="556" height="168" fill="#d6effa"/>
      <Adiabatic x={300} y={380} width={560} height={200}/>
      <rect x="540" y="465" width="120" height="75" fill="#d7dcdf" stroke={grey}/>
      <Label x={600} y={507} anchor="middle">Werkstück</Label>
      {arrow('M380 130V475',grey)}{arrow('M850 475V130',grey)}
      <Label x={380} y={75} anchor="middle">Eintauchen</Label><Label x={380} y={104} anchor="middle"><SymbolText base="m" sub="W,in" dotted/></Label>
      <Label x={850} y={75} anchor="middle">Austauchen</Label><Label x={850} y={104} anchor="middle"><SymbolText base="m" sub="W,out" dotted/></Label>
      <Label x={600} y={438} anchor="middle">Wasseroberfläche: {f(r.area)} m²</Label>
      <Label x={685} y={562} anchor="middle"><SymbolText base="T" sub="B"/> = {f(p.temperature)} °C</Label>
      {arrow('M40 345H265V465H330')}<Label x={40} y={301} color={blue}>Frischwasser</Label><Label x={40} y={328} color={blue}><SymbolText base="m" sub="F" dotted/></Label>
      {arrow('M850 285H1130')}<Label x={1120} y={241} anchor="end" color={blue}>Verschleppung am Werkstück</Label><Label x={1120} y={270} anchor="end" color={blue}><SymbolText base="m" sub="S" dotted/></Label>
      {arrow('M1130 510H835',orange)}<Label x={1120} y={475} anchor="end" color={orange}>Heizwärme <SymbolText base="Q" sub="H" dotted/></Label>
      <Dimension x1={235} y1={410} x2={235} y2={580} vertical side={-1} text={<><SymbolText base="h" sub="Bad"/> = {f(p.dipHeight)} m</>}/>
      <Dimension x1={300} y1={695} x2={860} y2={695} side={1} text={<><SymbolText base="L" sub="Bad"/> = {f(p.dipLength)} m</>}/>
      <Label x={580} y={752} anchor="middle">Breite: {f(p.dipWidth)} m · Volumen: {f(r.volume)} m³</Label>
    </>}
    {/* Loss arrows start inside the system; labels have separate horizontal lanes. */}
    {arrow(spray?'M515 290V130':'M500 410V130')}
    <Label x={spray?515:500} y={70} anchor="middle" color={blue}>Verdunstung</Label><Label x={spray?515:500} y={102} anchor="middle" color={blue}><SymbolText base="m" sub="D" dotted/></Label>
    {arrow(spray?'M620 290V130':'M605 410V130',orange)}
    <Label x={spray?620:605} y={45} anchor="middle" color={orange}>Konvektion</Label><Label x={spray?620:605} y={102} anchor="middle" color={orange}><SymbolText base="Q" sub="Konv" dotted/></Label>
    {arrow(spray?'M725 290V130':'M710 410V130',orange)}
    <Label x={spray?725:710} y={70} anchor="middle" color={orange}>Strahlung</Label><Label x={spray?725:710} y={102} anchor="middle" color={orange}><SymbolText base="Q" sub="Str" dotted/></Label>
    {spray&&<>{arrow('M810 290V130',orange)}<Label x={860} y={45} anchor="middle" color={orange}>Wärmeverlust Versprühen</Label><Label x={810} y={102} anchor="middle" color={orange}><SymbolText base="Q" sub="Spritz" dotted/></Label></>}
  </svg></div>
  {spray&&<><h3>Spritzring: Geometrie und Düsenanordnung</h3><div className="vt-schema-scroll"><svg viewBox="0 0 1200 600" role="img" aria-label="Bemaßter vierseitiger Spritzring">
    <defs><marker id={marker+'detail'} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10" fill={blue}/></marker></defs>
    <rect x="300" y="115" width="360" height="320" rx="5" fill="none" stroke={blue} strokeWidth="3"/>
    <Nozzles r={r} x={300} y={115} w={360} h={320} marker={marker+'detail'}/>
    <rect x="390" y="205" width="180" height="140" fill="#d7dcdf" stroke={grey}/>
    <Label x={480} y={280} anchor="middle">Werkstück</Label>
    <Dimension x1={300} y1={60} x2={660} y2={60} side={-1} text={<><SymbolText base="B" sub="Ring"/> = {f(r.ringWidth)} m</>}/>
    <Dimension x1={230} y1={115} x2={230} y2={435} vertical side={-1} text={<><SymbolText base="H" sub="Ring"/> = {f(r.ringHeight)} m</>}/>
    <Dimension x1={390} y1={390} x2={570} y2={390} side={1} text={<><SymbolText base="B" sub="W"/> = {f(p.partWidth)} m</>}/>
    <Dimension x1={610} y1={205} x2={610} y2={345} vertical side={-1} offset={22} text={<><SymbolText base="H" sub="W"/> = {f(p.partHeight)} m</>}/>
    <Dimension x1={300} y1={510} x2={390} y2={510} side={1} text={<>d = {f(p.distance)} m</>}/>
    <path d="M300 445V518M390 350V518" stroke={grey} strokeDasharray="4 4"/>
    <Dimension x1={715} y1={195} x2={715} y2={275} vertical side={1} offset={24} text={<><SymbolText base="d" sub="D"/> ≤ {f(p.nozzleSpacing)} m</>}/>
    <path d="M672 195H721M672 275H721" stroke={grey} strokeDasharray="4 4"/>
    <Label x={780} y={140}>Düsenabstand am Umfang:</Label>
    <Label x={780} y={171}><SymbolText base="d" sub="D"/> ≤ {f(p.nozzleSpacing)} m</Label>
    <Label x={780} y={225}>{f(r.nozzlesPerRing)} Düsen pro Ring</Label>
    <Label x={780} y={280}>Düsen auf allen vier Seiten.</Label>
    <Label x={780} y={311}>Anordnung schematisch.</Label>
    <Label x={600} y={590} anchor="middle">Ringmaße = Werkstückmaße + zweimal Spritzabstand d</Label>
  </svg></div><h3>Längsschnitt: Förderung und Ringabstand</h3><div className="vt-schema-scroll"><svg viewBox="0 0 1200 350" role="img" aria-label="Längsschnitt mit klar abgesetzter Bemaßung">
    <rect x="230" y="100" width="760" height="105" fill="#f8fafb" stroke={grey}/>
    {Array.from({length:Math.min(12,r.rings)},(_,i)=><path key={i} d={'M'+(250+i*720/(Math.min(12,r.rings)-1||1))+' 105v95'} stroke={blue} strokeWidth="3"/>)}
    <rect x="500" y="130" width="120" height="40" fill="#d7dcdf" stroke={grey}/>
    {arrow('M35 150H205')}<Label x={35} y={113}><SymbolText base="u" sub="F"/> = {f(p.speed)} m/min</Label>
    <Dimension x1={230} y1={55} x2={990} y2={55} side={-1} text={<><SymbolText base="L" sub="Spritz"/> = {f(r.activeLength)} m</>}/>
    <Dimension x1={500} y1={245} x2={620} y2={245} side={1} text={<><SymbolText base="L" sub="W"/> = {f(p.partLength)} m</>}/>
    <Dimension x1={250} y1={245} x2={250+720/(Math.min(12,r.rings)-1||1)} y2={245} side={1} offset={38} text={<><SymbolText base="a" sub="Ring"/> ≤ {f(p.ringSpacing)} m</>}/>
    <path d={'M250 205v46M'+(250+720/(Math.min(12,r.rings)-1||1))+' 205v46'} stroke={grey} strokeDasharray="4 4"/>
    <Label x={610} y={335} anchor="middle">{f(r.rings)} Ringe · Spritzdauer {f(p.dwell)} min · Ringanzahl ggf. reduziert dargestellt</Label>
  </svg></div></>}
  </figure>;
}
