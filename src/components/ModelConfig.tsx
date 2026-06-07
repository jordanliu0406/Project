import React from 'react';
import { ModelType, FlipFlopType } from '../types';

interface Props {
  modelType: ModelType;
  flipFlopType: FlipFlopType;
  onModelChange: (v: ModelType) => void;
  onFlipFlopChange: (v: FlipFlopType) => void;
}

const RadioGroup: React.FC<{
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}> = ({ name, options, value, onChange }) => (
  <div className="flex gap-3 flex-wrap">
    {options.map((opt) => (
      <label
        key={opt.value}
        className={`flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer text-sm font-medium transition-all duration-200 ${
          value === opt.value
            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
            : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300'
        }`}
      >
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          className="sr-only"
        />
        <span
          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            value === opt.value ? 'border-blue-500' : 'border-gray-500'
          }`}
        >
          {value === opt.value && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          )}
        </span>
        {opt.label}
      </label>
    ))}
  </div>
);

const ModelConfig: React.FC<Props> = ({
  modelType,
  flipFlopType,
  onModelChange,
  onFlipFlopChange,
}) => (
  <div className="space-y-5">
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
        Model Type
      </label>
      <RadioGroup
        name="model"
        options={[
          { value: 'mealy', label: 'Mealy Model' },
          { value: 'moore', label: 'Moore Model' },
        ]}
        value={modelType}
        onChange={(v) => onModelChange(v as ModelType)}
      />
    </div>
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
        Flip-Flop Type
      </label>
      <RadioGroup
        name="ff"
        options={[
          { value: 'jk', label: 'JK Flip-Flop' },
          { value: 't', label: 'T Flip-Flop' },
        ]}
        value={flipFlopType}
        onChange={(v) => onFlipFlopChange(v as FlipFlopType)}
      />
    </div>
  </div>
);

export default ModelConfig;
