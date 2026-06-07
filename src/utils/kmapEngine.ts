import { KMapCell } from '../types';

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

export function toSubscript(index: number): string {
  return String(index)
    .split('')
    .map((digit) => SUBSCRIPTS[Number(digit)] ?? digit)
    .join('');
}

export function qVarName(bitIndex: number): string {
  return `Q${toSubscript(bitIndex)}`;
}

export function excitationLabel(prefix: 'J' | 'K' | 'T', bitIndex: number): string {
  return `${prefix}${toSubscript(bitIndex)}`;
}

/** Parse comma/space-separated input variable names (e.g. "X", "X,Y", "A B"). */
export function parseInputVarNames(inputVars: string): string[] {
  const names = inputVars
    .split(/[,;\s]+/)
    .map((name) => name.trim())
    .filter(Boolean);

  return names.length > 0 ? names : ['X'];
}

/** Parse canonical fixed-width binary input (exactly `numInputBits` digits). */
export function parseInputCode(raw: string, numInputBits: number): number | null {
  const value = raw.trim();
  if (!value) return null;

  if (!/^[01]+$/.test(value) || value.length !== numInputBits) {
    return null;
  }

  return parseInt(value, 2);
}

export function formatBinary(value: number, bits: number): string {
  return value.toString(2).padStart(bits, '0');
}

/** Reflected binary Gray code for `numBits` (MSB-first ordering). */
export function grayCode(numBits: number): number[] {
  if (numBits <= 0) return [0];
  if (numBits === 1) return [0, 1];

  let codes = [0, 1];
  for (let bit = 2; bit <= numBits; bit += 1) {
    const highBit = 1 << (bit - 1);
    const mirrored = [...codes].reverse().map((code) => code | highBit);
    codes = codes.concat(mirrored);
  }
  return codes;
}

export function encodeMinterm(
  stateCode: number,
  inputCode: number,
  numInputBits: number
): number {
  return (stateCode << numInputBits) | inputCode;
}

export function buildVariableList(numFF: number, inputNames: string[]): string[] {
  const stateVars: string[] = [];
  for (let bit = numFF - 1; bit >= 0; bit -= 1) {
    stateVars.push(qVarName(bit));
  }
  return [...stateVars, ...inputNames];
}

type Implicant = {
  minterms: number[];
  mask: number;
  value: number;
};

