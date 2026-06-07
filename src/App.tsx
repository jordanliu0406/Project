import ModelConfig from './components/ModelConfig';
import StateTableEditor from './components/StateTableEditor';
import RightPanel from './components/RightPanel';
import BottomBar from './components/BottomBar';
import { useDesignSession } from './hooks/useDesignSession';
import { Cpu, GitBranch } from 'lucide-react';

export default function App() {
  const {
    design,
    activeTab,
    kmaps,
    hasGenerated,
    isLoading,
    isStale,
    validationErrors,
    validationWarnings,
    canGenerate,
    updateDesign,
    handleRowChange,
    handleAddRow,
    handleDeleteRow,
    handleClear,
    handleLoadExample,
    handleGenerate,
    handleExport,
    setActiveTab,
  } = useDesignSession();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="flex-shrink-0 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm px-5 py-3.5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Cpu size={18} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none tracking-wide">
                Sequential Circuit Design
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 leading-none">
                Automation System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="hidden sm:flex items-center gap-1.5">
              <GitBranch size={12} />
              <span>v1.0</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-gray-400">
                {design.modelType === 'mealy' ? 'Mealy' : 'Moore'} ·{' '}
                {design.flipFlopType.toUpperCase()} FF
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden max-w-screen-2xl w-full mx-auto">
        <aside className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Design Inputs
              </h2>
              <span className="h-px flex-1 bg-gray-800" />
            </div>

            <ModelConfig
              modelType={design.modelType}
              flipFlopType={design.flipFlopType}
              onModelChange={(v) => updateDesign('modelType', v)}
              onFlipFlopChange={(v) => updateDesign('flipFlopType', v)}
            />

            <div className="border-t border-gray-800" />

            {validationErrors.length > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-300 space-y-1"
              >
                {validationErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}

            {validationWarnings.length > 0 && validationErrors.length === 0 && (
              <div
                role="status"
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200 space-y-1"
              >
                {validationWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}

            <StateTableEditor
              modelType={design.modelType}
              inputVars={design.inputVars}
              outputVars={design.outputVars}
              rows={design.stateTable}
              onInputVarsChange={(v) => updateDesign('inputVars', v)}
              onOutputVarsChange={(v) => updateDesign('outputVars', v)}
              onRowChange={handleRowChange}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onClear={handleClear}
              onLoadExample={handleLoadExample}
            />
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 lg:p-4">
          <div className="h-full min-h-[500px] lg:min-h-0">
            <RightPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              kmaps={kmaps}
              flipFlopType={design.flipFlopType}
              hasGenerated={hasGenerated}
              isLoading={isLoading}
              isStale={isStale}
            />
          </div>
        </main>
      </div>

      <BottomBar
        onGenerate={handleGenerate}
        onExport={handleExport}
        onSimulation={() => setActiveTab('schematic')}
        isLoading={isLoading}
        hasGenerated={hasGenerated}
        canGenerate={canGenerate}
      />
    </div>
  );
}
