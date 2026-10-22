import { useId, type ReactNode } from 'react';
import type { Parameters, Result } from './logic';
import { format as f } from './logic';

const blue = '#164a87', orange = '#a34c00', grey = '#425d70';
function SymbolText({base,sub,dotted=false}:{base:string;sub:string;dotted?:boolean}) {
  return <>{dotted ? base+'\u0307' : base}<tspan baselineShift="sub" fontSize="13">{sub}</tspan></>;
}
function Label({x,y,children,anchor='start',color=grey}:{x:number;y:number;children:ReactNode;anchor?:'start'|'middle'|'end';color?:string}) {
  return <text x={x} y={y} textAnchor={anchor} fill={color} className="vt-svg-label">{children}</text>;
}
function Dimension({x1,y1,x2,y2,text,vertical=false}:{x1:number;y1:number;x2:number;y2:number;text:ReactNode;vertical?:boolean}) {
  return <g stroke={grey} strokeWidth="1.3" fill="none">
    <path d={'M'+x1+' '+y1+'L'+x2+' '+y2}/>
    {vertical ? <><path d={'M'+(x1-6)+' '+y1+'h12M'+(x2-6)+' '+y2+'h12'}/><text transform={'translate('+(x1-11)+' '+((y1+y2)/2)+') rotate(-90)'} textAnchor="middle" stroke="none" fill={grey} className="vt-svg-dim">{text}</text></>
    : <><path d={'M'+x1+' '+(y1-6)+'v12M'+x2+' '+(y2-6)+'v12'}/><text x={(x1+x2)/2} y={y1-10} textAnchor="middle" stroke="none" fill={grey} className="vt-svg-dim">{text}</text></>}
  </g>;
}
function Adiabatic({x,y,width,height}:{x:number;y:number;width:number;height:number}) {
  return <g fill={grey} fontSize="16" aria-label="Adiabate Wände und Boden">
    {Array.from({length:Math.floor(width/22)},(_,i)=><text key={'b'+i} x={x+10+i*22} y={y+height+19}>×</text>)}
    {Array.from({length:Math.floor(height/24)},(_,i)=><g key={'s'+i}><text x={x-18} y={y+18+i*24}>×</text><text x={x+width+7} y={y+18+i*24}>×</text></g>)}
  </g>;
}
export function Diagram({p,r}:{p:Parameters;r:Result}) {
  const spray=r.kind==='spray', id=useId().replace(/:/g,''), marker='vt-arrow-'+id;
  const arrow=(d:string,color=blue)=><path d={d} fill="none" stroke={color} strokeWidth="2.5" markerEnd={'url(#'+marker+')'}/>;
  const streams=<>
    {arrow('M410 195V95',blue)}<Label x={410} y={66} anchor="middle" color={blue}>Verdunstung <SymbolText base="m" sub="D" dotted/></Label>
    {arrow('M505 195V95',orange)}<Label x={505} y={40} anchor="middle" color={orange}>Konvektion</Label><Label x={505} y={67} anchor="middle" color={orange}><SymbolText base="Q" sub="Konv" dotted/></Label>
    {arrow('M600 195V95',orange)}<Label x={600} y={40} anchor="middle" color={orange}>Strahlung</Label><Label x={600} y={67} anchor="middle" color={orange}><SymbolText base="Q" sub="Str" dotted/></Label>
  </>;
  return <figure className="vt-schema"><figcaption>
    <h2>{spray?'Spritzentfettung: Querschnitt und Flüssigkeitskreislauf':'Tauchentfettung: Ein- und Austauchen'}</h2>
    <p>Schema, nicht maßstäblich. Blau: Wasserströme; orange: Wärmeströme. Orange gestrichelt: Systemgrenze. ×: adiabate Wände und Boden.</p>
  </figcaption><div className="vt-schema-scroll"><svg viewBox={spray?'0 0 1100 690':'0 0 1100 630'} role="img" aria-label={spray?'Spritzanlage mit Systemgrenze, benannten Strömen und R-I-Symbolen':'Tauchbad mit Systemgrenze, adiabaten Wänden und ein- und austauchenden Werkstücken'}>
    <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="context-stroke"/></marker></defs>
    <rect x="180" y="125" width={spray?770:650} height={spray?480:405} rx="8" fill="none" stroke={orange} strokeWidth="2" strokeDasharray="10 7"/>
    <Label x={185} y={spray?637:563} color={orange}>Systemgrenze</Label>
    <Label x={730} y={100}><SymbolText base="T" sub="∞"/> = {f(p.ambient)} °C</Label>
    {streams}
    {spray ? <>
      <rect x="245" y="200" width="435" height="220" rx="8" fill="#f8fafb" stroke={grey}/>
      <rect x="315" y="220" width="210" height="165" rx="10" fill="none" stroke={blue} strokeWidth="4"/>
      <rect x="375" y="260" width="90" height="90" fill="#d7dcdf" stroke={grey}/>
      <Label x={420} y={302} anchor="middle">Werkstück</Label>
      {[245,290,335,365].map(y=><g key={y}>{arrow('M318 '+y+'h38')}{arrow('M522 '+y+'h-38')}</g>)}
      <Label x={550} y={245}>Spritzring</Label>
      <Label x={550} y={280} color={orange}><SymbolText base="Q" sub="Spritz" dotted/></Label>
      {arrow('M550 290H650',orange)}
      <Label x={555} y={319}>Wärmeverlust</Label><Label x={555} y={343}>beim Versprühen</Label>
      <path d="M270 435V565H680V435" fill="none" stroke={grey} strokeWidth="3"/>
      <rect x="272" y="475" width="406" height="88" fill="#d6effa"/>
      <Adiabatic x={270} y={440} width={410} height={125}/>
      <Label x={470} y={520} anchor="middle"><SymbolText base="T" sub="B"/> = {f(p.temperature)} °C</Label>
      {arrow('M80 465H300')}<Label x={80} y={426} color={blue}>Frischwasser</Label><Label x={80} y={451} color={blue}><SymbolText base="m" sub="F" dotted/></Label>
      {arrow('M680 430H1020')}<Label x={1020} y={391} anchor="end" color={blue}>Verschleppung</Label><Label x={1020} y={416} anchor="end" color={blue}><SymbolText base="m" sub="S" dotted/></Label>
      <path d="M650 545H825V215H525" fill="none" stroke={blue} strokeWidth="3"/>
      {arrow('M825 530V490')}
      <circle cx="825" cy="465" r="22" fill="white" stroke={grey} strokeWidth="2"/><path d="M809 480L825 445L841 480" fill="none" stroke={grey} strokeWidth="2"/>
      <Label x={865} y={471}>Pumpe</Label>
      <rect x="809" y="350" width="32" height="60" fill="white" stroke={grey} strokeWidth="2"/><path d="M809 380H841" stroke={grey} strokeWidth="2" strokeDasharray="6 5"/>
      <Label x={865} y={386}>Filter</Label>
      <circle cx="825" cy="280" r="24" fill="white" stroke={grey} strokeWidth="2"/><path d="M847 264H812L831 280L812 296H847" fill="none" stroke={grey} strokeWidth="2"/>
      <Label x={865} y={272}>Wärme-</Label><Label x={865} y={296}>tauscher</Label>
      {arrow('M1030 225H850',orange)}<Label x={1020} y={191} anchor="end" color={orange}>Heizwärme <SymbolText base="Q" sub="H" dotted/></Label>
      <Label x={785} y={190} anchor="end" color={blue}><SymbolText base="V" sub="Umlauf" dotted/></Label>
      <Dimension x1={220} y1={475} x2={220} y2={565} vertical text={<><SymbolText base="h" sub="Bad"/> = {f(p.sprayHeight)} m</>}/>
      <Label x={470} y={620} anchor="middle">Vorratsbecken: {f(r.volume)} m³ · freie Fläche: {f(r.area)} m²</Label>
    </> : <>
      <path d="M245 280V495H765V280" fill="none" stroke={grey} strokeWidth="3"/>
      <rect x="247" y="310" width="516" height="183" fill="#d6effa"/>
      <Adiabatic x={245} y={285} width={520} height={210}/>
      <rect x="280" y="190" width="70" height="75" fill="#d7dcdf" stroke={grey}/>
      <rect x="470" y="365" width="70" height="75" fill="#d7dcdf" stroke={grey}/>
      <rect x="670" y="190" width="70" height="75" fill="#d7dcdf" stroke={grey}/>
      {arrow('M315 270V345',grey)}{arrow('M705 345V270',grey)}
      <Label x={315} y={158} anchor="middle">Eintauchen</Label><Label x={705} y={158} anchor="middle">Austauchen</Label>
      <Label x={315} y={183} anchor="middle"><SymbolText base="m" sub="W,in" dotted/></Label>
      <Label x={705} y={183} anchor="middle"><SymbolText base="m" sub="W,out" dotted/></Label>
      <Label x={505} y={412} anchor="middle">Werkstück</Label>
      <Label x={580} y={465}><SymbolText base="T" sub="B"/> = {f(p.temperature)} °C</Label>
      {arrow('M65 380H270')}<Label x={65} y={341} color={blue}>Frischwasser</Label><Label x={65} y={366} color={blue}><SymbolText base="m" sub="F" dotted/></Label>
      {arrow('M740 300H1025')}<Label x={1025} y={263} anchor="end" color={blue}>Verschleppung</Label><Label x={1025} y={288} anchor="end" color={blue}><SymbolText base="m" sub="S" dotted/></Label>
      {arrow('M1020 420H745',orange)}<Label x={1020} y={382} anchor="end" color={orange}>Heizwärme</Label><Label x={1020} y={407} anchor="end" color={orange}><SymbolText base="Q" sub="H" dotted/></Label>
      <Dimension x1={205} y1={310} x2={205} y2={495} vertical text={<><SymbolText base="h" sub="Bad"/> = {f(p.dipHeight)} m</>}/>
      <Dimension x1={245} y1={585} x2={765} y2={585} text={<><SymbolText base="L" sub="Bad"/> = {f(p.dipLength)} m</>}/>
      <Label x={505} y={620} anchor="middle">Breite: {f(p.dipWidth)} m · Volumen: {f(r.volume)} m³ · Oberfläche: {f(r.area)} m²</Label>
    </>}
  </svg></div>
  {spray&&<><h3>Spritzring: Geometrie und Düsenanordnung</h3><div className="vt-schema-scroll"><svg viewBox="0 0 1100 490" role="img" aria-label="Bemaßter Spritzring mit Werkstückmaßen, Spritzabstand und Düsenabstand">
    <rect x="300" y="95" width="300" height="280" rx="10" fill="none" stroke={blue} strokeWidth="4"/>
    <rect x="375" y="170" width="150" height="130" fill="#d7dcdf" stroke={grey}/>
    <Label x={450} y={240} anchor="middle">Werkstück</Label>
    {[145,215,285,345].map(y=><g key={y} stroke={blue} fill="white"><path d={'M300 '+(y-6)+'l10 6l-10 6z'}/><path d={'M600 '+(y-6)+'l-10 6l10 6z'}/></g>)}
    <Dimension x1={300} y1={55} x2={600} y2={55} text={<><SymbolText base="B" sub="Ring"/> = {f(r.ringWidth)} m</>}/>
    <Dimension x1={240} y1={95} x2={240} y2={375} vertical text={<><SymbolText base="H" sub="Ring"/> = {f(r.ringHeight)} m</>}/>
    <Dimension x1={375} y1={340} x2={525} y2={340} text={<><SymbolText base="B" sub="W"/> = {f(p.partWidth)} m</>}/>
    <Dimension x1={550} y1={170} x2={550} y2={300} vertical text={<><SymbolText base="H" sub="W"/> = {f(p.partHeight)} m</>}/>
    <Dimension x1={300} y1={415} x2={375} y2={415} text={'d = '+f(p.distance)+' m'}/>
    <path d="M300 380V425M375 305V425" stroke={grey} strokeWidth="1" strokeDasharray="4 4"/>
    <Dimension x1={660} y1={145} x2={660} y2={215} vertical text={<><SymbolText base="d" sub="D"/> ≤ {f(p.nozzleSpacing)} m</>}/>
    <path d="M610 145H670M610 215H670" stroke={grey} strokeWidth="1" strokeDasharray="4 4"/>
    <Label x={720} y={140}>Düsenabstand entlang</Label><Label x={720} y={166}>des Ringumfangs</Label>
    <Label x={720} y={225}>{f(r.nozzlesPerRing)} Düsen pro Ring</Label>
    <Label x={720} y={270}>Düsen schematisch dargestellt.</Label>
    <Label x={720} y={296}>Anzahl wird aufgerundet.</Label>
    <Label x={450} y={465} anchor="middle">Ringabmessungen = Werkstückabmessungen + zweimal Spritzabstand d</Label>
  </svg></div><h3>Längsschnitt: Förderung und Ringabstand</h3><div className="vt-schema-scroll"><svg viewBox="0 0 1100 280" role="img" aria-label="Längsschnitt mit Ringabstand, aktiver Länge und Werkstücklänge">
    <rect x="220" y="80" width="680" height="100" fill="#f8fafb" stroke={grey}/>
    {Array.from({length:Math.min(14,r.rings)},(_,i)=><path key={i} d={'M'+(240+i*640/(Math.min(14,r.rings)-1||1))+' 85v90'} stroke={blue} strokeWidth="3"/>)}
    <rect x="440" y="110" width="110" height="40" fill="#d7dcdf" stroke={grey}/>
    {arrow('M35 130H195')}<Label x={35} y={96}><SymbolText base="u" sub="F"/> = {f(p.speed)} m/min</Label>
    <Dimension x1={220} y1={45} x2={900} y2={45} text={<><SymbolText base="L" sub="Spritz"/> = {f(r.activeLength)} m</>}/>
    <Dimension x1={440} y1={215} x2={550} y2={215} text={<><SymbolText base="L" sub="W"/> = {f(p.partLength)} m</>}/>
    <Label x={650} y={213}>Ringabstand ≤ {f(p.ringSpacing)} m</Label>
    <Label x={220} y={265}>{f(r.rings)} Ringe · Spritzdauer {f(p.dwell)} min · Ringe schematisch, Anzahl ggf. reduziert</Label>
  </svg></div></>}
  </figure>;
}
