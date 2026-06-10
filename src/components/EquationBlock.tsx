import React from 'react';

export interface EquationBlockProps {
  label: string;
  equation: string;
  x: number;
  y: number;
  width: number;
  height: number;
  inputBusses: { [key: string]: number };
  outputX: number;
  outputY: number;
  gateColor?: string;
  wireColor?: string;
}

/**
 * Renders a self-contained logic block for a single equation.
 * Includes title, gates, wiring, and output label.
 */
export const EquationBlock: React.FC<EquationBlockProps> = ({
  label,
  equation,
  x,
  y,
  width,
  height,
  gateColor = 'rgba(255,255,255,0.1)',
}) => {
  const CYAN = '#22d3ee';

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Block background */}
      <rect
        width={width}
        height={height}
        rx={4}
        fill="rgba(3,7,18,0.4)"
        stroke={gateColor}
        strokeWidth={0.8}
      />

      {/* Block title */}
      <text
        x={width / 2}
        y={16}
        fill="rgba(255,255,255,0.6)"
        fontSize="10"
        fontFamily="monospace"
        fontWeight="600"
        textAnchor="middle"
      >
        {label}
      </text>

      {/* Equation badge */}
      <rect
        x={4}
        y={height - 18}
        width={width - 8}
        height={14}
        rx={2}
        fill="rgba(3,7,18,0.8)"
        stroke="rgba(96,165,250,0.2)"
        strokeWidth={0.6}
      />
      <text
        x={width / 2}
        y={height - 7}
        fill="#60a5fa"
        fontSize="7.5"
        fontFamily="monospace"
        fontWeight="600"
        textAnchor="middle"
      >
        {equation}
      </text>

      {/* Output connector */}
      <line
        x1={width - 2}
        y1={height / 2}
        x2={width + 8}
        y2={height / 2}
        stroke={CYAN}
        strokeWidth={1.6}
      />
      <circle
        cx={width + 8}
        cy={height / 2}
        r={2.5}
        fill={CYAN}
      />
    </g>
  );
};

export default EquationBlock;
