import type {Geometry,Process,Simulation,Frame} from './types';
// Geometry: millimetres, mm³ internally; material model in SI.
export const defaultGeometry:Geometry={pencilLength:170,pencilDiameter:7,tipLength:15,embedDepth:10,holderDiameter:40,holderHeight:25,clampDiameter:4,bodyDiameter:60,reservoirDiameter:14,reservoirDepth:10,guideLength:50,pointAngle:118,lidThickness:5,lidOpening:14,boltCircle:36,boltDiameter:4,threadDepth:12,grooveWidth:2,grooveDepth:2,freeLength:15,overlap:1};
export const defaultProcess:Process={fillPercent:100,duration:3,viscosity:5,surfaceTension:40,density:1.11,solidsMass:44,solidDensity:1.2,waterAddition:10,flockLength:.5,scenarioThickness:150,mode:'target'};
export const bounds:Record<keyof Geometry,[number,number]>={pencilLength:[40,500],pencilDiameter:[3,20],tipLength:[0,40],embedDepth:[2,50],holderDiameter:[15,120],holderHeight:[8,100],clampDiameter:[2,8],bodyDiameter:[20,150],reservoirDiameter:[3.1,100],reservoirDepth:[1,100],guideLength:[3,150],pointAngle:[90,140],lidThickness:[2,25],lidOpening:[3.1,105],boltCircle:[10,130],boltDiameter:[3,6],threadDepth:[5,30],grooveWidth:[.5,8],grooveDepth:[.5,8],freeLength:[1,60],overlap:[0,3]};
export const processBounds:Record<keyof Omit<Process,'mode'>,[number,number]>={fillPercent:[0,100],duration:[.2,60],viscosity:[.05,20],surfaceTension:[20,75],density:[.9,1.5],solidsMass:[10,80],solidDensity:[1,2],waterAddition:[0,30],flockLength:[.1,3],scenarioThickness:[1,2000]};
export function validate(g:Geometry,p:Process):string[]{
 const e:string[]=[];
 for(const [k,[lo,hi]] of Object.entries(bounds))if(!Number.isFinite(g[k as keyof Geometry])||g[k as keyof Geometry]<lo||g[k as keyof Geometry]>hi)e.push(`Geometrie: ${k} muss zwischen ${lo} und ${hi} liegen.`);
 for(const [k,[lo,hi]] of Object.entries(processBounds))if(!Number.isFinite(p[k as keyof typeof processBounds])||p[k as keyof typeof processBounds]<lo||p[k as keyof typeof processBounds]>hi)e.push(`Prozess: ${k} muss zwischen ${lo} und ${hi} liegen.`);
 if(e.length)return e;
 if(![3,4,5,6].includes(g.boltDiameter))e.push('Senkschrauben: Nenngröße M3, M4, M5 oder M6 wählen.');
 if(![2,3,4,5,6,8].includes(g.clampDiameter))e.push('Klemmschraube: Nenngröße M2, M3, M4, M5, M6 oder M8 wählen.');
 if(g.reservoirDiameter<=g.pencilDiameter)e.push('Die Reservoirbohrung muss größer als der Stift sein.');
 if(g.reservoirDiameter+4>g.bodyDiameter)e.push('Zwischen Reservoir und Außenfläche sind mindestens 2 mm Wand erforderlich (Planungsgrenze).');
 if(g.lidOpening<=g.pencilDiameter)e.push('Die Deckelöffnung muss größer als der Stift sein.');
 if(g.lidOpening+4>g.bodyDiameter)e.push('Die Deckelöffnung lässt weniger als 2 mm Rand stehen.');
 if(g.lidOpening<g.reservoirDiameter)e.push('Die Deckelöffnung muss mindestens so groß wie das Reservoir sein (Modell ohne überdeckte Kammer).');
 const head=2*g.boltDiameter;
 if(g.boltCircle-head<Math.max(g.lidOpening,g.reservoirDiameter)+2)e.push('Schraubensenkung und innere Bohrung überschneiden sich oder haben weniger als 1 mm Abstand.');
 if(g.boltCircle+head>g.bodyDiameter-2)e.push('Schraubensenkung liegt zu nahe an der Außenkante.');
 if(g.threadDepth+2>bodyHeight(g))e.push('Gewindesackloch lässt weniger als 2 mm Boden stehen.');
 if(g.lidThickness<(head-(g.boltDiameter+.5))/2+.5)e.push('Der Deckel ist für die angenommene 90°-Senkung zu dünn.');
 if(g.holderDiameter<=g.pencilDiameter+6)e.push('Die Edelstahlhalterung benötigt mehr Wandstärke.');
 if(g.embedDepth+3>g.holderHeight)e.push('Die Aufnahmebohrung benötigt mindestens 3 mm Boden.');
 if(g.pencilLength<=g.embedDepth+g.lidThickness+bodyHeight(g))e.push('Die Vorrichtung reicht in der Startposition über die Stiftlänge hinaus.');
 if(g.tipLength+g.freeLength>=g.pencilLength)e.push('Spitze und freier Abschnitt lassen keine zylindrische Beschichtungsfläche übrig.');
 if(g.overlap>g.freeLength)e.push('Die zulässige Überlappung ist größer als die freie Länge.');
 if(g.grooveDepth>=g.reservoirDepth)e.push('Die Dosiernut muss flacher als die zylindrische Reservoirbohrung sein.');
 if(g.grooveWidth>=g.boltCircle-2*g.boltDiameter)e.push('Dosiernut ist für den Schraubenabstand zu breit.');
 const volumeSolids=p.solidsMass/100/p.solidDensity/(1/p.density+p.waterAddition/100);
 if(volumeSolids<=0||volumeSolids>=1)e.push('Aus Dichten und Feststoffanteil ergibt sich kein plausibler Volumenfestkörperanteil.');
 return e;
}
export const coneHeight=(g:Geometry)=>(g.reservoirDiameter-g.pencilDiameter)/2/Math.tan(g.pointAngle*Math.PI/360);
export const bodyHeight=(g:Geometry)=>g.guideLength+coneHeight(g)+g.reservoirDepth;
export const reservoirHeight=(g:Geometry)=>g.reservoirDepth+coneHeight(g);
export const reservoirArea=(g:Geometry)=>Math.PI/4*(g.reservoirDiameter**2-g.pencilDiameter**2);
export function reservoirVolume(g:Geometry,h=reservoirHeight(g)):number{
 const c=Math.min(Math.max(0,h),coneHeight(g)),r=g.pencilDiameter/2,t=Math.tan(g.pointAngle*Math.PI/360);
 return Math.PI*(r*t*c*c+t*t*c**3/3)+reservoirArea(g)*Math.max(0,Math.min(h,reservoirHeight(g))-c);
}
export function levelFromVolume(g:Geometry,v:number):number{
 if(v<=0)return 0;if(v>=reservoirVolume(g))return reservoirHeight(g);const c=coneHeight(g),vc=reservoirVolume(g,c);if(v>=vc)return c+(v-vc)/reservoirArea(g);
 let a=0,b=c;for(let i=0;i<55;i++){const m=(a+b)/2;if(reservoirVolume(g,m)<v)a=m;else b=m;}return(a+b)/2;
}
export function pencilRadius(g:Geometry,z:number):number{
 const r=g.pencilDiameter/2;return g.tipLength===0||z<=g.pencilLength-g.tipLength?r:Math.max(0,r*(g.pencilLength-z)/g.tipLength);
}
// Axial annular shell: ignores tip slope correction, explicitly a geometric coating approximation.
export function filmArea(g:Geometry,z:number,h:number):number{const r=pencilRadius(g,z);return Math.PI*((r+h)**2-r*r);}
export function minimumFilm(p:Process){
 // 1 g delivery product + waterAddition/100 g water; volume additivity, rho_water=1 g/cm³.
 const volumeSolids=(p.solidsMass/100/p.solidDensity)/(1/p.density+p.waterAddition/100);
 const dry=p.flockLength*100; // mm -> µm / 10
 return{volumeSolids,dry,wet:dry/volumeSolids};
}
export function simulate(g:Geometry,p:Process,steps=1200):Simulation{
 const errors=validate(g,p);if(errors.length)throw new Error(errors.join(' '));
 const target=minimumFilm(p),capacity=reservoirVolume(g),H=reservoirHeight(g);
 const initialLevel=H*p.fillPercent/100,initialVolume=reservoirVolume(g,initialLevel);
 const floor=g.embedDepth+g.lidThickness+H;
 const start=floor-initialLevel;
 // Upper tool edge must pass the tip. Lower guide clears earlier.
 const stroke=g.pencilLength-g.embedDepth+2,speed=stroke/p.duration;
 const ca=p.viscosity*(speed/1000)/(p.surfaceTension/1000);
 const lc=Math.sqrt((p.surfaceTension/1000)/(p.density*1000*9.81));
 const lld=.94*lc*Math.pow(ca,2/3)*1e6;
 const modelValid=ca<=.01 && (g.reservoirDiameter-g.pencilDiameter)/2>=5*lc*1000 && g.pencilDiameter/2>=5*lc*1000;
 const wet=p.mode==='target'?target.wet:p.mode==='manual'?p.scenarioThickness:lld;
 const warnings:string[]=[];
 if(p.mode!=='lld')warnings.push('Planungsszenario: Die Nassfilmdicke ist vorgegeben, nicht aus Viskosität und Meniskus vorhergesagt.');
 else if(!modelValid)warnings.push('LLD außerhalb der konservativen Prüfgrenzen: keine Schichtdickenprognose und keine Auftragsanimation verfügbar.');
 if(g.lidOpening<g.pencilDiameter+2*wet/1000)warnings.push('Die angenommene Filmschicht passt nicht berührungsfrei durch den Deckel.');
 if(start>g.freeLength+.05)warnings.push(`Beschichtungsbeginn ${start.toFixed(2)} mm: unbeflockter Spalt unter der Radiergummikappe.`);
 if(start<g.freeLength-g.overlap-.05)warnings.push('Die berechnete Startbenetzung überschreitet die zulässige Überlappung unter die Kappe.');
 if(p.waterAddition>5)warnings.push('Wasserzugabe über 5 %: oberhalb der Verdünnungsangabe im Datenblatt. Die Viskosität wird unabhängig eingestellt.');
 warnings.push('Kein Wandfilmverlust, keine Holzaufnahme, kein Ablaufen und keine lokale Benetzungsstörung; Spitze nur als geometrischer Kegel angenähert.');
 const frames:Frame[]=[{time:0,travel:0,remaining:initialVolume,deposited:0,level:initialLevel,front:start,wallLoss:0}];
 const profile:{z:number;wet:number}[]=[];
 let V=initialVolume,dep=0,front=start;
 const allow=p.mode!=='lld'||modelValid;
 for(let i=1;i<=steps;i++){
   const x=stroke*i/steps,old=frames[i-1];
   if(V>1e-12&&allow&&front<g.pencilLength){
     // Mass-conserving implicit front position: x + floor - level(V).
     // Event solution avoids stepwise over-consumption when the front crosses many cells.
     const integral=(a:number,b:number)=>{
       const b0=Math.max(a,Math.min(b,g.pencilLength-g.tipLength)),h=wet/1000;
       let value=(b0-a)*Math.PI*(g.pencilDiameter*h+h*h);
       const a1=Math.max(a,g.pencilLength-g.tipLength),b1=Math.min(b,g.pencilLength);
       if(b1>a1){const ra=pencilRadius(g,a1),rb=pencilRadius(g,b1);value+=Math.PI*(h*(ra+rb)+h*h)*(b1-a1);}
       return Math.max(0,value);
     };
     const reach=(v:number)=>Math.min(g.pencilLength,x+floor-levelFromVolume(g,v));
     const f=(v:number)=>v+integral(front,Math.max(front,reach(v)))-V;
     let nextV:number;
     if(f(0)>=0){nextV=0;let lo=front,hi=g.pencilLength;for(let j=0;j<50;j++){const m=(lo+hi)/2;if(integral(front,m)<V)lo=m;else hi=m;}const end=(lo+hi)/2;profile.push({z:front,wet},{z:end,wet},{z:end+1e-6,wet:0});front=end;}
     else {let lo=0,hi=V;for(let j=0;j<45;j++){const m=(lo+hi)/2;if(f(m)>0)hi=m;else lo=m;}nextV=(lo+hi)/2;const end=Math.max(front,reach(nextV));if(end>front+1e-10)profile.push({z:front,wet},{z:end,wet});front=end;}
     dep+=V-nextV;V=nextV;
   }
   frames.push({time:p.duration*i/steps,travel:x,remaining:V,deposited:dep,level:levelFromVolume(g,V),front,wallLoss:0});
   if(old.remaining===0&&V!==0)throw new Error('Numerische Volumenbilanz verletzt.');
 }
 if(!allow)warnings.push('Für Geometrie- und Mengenplanung bitte ein Ziel- oder manuelles Filmszenario wählen.');
 if(V<1e-10&&front<g.pencilLength-.01&&initialVolume>0)warnings.push('Reservoir vor vollständigem Auftrag leer: Restabschnitt bleibt im Szenario unbeschichtet.');
 if(initialVolume===0)warnings.push('Leeres Reservoir: kein Auftrag.');
 return{frames,profile,capacity,initialVolume,start,speed,stroke,wet,dry:wet*target.volumeSolids,volumeSolids:target.volumeSolids,targetWet:target.wet,targetDry:target.dry,consumed:dep,finalVolume:V,balanceError:initialVolume-dep-V,end:front,ca,warnings,modelValid};
}
export const format=(x:number)=>Number.isFinite(x)?new Intl.NumberFormat('de-DE',Math.abs(x)>=1?{minimumFractionDigits:1,maximumFractionDigits:1}:{maximumSignificantDigits:4}).format(x):'–';
