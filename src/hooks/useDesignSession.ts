import { useState, useCallback, useRef } from 'react';
import {
  DesignState,
  KMap,
  OutputTab,
  StateRow,
} from '../types';
import { generateKMaps, getExampleData } from '../utils/circuitData';
import { validateStateTable } from '../utils/validation';
import { autoCompleteMissingInputs, statesWithMissingInputs } from '../utils/stateTableUtils';
import {
  needsInputNormalization,
  normalizeStateTableInputs,
} from '../utils/inputNormalization';
import { parseInputVarNames } from '../utils/kmapEngine';

const defaultRows = (newId: () => string): StateRow[] => [
  { id: newId(), presentState: 'S0', input: '0', nextState: 'S0', output: '0' },
  { id: newId(), presentState: 'S0', input: '1', nextState: 'S1', output: '0' },
  { id: newId(), presentState: 'S1', input: '0', nextState: 'S0', output: '0' },
  { id: newId(), presentState: 'S1', input: '1', nextState: 'S1', output: '1' },
];

export interface DesignSession {
  design: DesignState;
  activeTab: OutputTab;
  kmaps: KMap[];
  hasGenerated: boolean;
  isLoading: boolean;
  isStale: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  canGenerate: boolean;
  updateDesign: <K extends keyof DesignState>(key: K, value: DesignState[K]) => void;
  handleRowChange: (id: string, field: keyof StateRow, value: string) => void;
  handleAddRow: () => void;
  handleDeleteRow: (id: string) => void;
  handleClear: () => void;
  handleLoadExample: () => void;
  handleAutoComplete: () => void;
  canAutoComplete: boolean;
  handleInputVarsChange: (value: string) => void;
  handleNormalizeInputs: () => void;
  canNormalize: boolean;
  handleGenerate: () => void;
  handleExport: () => void;
  setActiveTab: (tab: OutputTab) => void;
}

export function useDesignSession(): DesignSession {
  const idCounterRef = useRef(100);
  const newId = useCallback(() => String(++idCounterRef.current), []);

  const [design, setDesign] = useState<DesignState>(() => ({
    modelType: 'mealy',
    flipFlopType: 'jk',
    inputVars: 'X',
    outputVars: 'Z',
    stateTable: defaultRows(newId),
  }));

  const [activeTab, setActiveTab] = useState<OutputTab>('outputs');
  const [kmaps, setKmaps] = useState<KMap[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const markStale = useCallback(() => {
    setIsStale(true);
  }, []);

  const updateDesign = useCallback(
    <K extends keyof DesignState>(key: K, value: DesignState[K]) => {
      setDesign((prev) => ({ ...prev, [key]: value }));
      markStale();
    },
    [markStale]
  );

  const handleInputVarsChange = useCallback(
    (value: string) => {
      setDesign((prev) => {
        const prevBits = parseInputVarNames(prev.inputVars).length;
        const nextBits = parseInputVarNames(value).length;
        const shouldMigrate = prevBits !== nextBits && prev.stateTable.length > 0;

        return {
          ...prev,
          inputVars: value,
          stateTable: shouldMigrate
            ? normalizeStateTableInputs(prev.stateTable, value)
            : prev.stateTable,
        };
      });
      markStale();
      setValidationErrors([]);
    },
    [markStale]
  );

  const handleNormalizeInputs = useCallback(() => {
    setDesign((prev) => ({
      ...prev,
      stateTable: normalizeStateTableInputs(prev.stateTable, prev.inputVars),
    }));
    markStale();
    setValidationErrors([]);
  }, [markStale]);

  const handleRowChange = useCallback(
    (id: string, field: keyof StateRow, value: string) => {
      setDesign((prev) => ({
        ...prev,
        stateTable: prev.stateTable.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        ),
      }));
      markStale();
    },
    [markStale]
  );

  const handleAddRow = useCallback(() => {
    setDesign((prev) => ({
      ...prev,
      stateTable: [
        ...prev.stateTable,
        { id: newId(), presentState: '', input: '', nextState: '', output: '' },
      ],
    }));
    markStale();
  }, [markStale, newId]);

  const handleDeleteRow = useCallback(
    (id: string) => {
      setDesign((prev) => ({
        ...prev,
        stateTable: prev.stateTable.filter((row) => row.id !== id),
      }));
      markStale();
    },
    [markStale]
  );

  const handleClear = useCallback(() => {
    setDesign((prev) => ({ ...prev, stateTable: [] }));
    setKmaps([]);
    setHasGenerated(false);
    setIsStale(false);
    setValidationErrors([]);
    setValidationWarnings([]);
  }, []);

  const handleLoadExample = useCallback(() => {
    setDesign((prev) => {
      const rows = getExampleData(prev.modelType, prev.flipFlopType).map((row) => ({
        ...row,
        id: newId(),
      }));
      return {
        ...prev,
        stateTable: normalizeStateTableInputs(rows, prev.inputVars),
      };
    });
    setKmaps([]);
    setHasGenerated(false);
    setIsStale(false);
    setValidationErrors([]);
    setValidationWarnings([]);
  }, [newId]);

  const handleAutoComplete = useCallback(() => {
    setDesign((prev) => ({
      ...prev,
      stateTable: autoCompleteMissingInputs(prev.stateTable, prev.inputVars, newId),
    }));
    markStale();
    setValidationErrors([]);
  }, [markStale, newId]);

  const handleGenerate = useCallback(() => {
    const result = validateStateTable(
      design.stateTable,
      design.modelType,
      design.inputVars
    );

    if (!result.valid) {
      setValidationErrors(result.errors);
      setValidationWarnings(result.warnings);
      return;
    }

    setValidationErrors([]);
    setValidationWarnings(result.warnings);
    setActiveTab('outputs');
    setIsLoading(true);

    requestAnimationFrame(() => {
      const maps = generateKMaps(
        design.flipFlopType,
        design.stateTable,
        design.modelType,
        design.inputVars
      );
      setKmaps(maps);
      setHasGenerated(maps.length > 0);
      setIsStale(false);
      setIsLoading(false);
    });
  }, [design.flipFlopType, design.modelType, design.stateTable, design.inputVars]);

  const handleExport = useCallback(() => {
    const lines: string[] = [
      'Sequential Circuit Design Export',
      `Model: ${design.modelType === 'mealy' ? 'Mealy' : 'Moore'} | Flip-Flop: ${design.flipFlopType.toUpperCase()}`,
      `Inputs: ${design.inputVars} | Outputs: ${design.outputVars}`,
      '',
      'State Table:',
      'Current State (Q1,Q2)\tInput\tNext State (Q1+,Q2+)\tOutput',
      ...design.stateTable.map(
        (row) =>
          `${row.presentState}\t${row.input}\t${row.nextState}\t${row.output}`
      ),
      '',
      'Minimized Equations:',
      ...kmaps.map((kmap) => `${kmap.label} = ${kmap.equation}`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'circuit-design.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [design, kmaps]);

  const canGenerate =
    design.stateTable.some(
      (row) =>
        row.presentState.trim() &&
        row.nextState.trim() &&
        row.input.trim() !== ''
    ) && !isLoading;

  const canAutoComplete =
    statesWithMissingInputs(design.stateTable, design.inputVars).length > 0;

  const canNormalize = needsInputNormalization(design.stateTable, design.inputVars);

  return {
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
    handleAutoComplete,
    canAutoComplete,
    handleInputVarsChange,
    handleNormalizeInputs,
    canNormalize,
    handleGenerate,
    handleExport,
    setActiveTab,
  };
}
