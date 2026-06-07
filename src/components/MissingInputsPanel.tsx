import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StateRow } from '../types';
import {
  analyzeInputCoverage,
  expectedInputCodes,
  formatInputLabel,
} from '../utils/stateTableUtils';
import { parseInputVarNames } from '../utils/kmapEngine';

interface Props {
  rows: StateRow[];
  inputVars: string;
}

const MissingInputsPanel: React.FC<Props> = ({ rows, inputVars }) => {
  const inputNames = parseInputVarNames(inputVars);
  const numInputBits = inputNames.length;
  const expectedLabels = expectedInputCodes(numInputBits).map((code) =>
    formatInputLabel(code, numInputBits)
  );
  const coverage = analyzeInputCoverage(rows, inputVars);
  const incomplete = coverage.filter((entry) => entry.missing.length > 0);

  if (coverage.length === 0) return null;

  return (
    <div
      className={`rounded-lg border p-4 ${
        incomplete.length > 0
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-green-500/25 bg-green-500/5'
      }`}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
        {incomplete.length > 0 ? (
          <>
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-amber-300">Missing Input Combinations</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-green-300">Input Coverage</span>
          </>
        )}
      </h3>

      <p className="text-[11px] text-gray-500 mb-3">
        Expected per state ({inputNames.join(', ')}), {numInputBits}-bit normalized:{' '}
        <span className="font-mono text-gray-400">{expectedLabels.join(', ')}</span>
      </p>

      {incomplete.length === 0 ? (
        <p className="text-xs text-green-300/90">
          Every state defines all {expectedLabels.length} input combination
          {expectedLabels.length === 1 ? '' : 's'}.
        </p>
      ) : (
        <ul className="space-y-2">
          {incomplete.map((entry) => (
            <li
              key={entry.state}
              className="rounded-md border border-amber-500/20 bg-gray-900/40 px-3 py-2 text-xs"
            >
              <span className="font-semibold text-amber-200">{entry.state}</span>
              <span className="text-gray-500 mx-1.5">·</span>
              <span className="text-gray-400">
                defined {entry.defined.length}/{expectedLabels.length}
              </span>
              <p className="mt-1 text-amber-200/90">
                Missing:{' '}
                <span className="font-mono text-amber-100">
                  {entry.missingLabels.join(', ')}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MissingInputsPanel;
