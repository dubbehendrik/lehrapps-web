export type Point = { x: number; y: number };
export type RGB = [number, number, number];
export type GT = 0 | 1 | 2 | 3 | 4 | 5;
export interface Shot {
 id: string; name: string; component: string; position: string; dataUrl: string;
 width: number; height: number; corners: Point[]; spacing: number;
 thickness: number; substrate: 'hard' | 'soft'; tool: string; removal: string; notes: string;
 coat: RGB[]; bare: RGB[]; coatPoints?: (Point | null)[]; barePoints?: (Point | null)[];
 savedResult?: { component: string; position: string; name: string; blind: GT; proposal: GT; final: GT; percent: number; comment: string }; dirty?: boolean; tolerance: number; kerf: number;
 baseMask?: number[]; mask?: number[]; blind?: GT; final?: GT; comment: string; revealed: boolean;
 synthetic: boolean;
}
export interface Project { format: 'gitterschnitt'; version: 1; name: string; shots: Shot[] }
