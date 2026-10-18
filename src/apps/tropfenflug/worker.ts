import {simulate} from './logic';
import type {Request} from './types';
self.onmessage=(event:MessageEvent<Request>)=>{try{self.postMessage({result:simulate(event.data)});}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}};
