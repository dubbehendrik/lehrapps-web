import { describe,it,expect } from 'vitest';
import { areaGT, recommendedSpacing, homography, mapPoint, validCorners, rectify, segment, summarizeMask, paintMask } from '../src/apps/gitterschnitt/logic';
import { encodeProject,decodeProject } from '../src/apps/gitterschnitt/project';
import type { Project,Shot } from '../src/apps/gitterschnitt/types';
const square=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
describe('Gitterschnitt fachliche Grenzen',()=>{
 it('ordnet ungerundete Prozentgrenzen zu',()=>{expect([0,.01,5,5.01,15,15.01,35,35.01,65,65.01,100].map(areaGT)).toEqual([0,1,1,2,2,3,3,4,4,5,5]);expect(()=>areaGT(NaN)).toThrow()});
 it('wählt Abstände nach Dicke und Substrat',()=>{expect(recommendedSpacing(60,'hard')).toBe(1);expect(recommendedSpacing(60,'soft')).toBe(2);expect(recommendedSpacing(60.1,'hard')).toBe(2);expect(recommendedSpacing(120,'hard')).toBe(2);expect(recommendedSpacing(121,'hard')).toBe(3);expect(recommendedSpacing(251,'hard')).toBeUndefined()});
 it('verwendet feste Fläche und weist unklare Bereiche aus',()=>{expect(summarizeMask([0,1,2,3])).toEqual({percent:25,upper:50,unknown:25,kerf:25})});
});
describe('Projektive Entzerrung',()=>{
 it('trifft alle Ecken eines Trapezes',()=>{const p=[{x:.1,y:.2},{x:.9,y:.1},{x:.8,y:.9},{x:.2,y:.8}],m=homography(p);for(const [i,[u,v]] of [[0,0],[1,0],[1,1],[0,1]].entries()){const q=mapPoint(m,u,v);expect(q.x).toBeCloseTo(p[i].x,10);expect(q.y).toBeCloseTo(p[i].y,10)}});
 it('weist gekreuzte oder kollineare Grenzen zurück',()=>{expect(validCorners([square[0],square[2],square[1],square[3]])).toBe(false);expect(()=>homography([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}])).toThrow()});
 it('bewahrt ein unverzerrtes Testbild',()=>{const p=new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]);expect(Array.from(rectify(p,2,2,square,2))).toEqual(Array.from(p))});
});
describe('Segmentierung und Sonderfälle',()=>{
 const pixels=(colors:number[][])=>new Uint8ClampedArray(colors.flatMap(c=>[...c,255]));
 it('vermeidet GT0 bei vollständig freigelegtem Gitter',()=>{const p=pixels(Array.from({length:25},()=>[150,150,150]));const mask=segment(p,[[255,255,255]],[[150,150,150]],20,0,5);expect(summarizeMask(mask).percent).toBeGreaterThan(0);expect(mask[6]).toBe(1)});
 it('erkennt intakten farbigen Lack und freigelegtes Metall',()=>{const p=pixels(Array.from({length:25},(_,i)=>i===12?[150,150,150]:[0,80,160]));const m=segment(p,[[0,80,160]],[[150,150,150]],20,0,5);expect(m[12]).toBe(1);expect(m[6]).toBe(0)});
 it('markiert farblich identische Referenzen als unklar',()=>{const p=pixels(Array.from({length:25},()=>[100,100,100]));expect(segment(p,[[100,100,100]],[[100,100,100]],20,0,5)[12]).toBe(2)});
 it('korrigiert Masken ohne Eingabe zu verändern',()=>{const m=Array(25).fill(0);const next=paintMask(m,2,2,1,1,5);expect(m[12]).toBe(0);expect(next.filter(v=>v===1)).toHaveLength(5)});
});
describe('ZIP-Projekt',()=>{
 const shot:Shot={id:'s1',name:'Test',component:'B1',position:'P1',dataUrl:'data:image/png;base64,AQID',width:2,height:2,corners:square,spacing:1,thickness:50,substrate:'hard',tool:'Hand',removal:'Bürsten',notes:'',coat:[[255,0,0]],bare:[],tolerance:20,kerf:1,comment:'',revealed:true,synthetic:false,blind:3,final:2,mask:Array(250000).fill(1)};
 it('erhält Masken, Zuordnungen und beide GT-Werte',()=>{const p:Project={format:'gitterschnitt',version:1,name:'Test',shots:[shot]};expect(decodeProject(encodeProject(p))).toEqual(p)});
 it('weist ungültige Masken und aufgedeckte unbewertete Bilder zurück',()=>{const p:Project={format:'gitterschnitt',version:1,name:'Test',shots:[{...shot,mask:[8]}]};expect(()=>decodeProject(encodeProject(p))).toThrow();expect(()=>decodeProject(encodeProject({...p,shots:[{...shot,blind:undefined}]}))).toThrow()});
});
