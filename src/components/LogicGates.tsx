import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   Standard Distinctive-Shape Logic Gate SVG Components (MIL-STD-806B)

   Canonical bounding box W=60 H=44 for all 2-input gates.
   Pin stubs are NOT drawn here — the circuit component adds them.
   All shapes assume x=0, y=0 as the top-left corner; the caller wraps in <g transform="translate(x,y)">.

   Input pins (2-input):  top  at (0, 12)
                          bot  at (0, 32)
   Output pin:            out  at (60, 22)  ← right edge center for AND / OR
                                             for NOT: out at (53, 18)  (after bubble)

   Colours: stroke='white', fill='#0d1117' (very dark, nearly black)
──────────────────────────────────────────────────────────────────────────────*/

export const GATE_W   = 60;
export const GATE_H   = 44;
export const GATE_PIN_TOP = 12;
export const GATE_PIN_BOT = 32;
export const GATE_PIN_OUT = 22;

const FILL  = '#0d1117';
const STROKE = 'white';
const SW    = 1.8;           // stroke-width for gate bodies

/* ── AND Gate – flat back (x=0), D-shape arc on right ── */
export const AndGateShape: React.FC = () => {
  const W = GATE_W, H = GATE_H, r = H / 2;
  // Flat left x=4, body ends at x=W-r, arc centre at (W-r, H/2)
  const bodyL = 4;
  const arcX  = W - r;
  return (
    <path
      d={`M ${bodyL},0 L ${arcX},0 A ${r},${r} 0 0,1 ${arcX},${H} L ${bodyL},${H} Z`}
      fill={FILL} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round"
    />
  );
};

/* ── OR Gate – concave back, convex pointed front ── */
export const OrGateShape: React.FC = () => {
  const W = GATE_W, H = GATE_H;
  return (
    <path
      d={`
        M 4,0
        Q ${W * 0.42},0   ${W * 0.72},0
        Q ${W + 4},${H * 0.5}   ${W * 0.72},${H}
        Q ${W * 0.42},${H}   4,${H}
        Q ${W * 0.22},${H * 0.5}   4,0
        Z
      `}
      fill={FILL} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round"
    />
  );
};

/* ── XOR Gate – OR body + extra concave input arc ── */
export const XorGateShape: React.FC = () => {
  const W = GATE_W, H = GATE_H;
  return (
    <>
      <path
        d={`
          M 4,0
          Q ${W * 0.42},0   ${W * 0.72},0
          Q ${W + 4},${H * 0.5}   ${W * 0.72},${H}
          Q ${W * 0.42},${H}   4,${H}
          Q ${W * 0.22},${H * 0.5}   4,0
          Z
        `}
        fill={FILL} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round"
      />
      {/* extra concave arc on input side */}
      <path
        d={`M -3,0 Q ${W * 0.22 - 3},${H * 0.5} -3,${H}`}
        fill="none" stroke={STROKE} strokeWidth={SW}
      />
    </>
  );
};

/* ── NOT Gate – isoceles triangle + output bubble ── */
export const NotGateShape: React.FC = () => {
  const W = 40, H = 36, bubbleR = 5;
  // Triangle points: (0,0), (0,H), (W-bubbleR*2, H/2)
  const tipX = W - bubbleR * 2;
  const midY = H / 2;
  return (
    <>
      <path
        d={`M 0,0 L ${tipX},${midY} L 0,${H} Z`}
        fill={FILL} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round"
      />
      <circle cx={tipX + bubbleR} cy={midY} r={bubbleR}
        fill={FILL} stroke={STROKE} strokeWidth={SW} />
    </>
  );
};

/* ── Wrapper components that accept x,y position ── */

interface GatePosProps {
  x: number;
  y: number;
  id?: string;
}

export const AndGate: React.FC<GatePosProps> = ({ x, y, id }) => (
  <g transform={`translate(${x},${y})`} id={id}><AndGateShape /></g>
);

export const OrGate: React.FC<GatePosProps> = ({ x, y, id }) => (
  <g transform={`translate(${x},${y})`} id={id}><OrGateShape /></g>
);

export const XorGate: React.FC<GatePosProps> = ({ x, y, id }) => (
  <g transform={`translate(${x},${y})`} id={id}><XorGateShape /></g>
);

/* NOT gate: W=40, H=36; input pin at (0,18), output pin at (50,18) */
export const NOT_W  = 50;   // total width inc bubble
export const NOT_H  = 36;
export const NOT_PIN_IN  = 18;  // y of input pin
export const NOT_PIN_OUT = 18;  // y of output pin (same – centre)

