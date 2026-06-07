import React from 'react';
import { Zap, Download, FlaskConical, ChevronRight } from 'lucide-react';

interface Props {
  onGenerate: () => void;
  onExport: () => void;
  onSimulation: () => void;
  isLoading: boolean;
  hasGenerated: boolean;
  canGenerate: boolean;
}

const BottomBar: React.FC<Props> = ({
  onGenerate,
  onExport,
  onSimulation,
  isLoading,
  hasGenerated,
  canGenerate,
}) => (
  <div className="flex-shrink-0 border-t border-gray-700 bg-gray-900/80 backdrop-blur-sm px-5 py-3.5">
    <div className="flex items-center gap-3 flex-wrap">
      {/* Primary action */}
      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="flex items-center gap-2.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
        title={!canGenerate && !isLoading ? 'Complete at least one state table row' : undefined}
      >
        <Zap size={15} className={isLoading ? 'animate-pulse' : ''} />
        {isLoading ? 'Minimizing...' : 'Generate & Minimize'}
        {!isLoading && <ChevronRight size={14} className="opacity-70" />}
      </button>

      <div className="w-px h-6 bg-gray-700 hidden sm:block" />

      {/* Secondary actions */}
      <button
        onClick={onExport}
        disabled={!hasGenerated}
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-700/30"
      >
        <Download size={14} />
        Export
      </button>
      <button
        onClick={onSimulation}
        disabled={!hasGenerated}
        aria-label="Open circuit schematic for the current minimized design"
        className="flex items-center gap-2 px-4 py-2.5 border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-700/30"
      >
        <FlaskConical size={14} />
        Simulation Center
      </button>

      {/* Status indicator */}
      {hasGenerated && !isLoading && (
        <div className="ml-auto flex items-center gap-2 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Design minimized
        </div>
      )}
    </div>
  </div>
);

export default BottomBar;
