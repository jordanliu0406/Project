import { StateRow, KMap, ModelType, FlipFlopType } from '../types';
import {
  parseInputVarNames,
  parseInputCode,
  encodeMinterm,
  buildKMapFromValueMap,
  fillDontCareMap,
  excitationLabel,
} from './kmapEngine';
import { collectStateOrder, stateEncodingBits } from './stateTableUtils';
import { normalizeStateTableInputs } from './inputNormalization';

/* ─────────────────────────────────────────────────────────────────────────────
   Example state tables
──────────────────────────────────────────────────────────────────────────────*/
const EXAMPLE_MEALY_JK: StateRow[] = [
  { id: '1', presentState: 'S0', input: '0', nextState: 'S0', output: '0' },
  { id: '2', presentState: 'S0', input: '1', nextState: 'S1', output: '0' },
  { id: '3', presentState: 'S1', input: '0', nextState: 'S2', output: '0' },
  { id: '4', presentState: 'S1', input: '1', nextState: 'S0', output: '1' },
  { id: '5', presentState: 'S2', input: '0', nextState: 'S0', output: '0' },
  { id: '6', presentState: 'S2', input: '1', nextState: 'S2', output: '1' },
  { id: '7', presentState: 'S3', input: '0', nextState: 'S1', output: '1' },
  { id: '8', presentState: 'S3', input: '1', nextState: 'S3', output: '0' },
];

const EXAMPLE_MOORE_T: StateRow[] = [
  { id: '1', presentState: 'A', input: '0', nextState: 'A', output: '0' },
  { id: '2', presentState: 'A', input: '1', nextState: 'B', output: '0' },
  { id: '3', presentState: 'B', input: '0', nextState: 'C', output: '0' },
  { id: '4', presentState: 'B', input: '1', nextState: 'A', output: '1' },
  { id: '5', presentState: 'C', input: '0', nextState: 'A', output: '1' },
  { id: '6', presentState: 'C', input: '1', nextState: 'C', output: '1' },
];

const EXAMPLE_MEALY_T: StateRow[] = [
  { id: '1', presentState: 'A', input: '0', nextState: 'A', output: '0' },
  { id: '2', presentState: 'A', input: '1', nextState: 'B', output: '1' },
  { id: '3', presentState: 'B', input: '0', nextState: 'A', output: '1' },
  { id: '4', presentState: 'B', input: '1', nextState: 'B', output: '0' },
];

const EXAMPLE_MOORE_JK: StateRow[] = EXAMPLE_MOORE_T;

export function getExampleData(
  modelType: ModelType,
  flipFlopType: FlipFlopType
): StateRow[] {
  if (modelType === 'moore') {
    return flipFlopType === 't' ? EXAMPLE_MOORE_T : EXAMPLE_MOORE_JK;
  }
  return flipFlopType === 't' ? EXAMPLE_MEALY_T : EXAMPLE_MEALY_JK;
}

function jkExcitation(current: number, next: number): { j: string; k: string } {
  if (current === 0 && next === 0) return { j: '0', k: 'X' };
  if (current === 0 && next === 1) return { j: '1', k: 'X' };
  if (current === 1 && next === 0) return { j: 'X', k: '1' };
  return { j: 'X', k: '0' };
}

function tExcitation(current: number, next: number): string {
  return current === next ? '0' : '1';
}

function buildKMapEntry(label: string, valueMap: Map<number, string>, numFF: number, inputNames: string[]): KMap {
  const filled = fillDontCareMap(valueMap, numFF, inputNames.length);
  const { rows, cols, cells, equation } = buildKMapFromValueMap(filled, numFF, inputNames);
  return { label, rows, cols, cells, equation };
}

export function generateKMaps(
  flipFlopType: FlipFlopType,
  stateTable: StateRow[],
  modelType: ModelType = 'mealy',
  inputVars = 'X'
): KMap[] {
  const normalizedTable = normalizeStateTableInputs(stateTable, inputVars);
  const rows = normalizedTable.filter(
    (row) => row.presentState.trim() && row.nextState.trim() && row.input.trim() !== ''
  );

  if (rows.length === 0) return [];

  const inputNames = parseInputVarNames(inputVars);
  const numInputBits = inputNames.length;

  const stateOrder = collectStateOrder(rows);
  const numFF = stateEncodingBits(stateOrder.length);

  const stateCode = new Map<string, number>();
  stateOrder.forEach((state, index) => stateCode.set(state, index));

  const mooreOutputs =
    modelType === 'moore'
      ? new Map(rows.map((row) => [row.presentState.trim(), row.output.trim()]))
      : null;

  const excitationMaps = new Map<string, Map<number, string>>();
  const zMap = new Map<number, string>();

  const ensureMap = (label: string) => {
    if (!excitationMaps.has(label)) excitationMaps.set(label, new Map());
    return excitationMaps.get(label)!;
  };

  for (const row of rows) {
    const presentCode = stateCode.get(row.presentState.trim());
    const nextCode = stateCode.get(row.nextState.trim());
    if (presentCode === undefined || nextCode === undefined) continue;

    const inputCode = parseInputCode(row.input, numInputBits);
    if (inputCode === null) continue;

    const minterm = encodeMinterm(presentCode, inputCode, numInputBits);

    for (let bit = 0; bit < numFF; bit += 1) {
      const currentBit = (presentCode >> bit) & 1;
      const nextBit = (nextCode >> bit) & 1;

      if (flipFlopType === 'jk') {
        const { j, k } = jkExcitation(currentBit, nextBit);
        ensureMap(excitationLabel('J', bit)).set(minterm, j);
        ensureMap(excitationLabel('K', bit)).set(minterm, k);
      } else {
        ensureMap(excitationLabel('T', bit)).set(minterm, tExcitation(currentBit, nextBit));
      }
    }

    const outputValue =
      modelType === 'moore'
        ? mooreOutputs?.get(row.presentState.trim()) ?? '0'
        : row.output.trim();
    zMap.set(minterm, outputValue === '1' ? '1' : '0');
  }

  const kmaps: KMap[] = [];

  for (let bit = numFF - 1; bit >= 0; bit -= 1) {
    if (flipFlopType === 'jk') {
      const jLabel = excitationLabel('J', bit);
      const kLabel = excitationLabel('K', bit);
      if (excitationMaps.has(jLabel)) {
        kmaps.push(buildKMapEntry(jLabel, excitationMaps.get(jLabel)!, numFF, inputNames));
      }
      if (excitationMaps.has(kLabel)) {
        kmaps.push(buildKMapEntry(kLabel, excitationMaps.get(kLabel)!, numFF, inputNames));
      }
    } else {
      const tLabel = excitationLabel('T', bit);
      if (excitationMaps.has(tLabel)) {
        kmaps.push(buildKMapEntry(tLabel, excitationMaps.get(tLabel)!, numFF, inputNames));
      }
    }
  }

  kmaps.push(buildKMapEntry('Z (Output)', zMap, numFF, inputNames));

  return kmaps;
}

/** @deprecated Use generateKMaps with example state table data instead. */
export function generateMockKMaps(flipFlopType: FlipFlopType): KMap[] {
  const table = flipFlopType === 'jk' ? EXAMPLE_MEALY_JK : EXAMPLE_MOORE_T;
  return generateKMaps(flipFlopType, table, flipFlopType === 'jk' ? 'mealy' : 'moore');
}
