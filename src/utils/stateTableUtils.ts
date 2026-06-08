import { StateRow } from '../types';
import { parseInputVarNames, formatBinary } from './kmapEngine';
import {
  normalizeStateTableInputs,
  parseInputCodeLoose,
  formatCanonicalInput,
} from './inputNormalization';

/** Unique states in first-seen order (present state rows, then next-state discoveries). */
export function collectStateOrder(rows: StateRow[]): string[] {
  const stateOrder: string[] = [];
  // First pass: Collect all unique present states in their order of appearance
  for (const row of rows) {
    const present = row.presentState.trim();
    if (present && !stateOrder.includes(present)) {
      stateOrder.push(present);
    }
  }
  // Second pass: Collect any next states that haven't been defined as present states yet
  for (const row of rows) {
    const next = row.nextState.trim();
    if (next && !stateOrder.includes(next)) {
      stateOrder.push(next);
    }
  }
  return stateOrder;
}

/** Number of flip-flop bits required to encode `numStates` symbolic states. */
export function stateEncodingBits(numStates: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(numStates, 1))));
}

export interface StateEncoding {
  state: string;
  /** Unsigned binary code (MSB-first), e.g. "01". */
  code: string;
  codeNum: number;
}

/** Binary state assignment used by K-map generation (sequential index order). */
export function computeStateEncodings(rows: StateRow[]): StateEncoding[] {
  const order = collectStateOrder(rows);
  const bits = stateEncodingBits(order.length);
  return order.map((state, index) => ({
    state,
    code: formatBinary(index, bits),
    codeNum: index,
  }));
}

/** All input minterms 0 … 2^n−1 for n input variables. */
export function expectedInputCodes(numInputBits: number): number[] {
  const count = 1 << numInputBits;
  return Array.from({ length: count }, (_, index) => index);
}

export function formatInputLabel(code: number, numInputBits: number): string {
  return formatCanonicalInput(code, numInputBits);
}

export interface StateInputCoverage {
  state: string;
  /** Parsed input codes already defined for this present state. */
  defined: number[];
  /** Expected codes with no transition row. */
  missing: number[];
  /** Human-readable missing labels, e.g. ["01", "11"]. */
  missingLabels: string[];
}

/**
 * For each symbolic state, compare defined input rows against the full
 * 2^n input space implied by the input variable list.
 */
export function analyzeInputCoverage(
  rows: StateRow[],
  inputVars: string
): StateInputCoverage[] {
  const inputNames = parseInputVarNames(inputVars);
  const numInputBits = inputNames.length;
  const expected = expectedInputCodes(numInputBits);
  const stateOrder = collectStateOrder(rows);

  return stateOrder.map((state) => {
    // Loose parse so shorthand like `0` counts as `00` before the user normalizes.
    const defined = rows
      .filter((row) => row.presentState.trim() === state && row.input.trim() !== '')
      .map((row) => parseInputCodeLoose(row.input, numInputBits))
      .filter((value): value is number => value !== null);

    const definedSet = new Set(defined);
    const missing = expected.filter((code) => !definedSet.has(code));

    return {
      state,
      defined: [...definedSet].sort((a, b) => a - b),
      missing,
      missingLabels: missing.map((code) => formatInputLabel(code, numInputBits)),
    };
  });
}

/** States that do not yet define every required input combination. */
export function statesWithMissingInputs(
  rows: StateRow[],
  inputVars: string
): StateInputCoverage[] {
  return analyzeInputCoverage(rows, inputVars).filter((entry) => entry.missing.length > 0);
}

/** Format missing-input detail for validation errors. */
export function formatMissingInputErrors(
  rows: StateRow[],
  inputVars: string
): string[] {
  return statesWithMissingInputs(rows, inputVars).map(
    (entry) => `State ${entry.state} missing: ${entry.missingLabels.join(',')}`
  );
}

/**
 * Append rows for every undefined (present state, input) pair.
 * Defaults: next state = present state, output = 0.
 */
export function autoCompleteMissingInputs(
  rows: StateRow[],
  inputVars: string,
  newId: () => string
): StateRow[] {
  const inputNames = parseInputVarNames(inputVars);
  const numInputBits = inputNames.length;
  const normalized = normalizeStateTableInputs(rows, inputVars);
  const gaps = statesWithMissingInputs(normalized, inputVars);

  if (gaps.length === 0) return normalized;

  const additions: StateRow[] = [];
  for (const { state, missing } of gaps) {
    for (const inputCode of missing) {
      additions.push({
        id: newId(),
        presentState: state,
        input: formatInputLabel(inputCode, numInputBits),
        nextState: state,
        output: '0',
      });
    }
  }

  return [...normalized, ...additions];
}
