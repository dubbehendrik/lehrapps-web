export interface Parameters {
 temperature:number; ambient:number; fresh:number; start:number; massFlow:number; areaFlow:number; cpPart:number;
 partLength:number; partWidth:number; partHeight:number; energyPrice:number; waterPrice:number; eta:number;
 shiftHours:number; days:number; latentMode:'constant'|'temperature'; heatMode:'simple'|'losses'; heater:number;
 dipLength:number; dipWidth:number; dipHeight:number; dipAlpha:number; dipEmission:number; dipDrag:number;
 speed:number; dwell:number; distance:number; nozzleSpacing:number; ringSpacing:number; nozzleFlow:number;
 pressure:number; pressureLoss:number; head:number; pumpEta:number; volumeFactor:number; sprayHeight:number;
 manualVolume:boolean; sprayVolume:number; sprayAlpha:number; sprayEmission:number; sprayDrag:number; extraCooling:number;
}
export const DEFAULTS:Parameters={temperature:50,ambient:22,fresh:15,start:22,massFlow:3000,areaFlow:300,cpPart:465,partLength:1,partWidth:.3,partHeight:.8,energyPrice:.1,waterPrice:4.6,eta:.8,shiftHours:8,days:5,latentMode:'constant',heatMode:'simple',heater:200,dipLength:5,dipWidth:4,dipHeight:2.5,dipAlpha:100,dipEmission:.7,dipDrag:.05,speed:2,dwell:3,distance:.1,nozzleSpacing:.3,ringSpacing:.3,nozzleFlow:13.5,pressure:1.5,pressureLoss:.3,head:2,pumpEta:.8,volumeFactor:1.5,sprayHeight:.9,manualVolume:false,sprayVolume:4.05,sprayAlpha:100,sprayEmission:.7,sprayDrag:.05,extraCooling:.5};
export const labels=['Werkstücke','Frischwasser','Verdunstung','Konvektion','Strahlung','Wärmeverlust beim Versprühen','Pumpe'];
export function evaporation(temperature:number,area:number){return 2e-5*temperature**3.07*area;} // kg/h; numerical temperature in °C
export function latentHeat(p:Parameters,t=p.temperature){return p.latentMode==='constant'?2256:2500.9-2.36*t;} // kJ/kg, approximate 0–100 °C
export function validate(p:Parameters){
 for(const [k,v] of Object.entries(p)) if(typeof v==='number'&&!Number.isFinite(v)) throw Error(`Bitte alle Zahlenfelder vollständig ausfüllen (${k}).`);
 const positive=['eta','pumpEta','dipLength','dipWidth','dipHeight','speed','dwell','nozzleSpacing','ringSpacing','nozzleFlow','volumeFactor','sprayHeight','sprayVolume','shiftHours','days','partLength','partWidth','partHeight','cpPart','heater'];
 for(const k of positive) if((p[k as keyof Parameters] as number)<=0) throw Error('Abmessungen, Zeiten, Wirkungsgrade und Heizleistung müssen größer als null sein.');
 for(const [k,v] of Object.entries(p)) if(typeof v==='number'&&!['temperature','ambient','fresh','start'].includes(k)&&v<0) throw Error('Durchsätze, Verlustparameter und Preise dürfen nicht negativ sein.');
 if(p.eta>1||p.pumpEta>1||p.dipEmission>1||p.sprayEmission>1) throw Error('Wirkungs- und Emissionsgrade müssen zwischen 0 und 1 liegen.');
 if([p.temperature,p.start,p.fresh].some(t=>t<0||t>95)||p.ambient<0||p.ambient>95) throw Error('Dieses Wassermodell gilt für Temperaturen von 0 bis 95 °C.');
 if(p.temperature<Math.max(p.ambient,p.fresh,p.start)) throw Error('Die Badtemperatur muss mindestens so hoch wie Umgebung, Frischwasser und Starttemperatur sein.');
 if(!Number.isInteger(p.days)||p.days>7||p.shiftHours*3>24) throw Error('Arbeitstage: ganze Zahl von 1 bis 7; Schichtdauer: höchstens 8 h.');
 if(p.heater>1e6||p.dipLength*p.dipWidth*p.dipHeight>1e6) throw Error('Bitte realistische Anlagenabmessungen und Heizleistung wählen.');
}
export function calculate(p:Parameters,kind:'dip'|'spray'){
 validate(p);
 const spray=kind==='spray', ringWidth=p.partWidth+2*p.distance,ringHeight=p.partHeight+2*p.distance;
 const nozzlesPerRing=Math.ceil(2*(ringWidth+ringHeight)/p.nozzleSpacing-1e-10), activeLength=p.speed*p.dwell;
 const rings=Math.max(1,Math.ceil(activeLength/p.ringSpacing-1e-10)),nozzles=rings*nozzlesPerRing, circulation=nozzles*p.nozzleFlow;
 if(nozzles>1e7) throw Error('Die Düsenanzahl ist außerhalb des sinnvollen Auslegungsbereichs.');
 const volume=spray?(p.manualVolume?p.sprayVolume:circulation*p.volumeFactor/1000):p.dipLength*p.dipWidth*p.dipHeight;
 const area=spray?volume/p.sprayHeight:p.dipLength*p.dipWidth;
 const alpha=spray?p.sprayAlpha:p.dipAlpha,emission=spray?p.sprayEmission:p.dipEmission,drag=p.areaFlow*(spray?p.sprayDrag:p.dipDrag),evap=evaporation(p.temperature,area),fresh=drag+evap;
 const convection=(t:number)=>alpha*area*(t-p.ambient)/1000;
 const radiation=(t:number)=>emission*5.67e-8*area*((t+273.15)**4-(p.ambient+273.15)**4)/1000;
 const waterHeat=(t:number,waterDrag:number)=>((evaporation(t,area)+waterDrag)/3600*4.2*(t-p.fresh)+evaporation(t,area)/3600*latentHeat(p,t));
 const pump=spray?circulation/60000*((p.pressure+p.pressureLoss)*1e5+1000*9.81*p.head)/p.pumpEta/1000:0;
 const thermal=[p.massFlow/3600*p.cpPart*(p.temperature-p.ambient)/1000,fresh/3600*4.2*(p.temperature-p.fresh),evap/3600*latentHeat(p),convection(p.temperature),radiation(p.temperature),spray?circulation/60000*1000*4.2*p.extraCooling:0];
 const powers=[...thermal.map(x=>x/p.eta),pump],power=powers.reduce((a,b)=>a+b,0);
 let startup=volume*1000*4.2*(p.temperature-p.start)/3600/p.eta,heatTime:number|null=null,heatWater=0,heatError='';
 if(p.heatMode==='losses'&&p.temperature>p.start){
  const loss=(t:number)=>convection(t)+radiation(t)+waterHeat(t,0);
  if(p.heater*p.eta<=loss(p.temperature)){heatError='Die Heizleistung reicht nicht aus, um die Zieltemperatur zu erreichen.';startup=NaN;}
  else {
   let seconds=0,water=0; const steps=600,dt=(p.temperature-p.start)/steps;
   for(let i=0;i<steps;i++){const t=p.start+(i+.5)*dt;const ds=volume*1000*4.2*dt/(p.heater*p.eta-loss(t));seconds+=ds;water+=evaporation(t,area)*ds/3600;}
   heatTime=seconds/3600;startup=p.heater*heatTime;heatWater=water/1000;
  }
 }
 const warnings:string[]=[];
 if(!spray&&(p.partLength>p.dipLength||p.partWidth>p.dipWidth||p.partHeight>p.dipHeight))warnings.push('Das Werkstück passt in der angegebenen Orientierung nicht vollständig in das Tauchbad.');
 if(spray&&area<activeLength*(p.partWidth+4*p.distance))warnings.push('Die berechnete Beckenfläche ist kleiner als die Grundfläche der aktiven Spritzzone. Beckenform und Rücklauf müssen konstruktiv geprüft werden.');
 if(spray&&p.extraCooling>0)warnings.push('Wärmeverlust beim Versprühen ist ein eigenständiger Verlust: bereits erfasste Verdunstung und Werkstückerwärmung dürfen darin nicht nochmals enthalten sein.');
 return {kind,volume,area,drag,evap,fresh,powers,thermal,power,pump,startup,heatTime,heatWater,heatError,warnings,activeLength,zoneLength:activeLength+Math.max(1,p.partHeight+p.partLength),ringWidth,ringHeight,rings,nozzlesPerRing,nozzles,circulation};
}
export type Result=ReturnType<typeof calculate>;
export function weekly(p:Parameters,r:Result,shifts:1|3){const hours=p.days*p.shiftHours*shifts,starts=shifts===1?p.days:1,energy=r.power*hours+r.startup*starts,water=r.fresh*hours/1000+r.heatWater*starts;return {hours,starts,energy,water,cost:energy*p.energyPrice+water*p.waterPrice,production:p.areaFlow*hours,specificEnergy:p.areaFlow>0?energy/(p.areaFlow*hours):null,specificWater:p.areaFlow>0?water/(p.areaFlow*hours):null};}
export function format(value:number){if(!Number.isFinite(value))return '—'; if(value!==0&&Math.abs(value)<.1){const [a,b]=value.toExponential(1).split('e');return `${a.replace('.',',')} · 10${b.startsWith('-')?'⁻':''}${b.replace(/[+-]/,'').split('').map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]).join('')}`;}return value.toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});}
