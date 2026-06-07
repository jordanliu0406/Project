import { StateRow } from '../types';
import { parseInputVarNames, formatBinary, parseInputCode } from './kmapEngine';

/** Alias for strict parsing used in validation and K-map generation. */
export const parseInputCodeStrict = parseInputCode;

/**
 * Parse shorthand input values for migration (pads short binary, accepts decimal/comma).
 * Do not use for final validation — use `parseInputCodeStrict` instead.
 */
export function parseInputCodeLoose(raw: string, numInputBits: number): number | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^[01]+$/.test(value)) {
    if (value.length > numInputBits) {
      // Truncate to the least-significant bits when shrinking variable count.
      return parseInt(value.slice(-numInputBits), 2);
    }
    return parseInt(value.padStart(numInputBits, '0'), 2);
  }

  if (/^[01]+(?:,[01]+)*$/.test(value)) {
    const bits = value.split(',').map((bit) => bit.trim());
    if (bits.length !== numInputBits || bits.some((bit) => bit !== '0' && bit !== '1')) {
      return null;
    }
    return bits.reduce((acc, bit) => (acc << 1) | Number(bit), 0);
  }

  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric < 0) return null;
    const max = 1 << numInputBits;
    if (numeric >= max) return numeric & (max - 1);
    return numeric;
  }

  return null;
}

/** Canonical MSB-first binary label, e.g. `01` for two variables. */
export function formatCanonicalInput(code: number, numInputBits: number): string {
  return formatBinary(code, numInputBits);
}

/** Convert any parseable shorthand into the canonical fixed-width binary string. */
export function normalizeInputString(raw: string, numInputBits: number): string | null {
  const code = parseInputCodeLoose(raw, numInputBits);
  if (code === null) return null;
  return formatCanonicalInput(code, numInputBits);
}

/** True when `raw` is already stored as exact-width binary (no shorthand). */
export function isInputNormalized(raw: string, numInputBits: number): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return parseInputCodeStrict(trimmed, numInputBits) !== null;
}

/** Visible bit width of a raw binary string, or null for non-binary forms. */
export function binaryInputDisplayWidth(raw: string): number | null {
  const trimmed = raw.trim();
  if (/^[01]+$/.test(trimmed)) return trimmed.length;
  return null;
}

/** Detect tables mixing e.g. `0` with `10` when two variables are configured. */
export function hasMixedInputWidths(rows: StateRow[]): boolean {
  const widths = new Set<number>();
  for (const row of rows) {
    const width = binaryInputDisplayWidth(row.input);
    if (width !== null) widths.add(width);
  }
  return widths.size > 1;
}

export function needsInputNormalization(rows: StateRow[], inputVars: string): boolean {
  const numInputBits = parseInputVarNames(inputVars).length;

  if (hasMixedInputWidths(rows)) return true;

  for (const row of rows) {
    const input = row.input.trim();
    if (input && !isInputNormalized(input, numInputBits)) return true;
  }

  return false;
}

/** Normalize every non-empty input cell to fixed-width binary. */
export function normalizeStateTableInputs(rows: StateRow[], inputVars: string): StateRow[] {
  const numInputBits = parseInputVarNames(inputVars).length;

  return rows.map((row) => {
    const input = row.input.trim();
    if (!input) return row;

    const normalized = normalizeInputString(input, numInputBits);
    if (normalized === null || normalized === row.input) return row;

    return { ...row, input: normalized };
  });
}

export function formatInputNormalizationErrors(
  rows: StateRow[],
  inputVars: string
): string[] {
  const errors: string[] = [];
  const inputNames = parseInputVarNames(inputVars);
  const numInputBits = inputNames.length;
  const example = formatCanonicalInput(0, numInputBits);

  if (hasMixedInputWidths(rows)) {
    errors.push(
      `Mixed input widths in the state table. All values must be exactly ${numInputBits} bits (e.g. ${example}) for ${inputNames.join(', ')}.`
    );
  }

  for (const row of rows) {
    const input = row.input.trim();
    if (!input) continue;

    if (isInputNormalized(input, numInputBits)) continue;

    const migrated = normalizeInputString(input, numInputBits);
    const stateLabel = row.presentState.trim() || '?';

    if (migrated === null) {
      errors.push(
        `Invalid input "${input}" for state ${stateLabel}: expected ${numInputBits}-bit binary (${'0'.repeat(numInputBits)}–${'1'.repeat(numInputBits)}).`
      );
    } else {
      errors.push(
        `Input "${input}" for state ${stateLabel} must be normalized to "${migrated}" (${numInputBits} bits).`
      );
    }
  }

  return errors;
}

/** Transition map key: present state + canonical input code. */
export function transitionKey(presentState: string, input: string, inputVars: string): string | null {
  const numInputBits = parseInputVarNames(inputVars).length;
  const code = parseInputCodeStrict(input, numInputBits);
  if (code === null) return null;
  return `${presentState.trim()}:${formatCanonicalInput(code, numInputBits)}`;
}
