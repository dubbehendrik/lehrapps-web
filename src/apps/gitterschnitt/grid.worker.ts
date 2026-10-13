import { detectGrid } from './grid';
self.onmessage=e=>{try{self.postMessage(detectGrid(e.data.pixels,e.data.width,e.data.height));}catch{self.postMessage({status:'not-found'});}};