export const NotGate: React.FC<GatePosProps> = ({ x, y, id }) => (
  <g transform={`translate(${x},${y})`} id={id}><NotGateShape /></g>
);

/* ── Flip-Flop block ──
   Draws a rectangle with evenly-spaced pin labels.
   Pins are named; the caller uses computed y = y_top + pin_y_fraction * height.
*/
export type FFType = 'JK' | 'T';

interface FFPin {
  name: string;
  side: 'left' | 'right';
  yFrac: number;   // 0..1 fraction of height
  isClk?: boolean;
}

const JK_PINS: FFPin[] = [
  { name: 'J',   side: 'left',  yFrac: 0.20 },
  { name: 'K',   side: 'left',  yFrac: 0.55 },
  { name: 'CLK', side: 'left',  yFrac: 0.82, isClk: true },
  { name: 'Q',   side: 'right', yFrac: 0.20 },
  { name: "Q'",  side: 'right', yFrac: 0.55 },
];

const T_PINS: FFPin[] = [
  { name: 'T',   side: 'left',  yFrac: 0.25 },
  { name: 'CLK', side: 'left',  yFrac: 0.70, isClk: true },
  { name: 'Q',   side: 'right', yFrac: 0.25 },
  { name: "Q'",  side: 'right', yFrac: 0.70 },
];

export function ffPinY(type: FFType, pinName: string, height: number): number {
  const pins = type === 'JK' ? JK_PINS : T_PINS;
  const pin  = pins.find(p => p.name === pinName);
  return pin ? pin.yFrac * height : height / 2;
}

interface FlipFlopProps extends GatePosProps {
  width: number;
  height: number;
  type: FFType;
  label: string;
}

export const FlipFlopBlock: React.FC<FlipFlopProps> = ({ x, y, width, height, type, label, id }) => {
  const pins = type === 'JK' ? JK_PINS : T_PINS;
  const cx = width / 2;

  return (
    <g transform={`translate(${x},${y})`} id={id}>
      {/* body */}
      <rect width={width} height={height} rx={3}
        fill="#0a0f1e" stroke={STROKE} strokeWidth={1.8} />
      {/* header divider */}
      <line x1={0} y1={height * 0.38} x2={width} y2={height * 0.38}
        stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

      {/* FF type label */}
      <text x={cx} y={height * 0.16} fill="#93c5fd"
        fontSize="11" fontFamily="monospace" fontWeight="700" textAnchor="middle">{label}</text>
      <text x={cx} y={height * 0.31} fill="rgba(255,255,255,0.35)"
        fontSize="9" fontFamily="monospace" textAnchor="middle">{type} FF</text>

      {/* Pins */}
      {pins.map(pin => {
        const py = pin.yFrac * height;
        const isLeft = pin.side === 'left';
        return (
          <g key={pin.name}>
            {/* pin label */}
            <text
              x={isLeft ? 7 : width - 7}
              y={py + 4}
              fill="rgba(255,255,255,0.65)"
              fontSize="9" fontFamily="monospace" fontWeight="600"
              textAnchor={isLeft ? 'start' : 'end'}
            >
              {pin.name}
            </text>
            {/* CLK arrow symbol */}
            {pin.isClk && (
              <path
                d={`M ${isLeft ? 0 : width},${py - 5} L ${isLeft ? 10 : width - 10},${py} L ${isLeft ? 0 : width},${py + 5}`}
                fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.2}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

/* ── Wire: multi-segment orthogonal path ── */
interface WireProps {
  pts: { x: number; y: number }[];
  color?: string;
  dashed?: boolean;
  w?: number;
}
export const Wire: React.FC<WireProps> = ({ pts, color = 'white', dashed = false, w = 1.6 }) => {
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={w}
      strokeDasharray={dashed ? '5,4' : undefined} strokeLinecap="round" />
  );
};

/* ── Junction dot ── */
export const Dot: React.FC<{ x: number; y: number; color?: string; r?: number }> = (
  { x, y, color = 'white', r = 3.2 }
) => <circle cx={x} cy={y} r={r} fill={color} />;

/* ── Signal label ── */
export const SigLabel: React.FC<{
  x: number; y: number; text: string;
  color?: string; size?: number; anchor?: 'start' | 'middle' | 'end';
}> = ({ x, y, text, color = 'rgba(255,255,255,0.55)', size = 10, anchor = 'start' }) => (
  <text x={x} y={y} fill={color} fontSize={size} fontFamily="monospace" textAnchor={anchor}>
    {text}
  </text>
);
