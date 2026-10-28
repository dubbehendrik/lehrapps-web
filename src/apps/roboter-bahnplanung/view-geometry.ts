import type { Point, Result } from './model';
/** Same selected cut as the numerical section: u varies at fixed v, or vice versa. */
export function sectionEndpoints(r: Result, axis: 'u' | 'v', position: number): [Point, Point] {
  const fixed=Math.max(0,Math.min(axis==='u'?r.config.sheetHeight:r.config.sheetWidth,position));
  return axis==='u' ? [{u:0,v:fixed},{u:r.config.sheetWidth,v:fixed}] : [{u:fixed,v:0},{u:fixed,v:r.config.sheetHeight}];
}

/** Direct manipulation: dragging right/down reverses the old camera rotations. */
export function rotationFromDrag(yaw: number, pitch: number, dx: number, dy: number) {
  return {yaw:Math.max(-180,Math.min(180,yaw-dx*.4)),pitch:Math.max(20,Math.min(85,pitch-dy*.3))};
}
