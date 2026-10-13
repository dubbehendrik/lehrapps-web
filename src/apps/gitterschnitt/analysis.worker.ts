import { rectify, segment } from './logic';
self.onmessage=e=>{try{const {pixels,width,height,shot}=e.data;const rect=rectify(pixels,width,height,shot.corners);const mask=segment(rect,shot.coat,shot.bare,shot.tolerance,shot.kerf);self.postMessage({mask:Array.from(mask)});}catch(error){self.postMessage({error:String(error)})}};
