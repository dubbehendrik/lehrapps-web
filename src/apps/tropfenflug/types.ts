import type {ElectricSolution} from './electrostatics';
export type Point = {x:number;y:number};
export type Vec = Point;
export type Charging = 'contact'|'external'|'off';
export interface Parameters {
 charging:Charging; voltage:number; diameter:number; density:number; surfaceTension:number;
 chargeMode:'fraction'|'manual'; chargePercent:number; chargePc:number;
 bellDiameter:number; rpm:number; speedFactor:number; axialSpeed:number; releaseSide:'top'|'bottom';
 airSpeed:number; gravityAngle:number; gravity:boolean; maxTime:number;
 chargeLength:number; initialChargePercent:number; electrodeX:number; electrodeY:number; tipRadius:number; cornerRadius:number;
}
export const defaults:Parameters={charging:'contact',voltage:-80,diameter:30,density:1030,surfaceTension:30,
 chargeMode:'fraction',chargePercent:5,chargePc:-.04,bellDiameter:55,rpm:60000,speedFactor:100,
 axialSpeed:1,releaseSide:'top',airSpeed:10,gravityAngle:-90,gravity:true,maxTime:.15,
 chargeLength:50,initialChargePercent:0,electrodeX:-40,electrodeY:80,tipRadius:.2,cornerRadius:8};
export interface Grid {
 nx:number;ny:number;x0:number;y0:number;h:number; solid:Uint8Array; potential:Float64Array;
 ex:Float64Array;ey:Float64Array;ux:Float64Array;uy:Float64Array;
 electric?:ElectricSolution; electricResidual:number;airResidual:number;electricIterations:number;airIterations:number;
}
export interface Frame {t:number;charge:number;chargePath:number;position:Vec;velocity:Vec;electric:Vec;drag:Vec;gravity:Vec;total:Vec;field:Vec;air:Vec}
export type EndReason='workpiece'|'atomizer'|'electrode'|'escaped'|'timeout';
export interface Result {grid:Grid;frames:Frame[];reason:EndReason;charge:number;mass:number;rayleigh:number;geometry:Point[];parameters:Parameters;polygon:Point[];resolution:number;exitBoundary?:'xMin'|'xMax'|'yMin'|'yMax'}
export interface Request {parameters:Parameters;polygon:Point[];resolution?:number}
