import React, { useMemo } from 'react';
import { FlipFlopType, KMap, ModelType } from '../types';
import { Cpu } from 'lucide-react';
import SchematicViewer from './SchematicViewer';
import {
  AndGate, OrGate, XorGate, NotGate,
  FlipFlopBlock, ffPinY,
  Wire, Dot, SigLabel,
  GATE_W, GATE_PIN_TOP, GATE_PIN_BOT, GATE_PIN_OUT,
  NOT_W, NOT_PIN_IN, NOT_PIN_OUT,
} from './LogicGates';

interface Props {
  flipFlopType: FlipFlopType;
  modelType: ModelType;
  hasData: boolean;
  kmaps: KMap[];
}

function findEquation(kmaps: KMap[], label: string): string {
  return kmaps.find((kmap) => kmap.label === label)?.equation ?? '';
}

function toBadge(label: string, equation: string): string {
  const compact = equation.replace(/\s·\s/g, '·').replace(/\s\+\s/g, '+');
  return `${label}=${compact}`;
}

const SchematicGrid = React.memo(function SchematicGrid({
  rows,
  cols,
}: {
  rows: number;
  cols: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={20 + col * 38}
            cy={20 + row * 30}
            r={0.6}
            fill="#1e293b"
          />
        ))
      )}
    </>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   Expression Parser & Gate Layout Engine
   ─────────────────────────────────────────────────────────────────────────────*/

interface ParsedTerm {
  literals: string[];
  isComplement: boolean;
}

interface ZOutputLayout {
  type: 'direct' | 'not' | 'and' | 'or';
  terms: ParsedTerm[];
  gatePositions: { [key: string]: { x: number; y: number } };
  outputY: number;
}

function parseTerm(term: string): string[] {
  return term
    .split('·')
    .map(lit => lit.trim())
    .filter(lit => lit.length > 0);
}

function parseZExpression(expr: string): ZOutputLayout {
  const expr_clean = expr.trim();
  
  if (expr_clean === '0' || expr_clean === '1') {
    return { type: 'direct', terms: [], gatePositions: {}, outputY: 0 };
  }

  const isSOP = expr_clean.includes('+');

  if (isSOP) {
    const terms = expr_clean
      .split('+')
      .map(t => ({ literals: parseTerm(t), isComplement: false }));
    
    return {
      type: 'or',
      terms,
      gatePositions: {},
      outputY: 0,
    };
  }

  const literals = parseTerm(expr_clean);

  if (literals.length === 0) {
    return { type: 'direct', terms: [], gatePositions: {}, outputY: 0 };
  }

  if (literals.length === 1) {
    const lit = literals[0];
    if (lit.includes("'")) {
      return {
        type: 'not',
        terms: [{ literals: [lit], isComplement: true }],
        gatePositions: {},
        outputY: 0,
      };
    } else {
      return {
        type: 'direct',
        terms: [{ literals: [lit], isComplement: false }],
        gatePositions: {},
        outputY: 0,
      };
    }
  }

  return {
    type: 'and',
    terms: [{ literals, isComplement: false }],
    gatePositions: {},
    outputY: 0,
  };
}

const CYAN   = '#22d3ee';
const AMBER  = '#fbbf24';
const WHITE  = 'white';
const DIMW   = 'rgba(255,255,255,0.45)';
const CLKC   = 'rgba(255,255,255,0.35)';

const gOutX = (gx: number) => gx + GATE_W;
const orOutX = (gx: number) => gx + GATE_W - 2;

/* ─────────────────────────────────────────────────────────────────────────────
   IMPROVED JK FLIP-FLOP CIRCUIT
──────────────────────────────────────────────────────────────────────────────*/

