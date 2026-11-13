export interface Stage { volume: number; initialConcentration: number }
export interface Parameters {
  dragVolume: number;
  sourceConcentration: number;
  limit: number;
  steps: number;
  stages: Stage[];
}
export interface Intervention { stage: number; step: number; value: number; comment: string }
export interface Scenario { id: string; name: string; parameters: Parameters; interventions: Intervention[] }
