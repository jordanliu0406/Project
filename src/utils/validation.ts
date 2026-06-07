import { ModelType, StateRow } from '../types';
import { parseInputVarNames } from './kmapEngine';
import {
  collectStateOrder,
  formatMissingInputErrors,
  stateEncodingBits,
} from './stateTableUtils';
import {
  formatInputNormalizationErrors,
  formatCanonicalInput,
  parseInputCodeLoose,
} from './inputNormalization';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateStateTable(
  rows: StateRow[],
  modelType: ModelType,
  inputVars = 'X'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const inputNames = parseInputVarNames(inputVars);
  const numInputBits = inputNames.length;

  const complete = rows.filter(
    (row) =>
      row.presentState.trim() &&
      row.nextState.trim() &&
      row.input.trim() !== ''
  );

  if (complete.length === 0) {
    errors.push('Add at least one complete row to the state table.');
    return { valid: false, errors, warnings };
  }

  // Require fixed-width binary inputs before any other checks.
  errors.push(...formatInputNormalizationErrors(rows, inputVars));

  const transitions = new Map<string, { nextState: string; output: string }>();
  for (const row of complete) {
    const inputCode = parseInputCodeLoose(row.input, numInputBits);
    const canonicalInput =
      inputCode !== null
        ? formatCanonicalInput(inputCode, numInputBits)
        : row.input.trim();
    const key = `${row.presentState.trim()}:${canonicalInput}`;
    const nextState = row.nextState.trim();
    const output = row.output.trim();
    const existing = transitions.get(key);

    if (existing) {
      if (existing.nextState !== nextState || existing.output !== output) {
        errors.push(
          `Conflicting transitions for present state "${row.presentState.trim()}" with input "${canonicalInput}".`
        );
      }
    } else {
      transitions.set(key, { nextState, output });
    }
  }

  if (modelType === 'moore') {
    const stateOutputs = new Map<string, string>();
    for (const row of complete) {
      const presentState = row.presentState.trim();
      const output = row.output.trim();
      const previous = stateOutputs.get(presentState);

      if (previous !== undefined && previous !== output) {
        errors.push(
          `Moore model: state "${presentState}" has inconsistent outputs ("${previous}" vs "${output}").`
        );
      } else {
        stateOutputs.set(presentState, output);
      }
    }
  }

  const stateOrder = collectStateOrder(rows);
  const numFF = stateEncodingBits(stateOrder.length);
  const totalVariables = numFF + numInputBits;

  if (totalVariables > 6) {
    warnings.push(
      `This design uses ${totalVariables} K-map variables (${numFF} state + ${numInputBits} input). Maps larger than 6 variables may be difficult to read.`
    );
  }

  errors.push(...formatMissingInputErrors(rows, inputVars));

  return { valid: errors.length === 0, errors, warnings };
}
