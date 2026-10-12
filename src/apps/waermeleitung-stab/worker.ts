import { simulate } from './logic';
import type { Parameters } from './types';
self.onmessage=(e:MessageEvent<Parameters>)=>{
  try {self.postMessage({result:simulate(e.data)});}
  catch(error){self.postMessage({error:error instanceof Error?error.message:'Berechnung fehlgeschlagen.'});}
};
