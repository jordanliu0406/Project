export type ModelType = 'mealy' | 'moore';
export type FlipFlopType = 'jk' | 't';
export type OutputTab = 'outputs' | 'schematic';

export interface StateRow {
  id: string;
  presentState: string;
  input: string;
  nextState: string;
  output: string;
}

export interface KMapCell {
  value: string;
  highlighted: boolean;
}

export interface KMap {
  label: string;
  rows: string[];
  cols: string[];
  cells: KMapCell[][];
  equation: string;
}

export interface DesignState {
  modelType: ModelType;
  flipFlopType: FlipFlopType;
  inputVars: string;
  outputVars: string;
  stateTable: StateRow[];
}
