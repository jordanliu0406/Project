import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { StateRow, ModelType } from '../types';

interface Props {
  modelType: ModelType;
  inputVars: string;
  outputVars: string;
  rows: StateRow[];
  onInputVarsChange: (v: string) => void;
  onOutputVarsChange: (v: string) => void;
  onRowChange: (id: string, field: keyof StateRow, value: string) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onClear: () => void;
  onLoadExample: () => void;
}

const StateTableEditor: React.FC<Props> = ({
  modelType,
  inputVars,
  outputVars,
  rows,
  onInputVarsChange,
  onOutputVarsChange,
  onRowChange,
  onAddRow,
  onDeleteRow,
  onClear,
  onLoadExample,
}) => {
  const outputLabel = modelType === 'moore' ? 'Z (State Output)' : 'Z (Trans. Output)';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            Input Variables
          </label>
          <input
            type="text"
            value={inputVars}
            onChange={(e) => onInputVarsChange(e.target.value)}
            placeholder="e.g. X or X,Y"
            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            Output Variables (Z)
          </label>
          <input
            type="text"
            value={outputVars}
            onChange={(e) => onOutputVarsChange(e.target.value)}
            placeholder="e.g. Z"
            className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          State Table
        </label>
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-750 border-b border-gray-700">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Present State
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Input ({inputVars.trim() || 'X'})
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Next State
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {outputLabel}
                  </th>
                  <th className="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No rows yet. Add a row or load an example to get started.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${idx % 2 === 0 ? 'bg-gray-800/40' : 'bg-gray-800/20'} hover:bg-gray-700/40`}
                  >
                    {(['presentState', 'input', 'nextState', 'output'] as const).map(
                      (field) => (
                        <td key={field} className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row[field]}
                            onChange={(e) => onRowChange(row.id, field, e.target.value)}
                            aria-label={`Row ${idx + 1} ${field}`}
                            className="w-full bg-transparent border border-transparent rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:border-gray-500 focus:bg-gray-700/50 transition-all text-center"
                          />
                        </td>
                      )
                    )}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRow(row.id)}
                        className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="Delete row"
                        aria-label={`Delete row ${idx + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={onAddRow}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-gray-500 hover:text-blue-400 hover:bg-blue-500/5 border-t border-gray-700 transition-colors"
          >
            <Plus size={13} />
            Add Row
          </button>
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onClear}
          className="flex-1 px-4 py-2 rounded-md border border-gray-600 text-gray-400 text-sm font-medium hover:border-gray-500 hover:text-gray-300 hover:bg-gray-700/30 transition-all"
        >
          Clear Table
        </button>
        <button
          type="button"
          onClick={onLoadExample}
          className="flex-1 px-4 py-2 rounded-md border border-blue-500/40 text-blue-400 text-sm font-medium hover:border-blue-500 hover:bg-blue-500/10 transition-all"
        >
          Load Example
        </button>
      </div>
    </div>
  );
};

export default StateTableEditor;
