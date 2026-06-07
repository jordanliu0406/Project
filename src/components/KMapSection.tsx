import React from 'react';
import { KMap } from '../types';

interface Props {
  kmaps: KMap[];
}

const KMapCard: React.FC<{ kmap: KMap }> = ({ kmap }) => (
  <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
    <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
      <span className="w-2 h-2 rounded-sm bg-blue-500" />
      K-Map: {kmap.label}
    </h4>
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr>
            <th className="w-28 p-1.5 text-gray-500 font-medium text-left border border-gray-700/50 bg-gray-900/40" />
            {kmap.cols.map((col) => (
              <th
                key={col}
                className="p-1.5 text-gray-400 font-semibold border border-gray-700/50 bg-gray-900/40 whitespace-nowrap text-center min-w-[60px]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kmap.rows.map((row, ri) => (
            <tr key={row}>
              <td className="p-1.5 text-gray-400 font-semibold border border-gray-700/50 bg-gray-900/40 whitespace-nowrap">
                {row}
              </td>
              {kmap.cells[ri].map((cell, ci) => (
                <td
                  key={ci}
                  className={`p-1.5 text-center border border-gray-700/50 font-mono font-semibold transition-colors ${
                    cell.highlighted
                      ? 'bg-blue-500/20 text-blue-300 ring-1 ring-inset ring-blue-500/30'
                      : cell.value === 'X'
                      ? 'bg-gray-700/30 text-gray-500'
                      : 'text-gray-300'
                  }`}
                >
                  {cell.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium">Minimized:</span>
      <code className="text-sm text-green-400 font-mono bg-green-500/10 px-2 py-0.5 rounded">
        {kmap.equation}
      </code>
    </div>
  </div>
);

const KMapSection: React.FC<Props> = ({ kmaps }) => {
  if (kmaps.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <span className="h-px flex-1 bg-gray-700" />
        Karnaugh Maps
        <span className="h-px flex-1 bg-gray-700" />
      </h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {kmaps.map((kmap) => (
          <KMapCard key={kmap.label} kmap={kmap} />
        ))}
      </div>
    </div>
  );
};

export default KMapSection;
