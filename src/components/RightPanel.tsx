import React from 'react';
import { KMap, FlipFlopType, OutputTab } from '../types';
import KMapSection from './KMapSection';
import EquationsPanel from './EquationsPanel';
import CircuitSchematic from './CircuitSchematic';
import { BarChart3, Cpu, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  activeTab: OutputTab;
  onTabChange: (t: OutputTab) => void;
  kmaps: KMap[];
  flipFlopType: FlipFlopType;
  hasGenerated: boolean;
  isLoading: boolean;
  isStale?: boolean;
}

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
    <div className="w-20 h-20 rounded-3xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-5">
      <AlertCircle size={32} className="text-gray-600" />
    </div>
    <h3 className="text-gray-400 font-semibold text-base mb-2">No Design Generated</h3>
    <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
      Configure your model type, flip-flop type, and state table, then click{' '}
      <span className="text-blue-400 font-medium">Generate & Minimize</span> to see the results.
    </p>
  </div>
);

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <Loader2 size={36} className="text-blue-500 animate-spin mb-4" />
    <p className="text-gray-400 text-sm font-medium">Minimizing design...</p>
    <p className="text-gray-600 text-xs mt-1">Applying Quine-McCluskey algorithm</p>
  </div>
);

const RightPanel: React.FC<Props> = ({
  activeTab,
  onTabChange,
  kmaps,
  flipFlopType,
  hasGenerated,
  isLoading,
  isStale = false,
}) => {
  const tabs: { key: OutputTab; label: string; icon: React.ReactNode }[] = [
    { key: 'outputs', label: 'Design Outputs', icon: <BarChart3 size={14} /> },
    { key: 'schematic', label: 'Circuit Schematic', icon: <Cpu size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-700/30'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {isStale && hasGenerated && !isLoading && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
          >
            <RefreshCw size={13} className="flex-shrink-0" />
            Design inputs changed — click Generate &amp; Minimize to refresh results.
          </div>
        )}

        {isLoading ? (
          <LoadingState />
        ) : !hasGenerated ? (
          <EmptyState />
        ) : activeTab === 'outputs' ? (
          <>
            <KMapSection kmaps={kmaps} />
            <EquationsPanel kmaps={kmaps} flipFlopType={flipFlopType} />
          </>
        ) : (
          <CircuitSchematic
            flipFlopType={flipFlopType}
            hasData={hasGenerated}
            kmaps={kmaps}
          />
        )}
      </div>
    </div>
  );
};

export default RightPanel;