function countBits(value: number): number {
  let count = 0;
  let n = value;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

/** Quine–McCluskey minimization for an arbitrary number of variables. */
export function qmMinimize(
  ones: number[],
  dc: number[],
  variableNames: string[]
): string {
  const numVars = variableNames.length;
  if (numVars === 0) return ones.length > 0 ? '1' : '0';
  if (ones.length === 0) return '0';

  const allMinterms = new Set([...ones, ...dc]);

  let implicants: Implicant[] = Array.from(allMinterms).map((minterm) => ({
    minterms: [minterm],
    mask: (1 << numVars) - 1,
    value: minterm,
  }));

  const primes: Implicant[] = [];

  while (implicants.length > 0) {
    const used = new Set<number>();
    const next: Implicant[] = [];

    for (let i = 0; i < implicants.length; i += 1) {
      for (let j = i + 1; j < implicants.length; j += 1) {
        const a = implicants[i];
        const b = implicants[j];
        if (a.mask !== b.mask) continue;

        const diff = a.value ^ b.value;
        if (countBits(diff) !== 1) continue;

        next.push({
          minterms: a.minterms.concat(b.minterms),
          mask: a.mask & ~diff,
          value: a.value & (a.mask & ~diff),
        });
        used.add(i);
        used.add(j);
      }
    }

    for (let i = 0; i < implicants.length; i += 1) {
      if (!used.has(i)) primes.push(implicants[i]);
    }

    const seen = new Set<string>();
    implicants = next.filter((imp) => {
      const key = `${imp.mask}:${imp.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const essential: Implicant[] = [];
  const covered = new Set<number>();

  for (const minterm of ones) {
    const covering = primes.filter((prime) => prime.minterms.includes(minterm));
    if (covering.length === 1) {
      const prime = covering[0];
      if (!essential.find((item) => item.mask === prime.mask && item.value === prime.value)) {
        essential.push(prime);
        for (const coveredMinterm of prime.minterms) {
          if (ones.includes(coveredMinterm)) covered.add(coveredMinterm);
        }
      }
    }
  }

  let remaining = ones.filter((minterm) => !covered.has(minterm));
  while (remaining.length > 0) {
    let best: Implicant | null = null;
    let bestCount = 0;

    for (const prime of primes) {
      if (essential.includes(prime)) continue;
      const coverCount = prime.minterms.filter((minterm) => remaining.includes(minterm)).length;
      if (coverCount > bestCount) {
        bestCount = coverCount;
        best = prime;
      }
    }

    if (!best) break;

    essential.push(best);
    for (const coveredMinterm of best.minterms) {
      if (ones.includes(coveredMinterm)) covered.add(coveredMinterm);
    }
    remaining = ones.filter((minterm) => !covered.has(minterm));
  }

  if (essential.length === 0) return '0';

  const impToTerm = (imp: Implicant): string => {
    const literals: string[] = [];
    for (let bit = numVars - 1; bit >= 0; bit -= 1) {
      if (!((imp.mask >> bit) & 1)) continue;
      const variable = variableNames[numVars - 1 - bit];
      const value = (imp.value >> bit) & 1;
      literals.push(value === 1 ? variable : `${variable}'`);
    }
    return literals.length === 0 ? '1' : literals.join(' · ');
  };

  return Array.from(new Set(essential.map(impToTerm))).join(' + ');
}

function formatRowLabel(stateCode: number, numStateBits: number): string {
  if (numStateBits === 0) return 'State = 0';
  const stateVars = Array.from({ length: numStateBits }, (_, index) =>
    qVarName(numStateBits - 1 - index)
  ).join('');
  return `${stateVars} = ${formatBinary(stateCode, numStateBits)}`;
}

function formatColLabel(inputCode: number, inputNames: string[]): string {
  if (inputNames.length === 0) return 'Input = 0';
  const header = inputNames.join('');
  return `${header} = ${formatBinary(inputCode, inputNames.length)}`;
}

export function buildKMapFromValueMap(
  valueMap: Map<number, string>,
  numStateBits: number,
  inputNames: string[]
): { rows: string[]; cols: string[]; cells: KMapCell[][]; equation: string } {
  const numInputBits = inputNames.length;
  const numVars = numStateBits + numInputBits;
  const variableNames = buildVariableList(numStateBits, inputNames);
  const totalMinterms = 1 << numVars;

  const ones: number[] = [];
  const dc: number[] = [];
  for (let idx = 0; idx < totalMinterms; idx += 1) {
    const value = valueMap.get(idx) ?? 'X';
    if (value === '1') ones.push(idx);
    else if (value === 'X') dc.push(idx);
  }

  const rowCodes = grayCode(numStateBits);
  const colCodes = grayCode(numInputBits);

  const rows = rowCodes.map((code) => formatRowLabel(code, numStateBits));
  const cols = colCodes.map((code) => formatColLabel(code, inputNames));

  const cells: KMapCell[][] = rowCodes.map((stateCode) =>
    colCodes.map((inputCode) => {
      const idx = encodeMinterm(stateCode, inputCode, numInputBits);
      const value = valueMap.get(idx) ?? 'X';
      return { value, highlighted: value === '1' };
    })
  );

  return {
    rows,
    cols,
    cells,
    equation: qmMinimize(ones, dc, variableNames),
  };
}

export function fillDontCareMap(
  valueMap: Map<number, string>,
  numStateBits: number,
  numInputBits: number
): Map<number, string> {
  const filled = new Map(valueMap);
  const totalMinterms = 1 << (numStateBits + numInputBits);
  for (let idx = 0; idx < totalMinterms; idx += 1) {
    if (!filled.has(idx)) filled.set(idx, 'X');
  }
  return filled;
}
