import { ModelType, StateRow } from '../types';
import { parseInputVarNames, parseInputCode } from './kmapEngine';

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

  const transitions = new Map<string, { nextState: string; output: string }>();
  for (const row of complete) {
    const key = `${row.presentState.trim()}:${row.input.trim()}`;
    const nextState = row.nextState.trim();
    const output = row.output.trim();
    const existing = transitions.get(key);

    if (existing) {
      if (existing.nextState !== nextState || existing.output !== output) {
        errors.push(
          `Conflicting transitions for present state "${row.presentState.trim()}" with input "${row.input.trim()}".`
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

  for (const row of complete) {
    const parsed = parseInputCode(row.input, numInputBits);
    if (parsed === null) {
      errors.push(
        `Invalid input "${row.input.trim()}" for ${numInputBits} input variable(s) (${inputNames.join(', ')}). Use ${numInputBits}-bit binary (e.g. ${'0'.repeat(numInputBits)}–${'1'.repeat(numInputBits)}).`
      );
    }
  }

  const states = new Set<string>();
  for (const row of complete) {
    states.add(row.presentState.trim());
    states.add(row.nextState.trim());
  }

  const numFF = Math.max(1, Math.ceil(Math.log2(Math.max(states.size, 1))));
  const totalVariables = numFF + numInputBits;

  if (totalVariables > 6) {
    warnings.push(
      `This design uses ${totalVariables} K-map variables (${numFF} state + ${numInputBits} input). Maps larger than 6 variables may be difficult to read.`
    );
  }

  const expectedInputs = 1 << numInputBits;
  const definedInputs = new Set(
    complete
      .map((row) => parseInputCode(row.input, numInputBits))
      .filter((value): value is number => value !== null)
  );

  for (const state of states) {
    const coveredInputs = complete
      .filter((row) => row.presentState.trim() === state)
      .map((row) => parseInputCode(row.input, numInputBits))
      .filter((value): value is number => value !== null);

    if (coveredInputs.length > 0 && coveredInputs.length < expectedInputs) {
      warnings.push(
        `State "${state}" defines ${coveredInputs.length}/${expectedInputs} input combinations; missing entries are treated as don't-cares.`
      );
      break;
    }
  }

  if (definedInputs.size < expectedInputs) {
    warnings.push(
      `The state table defines ${definedInputs.size}/${expectedInputs} unique input combinations for ${inputNames.join(', ')}.`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
