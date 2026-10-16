export interface Geometry {
  pencilLength:number; pencilDiameter:number; tipLength:number;
  embedDepth:number; holderDiameter:number; holderHeight:number; clampDiameter:number;
  bodyDiameter:number; reservoirDiameter:number; reservoirDepth:number;
  guideLength:number; pointAngle:number; lidThickness:number; lidOpening:number;
  boltCircle:number; boltDiameter:number; threadDepth:number; grooveWidth:number; grooveDepth:number;
  freeLength:number; overlap:number;
}
export interface Process {
  fillPercent:number; duration:number; viscosity:number; surfaceTension:number;
  density:number; solidsMass:number; solidDensity:number; waterAddition:number;
  flockLength:number; scenarioThickness:number; mode:'target'|'manual'|'lld';
}
export interface Frame {time:number; travel:number; remaining:number; deposited:number; level:number; front:number; wallLoss:number}
export interface Simulation {frames:Frame[]; profile:{z:number;wet:number}[]; capacity:number; initialVolume:number; start:number; speed:number; stroke:number; wet:number; dry:number; volumeSolids:number; targetWet:number; targetDry:number; consumed:number; finalVolume:number; balanceError:number; end:number; ca:number; warnings:string[]; modelValid:boolean}
