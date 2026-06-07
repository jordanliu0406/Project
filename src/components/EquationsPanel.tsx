import React from 'react';
import { KMap, FlipFlopType } from '../types';

interface Props {
  kmaps: KMap[];
  flipFlopType: FlipFlopType;
}

const EquationRow: React.FC<{ label: string; equation: string; color: string }> = ({
  label,
  equation,
  color,
}) => (
  <div className={`flex items-center gap-4 p-3.5 rounded-lg border ${color} bg-opacity-5`}>
    <span className="text-xs font-semibold text-gray-400 w-8 text-right flex-shrink-0">{label}</span>
    <span className="text-gray-500 flex-shrink-0">=</span>
    <code className="text-sm font-mono text-gray-100 tracking-wide">{equation}</code>
  </div>
);

const EquationsPanel: React.FC<Props> = ({ kmaps, flipFlopType }) => {
  const ffLabel = flipFlopType === 'jk' ? 'JK Flip-Flop' : 'T Flip-Flop';

  const colors: Record<number, string> = {
    0: 'border-blue-500/30 bg-blue-500',
    1: 'border-cyan-500/30 bg-cyan-500',
    2: 'border-teal-500/30 bg-teal-500',
    3: 'border-sky-500/30 bg-sky-500',
    4: 'border-emerald-500/30 bg-emerald-500',
  };

  if (kmaps.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <span className="h-px flex-1 bg-gray-700" />
        Minimized Equations — {ffLabel}
        <span className="h-px flex-1 bg-gray-700" />
      </h3>
      <div className="space-y-2">
        {kmaps.map((kmap, i) => (
          <EquationRow
            key={kmap.label}
            label={kmap.label}
            equation={kmap.equation}
            color={colors[i] ?? 'border-gray-600/30 bg-gray-500'}
          />
        ))}
      </div>
      <div className="text-xs text-gray-600 italic px-1">
        ′ denotes complement &nbsp;·&nbsp; denotes AND &nbsp;+&nbsp; denotes OR &nbsp;⊕&nbsp; denotes XOR
      </div>
    </div>
  );
};

export default EquationsPanel;
