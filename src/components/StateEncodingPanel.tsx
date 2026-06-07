import React from 'react';
import { Binary } from 'lucide-react';
import { StateRow } from '../types';
import { computeStateEncodings } from '../utils/stateTableUtils';

interface Props {
  rows: StateRow[];
}

const StateEncodingPanel: React.FC<Props> = ({ rows }) => {
  const encodings = computeStateEncodings(rows);

  if (encodings.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Binary size={14} className="text-blue-400" />
        State Encoding
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {encodings.map(({ state, code }) => (
          <div
            key={state}
            className="flex items-center justify-between gap-2 rounded-md border border-gray-700/80 bg-gray-900/50 px-3 py-2"
          >
            <span className="text-sm font-medium text-gray-300">{state}</span>
            <code className="text-sm font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
              {code}
            </code>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-gray-500 leading-relaxed">
        Binary codes are assigned in state discovery order and used for K-map rows.
      </p>
    </div>
  );
};

export default StateEncodingPanel;