const JKCircuit: React.FC<{ kmaps: KMap[]; modelType: ModelType }> = ({ kmaps }) => {
  const SVG_W = 880, SVG_H = 460;

  // Optimized positions with better spacing
  const NX = { x: 30, y: 30 };
  const AJ1 = { x: 140, y: 105 };
  const AK1 = { x: 140, y: 195 };
  const FF1 = { x: 310, y: 90, w: 100, h: 180 };
  const XJ2 = { x: 160, y: 295 };
  const OK2 = { x: 160, y: 373 };
  const NQ1 = { x: 65, y: 370 };
  const FF2 = { x: 490, y: 90, w: 100, h: 180 };

  const AZ1 = { x: 680, y: 115 };
  const AZ2 = { x: 680, y: 185 };
  const OZ  = { x: 762, y: 138 };
  const NZ  = { x: 680, y: 115 };

  const ff1CLKy = FF1.y + ffPinY('JK', 'CLK', FF1.h);
  const ff1Qy   = FF1.y + ffPinY('JK', 'Q',   FF1.h);
  const ff1QPy  = FF1.y + ffPinY('JK', "Q'",  FF1.h);

  const ff2CLKy = FF2.y + ffPinY('JK', 'CLK', FF2.h);
  const ff2Qy   = FF2.y + ffPinY('JK', 'Q',   FF2.h);
  const ff2QPy  = FF2.y + ffPinY('JK', "Q'",  FF2.h);

  const xBusY  = 14;
  const xpBusX = 122;
  const q2BusX = 606;
  const q2TopY = 10;
  const q1BusX = 418;
  const q1BotY = 412;

  const zEquation = findEquation(kmaps, 'Z (Output)');
  const zLayout = useMemo(() => parseZExpression(zEquation), [zEquation]);

  let outputY = AZ1.y + GATE_PIN_OUT;
  if (zLayout.type === 'or') {
    outputY = OZ.y + GATE_PIN_OUT;
  } else if (zLayout.type === 'not') {
    outputY = NZ.y + NOT_PIN_OUT;
  }

  return (
    <>
      <SchematicGrid rows={15} cols={23} />

      {/* ══════════════════════════════════════════════
          SIGNAL BUSES (Improved routing)
          ══════════════════════════════════════════════ */}

      {/* X bus */}
      <Wire pts={[{ x: 15, y: xBusY }, { x: SVG_W - 30, y: xBusY }]} color={CYAN} w={1.8} />
      <SigLabel x={5} y={xBusY + 4} text="X" color={CYAN} size={13} />

      {/* X' bus */}
      <Wire pts={[
        { x: NX.x + NOT_W, y: NX.y + NOT_PIN_OUT },
        { x: xpBusX, y: NX.y + NOT_PIN_OUT },
        { x: xpBusX, y: OK2.y + GATE_PIN_TOP + 3 },
      ]} color={AMBER} w={1.6} />
      <SigLabel x={xpBusX + 2} y={NX.y + NOT_PIN_OUT - 3} text="X'" color={AMBER} size={9} />

      {/* X → AJ1 top */}
      <Wire pts={[
        { x: 358, y: xBusY },
        { x: 358, y: AJ1.y + GATE_PIN_TOP },
        { x: AJ1.x, y: AJ1.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={358} y={xBusY} color={CYAN} />

      {/* X' → AK1 top */}
      <Wire pts={[
        { x: xpBusX, y: AK1.y + GATE_PIN_TOP },
        { x: AK1.x, y: AK1.y + GATE_PIN_TOP },
      ]} color={AMBER} w={1.6} />
      <Dot x={xpBusX} y={AK1.y + GATE_PIN_TOP} color={AMBER} />

      {/* X' → OR(K2) top */}
      <Wire pts={[
        { x: xpBusX, y: OK2.y + GATE_PIN_TOP + 3 },
        { x: OK2.x, y: OK2.y + GATE_PIN_TOP + 3 },
      ]} color={AMBER} w={1.6} />
      <Dot x={xpBusX} y={OK2.y + GATE_PIN_TOP + 3} color={AMBER} />

      {/* X → XOR(J2) top */}
      <Wire pts={[
        { x: 358, y: xBusY },
        { x: 358, y: XJ2.y + GATE_PIN_TOP },
        { x: XJ2.x, y: XJ2.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={358} y={XJ2.y + GATE_PIN_TOP} color={CYAN} />

      {/* Q2 bus */}
      <Wire pts={[
        { x: FF2.x + FF2.w, y: ff2Qy },
        { x: q2BusX, y: ff2Qy },
      ]} color={WHITE} w={1.8} />
      <SigLabel x={q2BusX + 4} y={ff2Qy + 4} text="Q₂" color={WHITE} size={10} />

      <Wire pts={[
        { x: q2BusX, y: ff2Qy },
        { x: q2BusX, y: q2TopY },
      ]} color={WHITE} w={1.5} />
      <Dot x={q2BusX} y={ff2Qy} color={WHITE} />

      <Wire pts={[
        { x: q2BusX, y: q2TopY },
        { x: 152, y: q2TopY },
      ]} color={WHITE} w={1.5} />
      <Dot x={q2BusX} y={q2TopY} color={WHITE} />

      {/* Q2 → AJ1 bot */}
      <Wire pts={[
        { x: 152, y: q2TopY },
        { x: 152, y: AJ1.y + GATE_PIN_BOT },
        { x: AJ1.x, y: AJ1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={152} y={q2TopY} color={WHITE} />

      {/* Q1 bus */}
      <Wire pts={[
        { x: FF1.x + FF1.w, y: ff1Qy },
        { x: q1BusX, y: ff1Qy },
      ]} color={WHITE} w={1.8} />
      <SigLabel x={q1BusX + 4} y={ff1Qy + 4} text="Q₁" color={WHITE} size={10} />

      <Wire pts={[
        { x: q1BusX, y: ff1Qy },
        { x: q1BusX, y: q1BotY },
      ]} color={WHITE} w={1.5} />
      <Dot x={q1BusX} y={ff1Qy} color={WHITE} />

      <Wire pts={[
        { x: q1BusX, y: q1BotY },
        { x: 75, y: q1BotY },
      ]} color={WHITE} w={1.5} />
      <Dot x={q1BusX} y={q1BotY} color={WHITE} />

      {/* Q1 → AK1 bot */}
      <Wire pts={[
        { x: 158, y: q1BotY },
        { x: 158, y: AK1.y + GATE_PIN_BOT },
        { x: AK1.x, y: AK1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={158} y={q1BotY} color={WHITE} />

      {/* Q1 → XOR(J2) bot */}
      <Wire pts={[
        { x: 172, y: q1BotY },
        { x: 172, y: XJ2.y + GATE_PIN_BOT },
        { x: XJ2.x, y: XJ2.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={172} y={q1BotY} color={WHITE} />

      {/* Q1 → NOT(Q1) input */}
      <Wire pts={[
        { x: 75, y: q1BotY },
        { x: 75, y: NQ1.y + NOT_PIN_IN },
        { x: NQ1.x, y: NQ1.y + NOT_PIN_IN },
      ]} color={WHITE} w={1.5} />
      <Dot x={75} y={q1BotY} color={WHITE} />

      {/* NOT(Q1) output → OR(K2) bot */}
      <Wire pts={[
        { x: NQ1.x + NOT_W, y: NQ1.y + NOT_PIN_OUT },
        { x: OK2.x, y: NQ1.y + NOT_PIN_OUT },
        { x: OK2.x, y: OK2.y + GATE_PIN_BOT + 3 },
      ]} color={AMBER} w={1.5} />
      <SigLabel x={NQ1.x + NOT_W + 2} y={NQ1.y + NOT_PIN_OUT - 3} text="Q₁'" color={AMBER} size={9} />

      {/* Q' stubs */}
      <Wire pts={[
        { x: FF1.x + FF1.w, y: ff1QPy },
        { x: FF1.x + FF1.w + 14, y: ff1QPy },
      ]} color={DIMW} w={1.4} />
      <SigLabel x={FF1.x + FF1.w + 16} y={ff1QPy + 3} text="Q₁'" color={DIMW} size={9} />

      <Wire pts={[
        { x: FF2.x + FF2.w, y: ff2QPy },
        { x: FF2.x + FF2.w + 14, y: ff2QPy },
      ]} color={DIMW} w={1.4} />
      <SigLabel x={FF2.x + FF2.w + 16} y={ff2QPy + 3} text="Q₂'" color={DIMW} size={9} />

      {/* ══════════════════════════════════════════════
          Z OUTPUT NETWORK (DYNAMIC)
          ══════════════════════════════════════════════ */}

      {zLayout.type === 'direct' && zLayout.terms.length === 1 && (
        <>
          <Wire pts={[
            { x: q2BusX, y: ff2Qy },
            { x: SVG_W - 15, y: ff2Qy },
          ]} color={CYAN} w={1.8} />
        </>
      )}

      {zLayout.type === 'not' && (
        <>
          <Wire pts={[
            { x: q2BusX, y: ff2Qy },
            { x: q2BusX, y: NZ.y + NOT_PIN_IN },
            { x: NZ.x, y: NZ.y + NOT_PIN_IN },
          ]} color={WHITE} w={1.5} />
          <Dot x={q2BusX} y={NZ.y + NOT_PIN_IN} color={WHITE} />

          <Wire pts={[
            { x: NZ.x + NOT_W, y: NZ.y + NOT_PIN_OUT },
            { x: SVG_W - 15, y: NZ.y + NOT_PIN_OUT },
          ]} color={CYAN} w={1.8} />
        </>
      )}

      {zLayout.type === 'and' && (
        <>
          {zLayout.terms[0].literals.includes('Q₁') && (
            <Wire pts={[
              { x: 158, y: q1BotY },
              { x: 158, y: AZ1.y + GATE_PIN_TOP },
              { x: AZ1.x, y: AZ1.y + GATE_PIN_TOP },
            ]} color={WHITE} w={1.5} />
          )}

          {zLayout.terms[0].literals.includes('Q₂') && (
            <Wire pts={[
              { x: AZ1.x + 4 + GATE_PIN_BOT, y: q2TopY },
              { x: AZ1.x + 4 + GATE_PIN_BOT, y: AZ1.y + GATE_PIN_BOT },
            ]} color={WHITE} w={1.5} />
          )}

          <Wire pts={[
            { x: gOutX(AZ1.x), y: AZ1.y + GATE_PIN_OUT },
            { x: SVG_W - 15, y: AZ1.y + GATE_PIN_OUT },
          ]} color={CYAN} w={1.8} />
        </>
      )}

      {zLayout.type === 'or' && (
        <>
          {zLayout.terms.map((term, idx) => {
            const andGate = idx === 0 ? AZ1 : AZ2;
            return (
              <React.Fragment key={idx}>
                {term.literals.includes('X') && (
                  <Wire pts={[
                    { x: 358, y: xBusY },
                    { x: andGate.x + 4 + GATE_PIN_TOP, y: xBusY },
                    { x: andGate.x + 4 + GATE_PIN_TOP, y: andGate.y + GATE_PIN_TOP },
                  ]} color={CYAN} w={1.6} />
                )}

                {term.literals.includes('Q₁') && (
                  <Wire pts={[
                    { x: 158, y: q1BotY },
                    { x: andGate.x + 4 + GATE_PIN_TOP, y: q1BotY },
                    { x: andGate.x + 4 + GATE_PIN_TOP, y: andGate.y + GATE_PIN_TOP },
                  ]} color={WHITE} w={1.5} />
                )}

                {term.literals.includes('Q₂') && (
                  <Wire pts={[
                    { x: andGate.x + 4 + GATE_PIN_BOT, y: q2TopY },
                    { x: andGate.x + 4 + GATE_PIN_BOT, y: andGate.y + GATE_PIN_BOT },
                  ]} color={WHITE} w={1.5} />
                )}

                <Wire pts={[
                  { x: gOutX(andGate.x), y: andGate.y + GATE_PIN_OUT },
                  { x: OZ.x + 4, y: andGate.y + GATE_PIN_OUT },
                  { x: OZ.x + 4, y: idx === 0 ? OZ.y + GATE_PIN_TOP + 3 : OZ.y + GATE_PIN_BOT + 3 },
                ]} color={WHITE} w={1.5} />
              </React.Fragment>
            );
          })}

          <Wire pts={[
            { x: orOutX(OZ.x), y: OZ.y + GATE_PIN_OUT },
            { x: SVG_W - 15, y: OZ.y + GATE_PIN_OUT },
          ]} color={CYAN} w={1.8} />
        </>
      )}

      {/* Z label */}
      <SigLabel x={SVG_W - 12} y={outputY + 4} text="Z" color={CYAN} size={14} />

      {/* CLK */}
      <SigLabel x={5} y={ff1CLKy + 3} text="CLK" color={CLKC} size={9} />
      <Wire pts={[
        { x: 44, y: ff1CLKy },
        { x: FF1.x, y: ff1CLKy },
      ]} color={CLKC} dashed w={1.4} />
      <Wire pts={[
        { x: 44, y: ff1CLKy },
        { x: 44, y: ff2CLKy },
        { x: FF2.x, y: ff2CLKy },
      ]} color={CLKC} dashed w={1.4} />
      <Dot x={44} y={ff1CLKy} color={CLKC} r={2.5} />

      {/* Gates & FFs */}
      <NotGate x={NX.x} y={NX.y} />
      <AndGate x={AJ1.x} y={AJ1.y} />
      <AndGate x={AK1.x} y={AK1.y} />
      <XorGate x={XJ2.x} y={XJ2.y} />
      <OrGate x={OK2.x} y={OK2.y} />

      {(zLayout.type === 'and' || zLayout.type === 'or') && (
        <AndGate x={AZ1.x} y={AZ1.y} />
      )}
      {zLayout.type === 'or' && (
        <>
          <AndGate x={AZ2.x} y={AZ2.y} />
          <OrGate x={OZ.x} y={OZ.y} />
        </>
      )}
      {zLayout.type === 'not' && (
        <NotGate x={NZ.x} y={NZ.y} />
      )}

      <FlipFlopBlock x={FF1.x} y={FF1.y} width={FF1.w} height={FF1.h} type="JK" label="FF₁" />
      <FlipFlopBlock x={FF2.x} y={FF2.y} width={FF2.w} height={FF2.h} type="JK" label="FF₂" />

      {/* EQUATION BADGES */}
      <EqBadge x={AJ1.x} y={AJ1.y - 15} eq={toBadge('J₁', findEquation(kmaps, 'J₁'))} />
      <EqBadge x={AK1.x} y={AK1.y - 15} eq={toBadge('K₁', findEquation(kmaps, 'K₁'))} />
      <EqBadge x={XJ2.x} y={XJ2.y - 15} eq={toBadge('J₂', findEquation(kmaps, 'J₂'))} />
      <EqBadge x={OK2.x} y={OK2.y - 15} eq={toBadge('K₂', findEquation(kmaps, 'K₂'))} />
      <EqBadge
        x={AZ1.x - 10}
        y={AZ1.y - 15}
        eq={toBadge('Z', zEquation)}
      />

      <Legend x={SVG_W - 246} y={SVG_H - 62} />
    </>
  );
};

/* ── Equation badge ── */
const EqBadge: React.FC<{ x: number; y: number; eq: string }> = ({ x, y, eq }) => (
  <g>
    <rect x={x - 2} y={y - 2} width={eq.length * 6.4 + 10} height={13} rx={2.5}
      fill="rgba(3,7,18,0.92)" stroke="rgba(96,165,250,0.3)" strokeWidth={0.7} />
    <text x={x + 3} y={y + 8.5} fill="#60a5fa" fontSize="8.5" fontFamily="monospace" fontWeight="700">
      {eq}
    </text>
  </g>
);

/* ── Legend ── */
const Legend: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <rect width={238} height={52} rx={5}
      fill="rgba(3,7,18,0.92)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} />
    <text x={119} y={12} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle" fontFamily="monospace">LEGEND</text>
    {/* row 1 */}
    <line x1={8} y1={22} x2={22} y2={22} stroke={CYAN} strokeWidth={1.8} />
    <text x={26} y={25} fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="monospace">X / Z</text>
    <line x1={68} y1={22} x2={82} y2={22} stroke={AMBER} strokeWidth={1.5} />
    <text x={86} y={25} fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="monospace">X'/Q'</text>
    <line x1={126} y1={22} x2={140} y2={22} stroke={WHITE} strokeWidth={1.5} />
    <text x={144} y={25} fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="monospace">Q feedback</text>
    {/* row 2 */}
    <line x1={8} y1={38} x2={22} y2={38} stroke={CLKC} strokeWidth={1.4} strokeDasharray="4,3" />
    <text x={26} y={41} fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="monospace">CLK</text>
    <circle cx={76} cy={38} r={3} fill={WHITE} />
    <text x={82} y={41} fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="monospace">Branch/Junction</text>
  </g>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
──────────────────────────────────────────────────────────────────────────────*/
const CircuitSchematicEnhanced: React.FC<Props> = ({ flipFlopType, modelType, hasData, kmaps }) => {
  const schematicNote = useMemo(() => {
    if (kmaps.length === 0) return null;
    const modelLabel = modelType === 'moore' ? 'Moore' : 'Mealy';
    return `${modelLabel} Model · Enhanced Layout · Equation badges reflect your minimized design`;
  }, [kmaps.length, modelType]);

  const svgDimensions = flipFlopType === 'jk' 
    ? { width: 880, height: 460 }
    : { width: 800, height: 390 };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <span className="h-px flex-1 bg-gray-700" />
        Circuit Schematic (Enhanced)
        <span className="h-px flex-1 bg-gray-700" />
      </h3>
      <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4">
        {hasData ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={13} className="text-blue-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {flipFlopType === 'jk' ? 'JK Flip-Flop' : 'T Flip-Flop'} Circuit
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                  {modelType.toUpperCase()} Model
                </span>
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                  MIL-STD-806B
                </span>
              </div>
            </div>
            <SchematicViewer 
              svgWidth={svgDimensions.width}
              svgHeight={svgDimensions.height}
              fileName={`${modelType}-${flipFlopType}-flipflop-circuit`}
            >
              <JKCircuit kmaps={kmaps} modelType={modelType} />
            </SchematicViewer>
            {schematicNote && (
              <p className="mt-3 text-xs text-gray-500 text-center italic">{schematicNote}</p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p className="text-sm">Generate a design to view the circuit schematic</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitSchematicEnhanced;
