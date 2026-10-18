import type {Result,Frame} from './types';
import {magnitude} from './logic';
export const forceKeys=['electric','drag','gravity','total'] as const;
/** Temporal scale is fixed for the complete result, unaffected by checkbox selection. */
export function forceScales(result:Result|null,individual:boolean,zoom:number,reference?:Frame){
 const peaks={electric:1e-20,drag:1e-20,gravity:1e-20,total:1e-20};
 for(const f of reference?[reference]:(result?.frames??[]))for(const key of forceKeys)peaks[key]=Math.max(peaks[key],magnitude(f[key]));
 const common=Math.max(...Object.values(peaks));return Object.fromEntries(forceKeys.map(key=>[key,150*zoom/(individual?peaks[key]:common)])) as Record<typeof forceKeys[number],number>;
}
