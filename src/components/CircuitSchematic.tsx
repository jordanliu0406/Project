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

function toBadge(label: string, equation: string, fallback: string): string {
  const raw = equation || fallback;
  const compact = raw.replace(/\s·\s/g, '·').replace(/\s\+\s/g, '+');
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
   JK FLIP-FLOP CIRCUIT (with Moore/Mealy Model Support)
   ─────────────────────────────────────────────────────────────────────────────
   
   Moore Model: Z depends only on state (Q1, Q2)
   Mealy Model: Z depends on state (Q1, Q2) AND input (X)
──────────────────────────────────────────────────────────────────────────────*/

const CYAN   = '#22d3ee';
const AMBER  = '#fbbf24';
const WHITE  = 'white';
const DIMW   = 'rgba(255,255,255,0.45)';
const CLKC   = 'rgba(255,255,255,0.35)';

/* helper: gate output x (right edge) */
const gOutX = (gx: number) => gx + GATE_W;
/* OR output is slightly inside the pointed tip – use GATE_W-2 */
const orOutX = (gx: number) => gx + GATE_W - 2;

const JKCircuit: React.FC<{ kmaps: KMap[]; modelType: ModelType }> = ({ kmaps, modelType }) => {
  /* ── geometry constants ── */
  const SVG_W = 880, SVG_H = 460;

  /* NOT(X) gate */
  const NX = { x: 30, y: 30 };

  /* AND gates for J1, K1 */
  const AJ1 = { x: 140, y: 105 };
  const AK1 = { x: 140, y: 195 };

  /* FF1 */
  const FF1 = { x: 310, y: 90, w: 100, h: 180 };

  /* XOR(J2), OR(K2), NOT(Q1) */
  const XJ2 = { x: 160, y: 295 };
  const OK2 = { x: 160, y: 373 };
  const NQ1 = { x: 65, y: 370 };

  /* FF2 */
  const FF2 = { x: 490, y: 90, w: 100, h: 180 };

  /* Z output gates - layout depends on model type */
  const AZ1 = { x: 680, y: 115 };  // AND for Z
  const AZ2 = { x: 680, y: 185 };  // AND for Z (Mealy only)
  const OZ  = { x: 762, y: 138 };  // OR combines Z inputs

  /* FF1 pin Y positions */
  const ff1Jy   = FF1.y + ffPinY('JK', 'J',   FF1.h);
  const ff1Ky   = FF1.y + ffPinY('JK', 'K',   FF1.h);
  const ff1CLKy = FF1.y + ffPinY('JK', 'CLK', FF1.h);
  const ff1Qy   = FF1.y + ffPinY('JK', 'Q',   FF1.h);
  const ff1QPy  = FF1.y + ffPinY('JK', "Q'",  FF1.h);

  /* FF2 pin Y positions */
  const ff2Jy   = FF2.y + ffPinY('JK', 'J',   FF2.h);
  const ff2Ky   = FF2.y + ffPinY('JK', 'K',   FF2.h);
  const ff2CLKy = FF2.y + ffPinY('JK', 'CLK', FF2.h);
  const ff2Qy   = FF2.y + ffPinY('JK', 'Q',   FF2.h);
  const ff2QPy  = FF2.y + ffPinY('JK', "Q'",  FF2.h);

  /* Bus rail coordinates */
  const xBusY  = 14;
  const xpBusX = 122;
  const q2BusX = 606;
  const q2TopY = 10;
  const q1BusX = 418;
  const q1BotY = 412;

  return (
    <>
      {/* ── background grid dots ── */}
      <SchematicGrid rows={15} cols={23} />

      {/* ══════════════════════════════════════════════
          SIGNAL BUSES (drawn first, gates on top)
          ══════════════════════════════════════════════ */}

      {/* ── X horizontal bus (cyan) ── */}
      <Wire pts={[{ x: 15, y: xBusY }, { x: SVG_W - 30, y: xBusY }]} color={CYAN} w={1.8} />
      <SigLabel x={5} y={xBusY + 4} text="X" color={CYAN} size={13} />

      {/* X  → NOT(X) input (drop from bus) */}
      <Wire pts={[
        { x: NX.x, y: xBusY },
        { x: NX.x, y: NX.y + NOT_PIN_IN },
      ]} color={CYAN} w={1.8} />
      <Dot x={NX.x} y={xBusY} color={CYAN} />

      {/* X  → XOR(J2) top input */}
      <Wire pts={[
        { x: 358, y: xBusY },
        { x: 358, y: XJ2.y + GATE_PIN_TOP },
        { x: XJ2.x, y: XJ2.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={358} y={xBusY} color={CYAN} />

      {/* AZ1 top input: X for Mealy, Q1 for Moore */}
      {modelType === 'mealy' && (
        <>
          <Wire pts={[
            { x: AZ1.x + 4 + GATE_PIN_TOP, y: xBusY },
            { x: AZ1.x + 4 + GATE_PIN_TOP, y: AZ1.y + GATE_PIN_TOP },
          ]} color={CYAN} w={1.6} />
          <Dot x={AZ1.x + 4 + GATE_PIN_TOP} y={xBusY} color={CYAN} />
        </>
      )}
      {modelType === 'moore' && (
        <>
          <Wire pts={[
            { x: 158, y: q1BotY },
            { x: 158, y: AZ1.y + GATE_PIN_TOP },
            { x: AZ1.x, y: AZ1.y + GATE_PIN_TOP },
          ]} color={WHITE} w={1.5} />
          <Dot x={158} y={q1BotY} color={WHITE} />
        </>
      )}

      {/* ── X' vertical bus (amber) ── */}
      {/* NOT(X) output → xpBusX rail */}
      <Wire pts={[
        { x: NX.x + NOT_W, y: NX.y + NOT_PIN_OUT },
        { x: xpBusX, y: NX.y + NOT_PIN_OUT },
        { x: xpBusX, y: OK2.y + GATE_PIN_TOP + 3 },
      ]} color={AMBER} w={1.6} />
      <SigLabel x={xpBusX + 2} y={NX.y + NOT_PIN_OUT - 3} text="X'" color={AMBER} size={9} />

      {/* X' rail → AND(J1) top pin */}
      <Wire pts={[
        { x: xpBusX, y: AJ1.y + GATE_PIN_TOP },
        { x: AJ1.x, y: AJ1.y + GATE_PIN_TOP },
      ]} color={AMBER} w={1.6} />
      <Dot x={xpBusX} y={AJ1.y + GATE_PIN_TOP} color={AMBER} />

      {/* X' rail → AND(K1) top pin */}
      <Wire pts={[
        { x: xpBusX, y: AK1.y + GATE_PIN_TOP },
        { x: AK1.x, y: AK1.y + GATE_PIN_TOP },
      ]} color={AMBER} w={1.6} />
      <Dot x={xpBusX} y={AK1.y + GATE_PIN_TOP} color={AMBER} />

      {/* X' rail → OR(K2) top pin (offset +3 for OR shape) */}
      <Wire pts={[
        { x: xpBusX, y: OK2.y + GATE_PIN_TOP + 3 },
        { x: OK2.x + 4, y: OK2.y + GATE_PIN_TOP + 3 },
      ]} color={AMBER} w={1.6} />
      <Dot x={xpBusX} y={OK2.y + GATE_PIN_TOP + 3} color={AMBER} />

      {/* ── Q2 bus (white) – from FF2.Q right, up to top channel, then left ── */}
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

      {/* drop from top channel → AND(J1) bot pin */}
      <Wire pts={[
        { x: 152, y: q2TopY },
        { x: 152, y: AJ1.y + GATE_PIN_BOT },
        { x: AJ1.x, y: AJ1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={152} y={q2TopY} color={WHITE} />

      {/* drop → AND(Z1) bot */}
      <Wire pts={[
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: q2TopY },
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: AZ1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={AZ1.x + 4 + GATE_PIN_BOT} y={q2TopY} color={WHITE} />

      {/* Q2 also drops → AND(Z2) bot (ONLY for Mealy model) */}
      {modelType === 'mealy' && (
        <>
          <Wire pts={[
            { x: AZ2.x + 4 + GATE_PIN_BOT, y: q2TopY },
            { x: AZ2.x + 4 + GATE_PIN_BOT, y: AZ2.y + GATE_PIN_BOT },
          ]} color={WHITE} w={1.5} />
          <Dot x={AZ2.x + 4 + GATE_PIN_BOT} y={q2TopY} color={WHITE} />
        </>
      )}

      {/* ── Q1 bus (white) – from FF1.Q right, down to bot channel, then left ── */}
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

      {/* bot channel drop → AND(K1) bot pin */}
      <Wire pts={[
        { x: 158, y: q1BotY },
        { x: 158, y: AK1.y + GATE_PIN_BOT },
        { x: AK1.x, y: AK1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={158} y={q1BotY} color={WHITE} />

      {/* bot channel drop → XOR(J2) bot pin */}
      <Wire pts={[
        { x: 172, y: q1BotY },
        { x: 172, y: XJ2.y + GATE_PIN_BOT },
        { x: XJ2.x, y: XJ2.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={172} y={q1BotY} color={WHITE} />

      {/* bot channel → NOT(Q1) input */}
      <Wire pts={[
        { x: 75, y: q1BotY },
        { x: 75, y: NQ1.y + NOT_PIN_IN },
        { x: NQ1.x, y: NQ1.y + NOT_PIN_IN },
      ]} color={WHITE} w={1.5} />
      <Dot x={75} y={q1BotY} color={WHITE} />

      {/* Q1 also feeds AND(Z2) top (offset lane x = q1BusX+6) - ONLY for Mealy */}
      {modelType === 'mealy' && (
        <Wire pts={[
          { x: q1BusX + 6, y: ff1Qy },
          { x: q1BusX + 6, y: q2TopY + 6 },
          { x: AZ2.x + 4 + GATE_PIN_TOP, y: q2TopY + 6 },
          { x: AZ2.x + 4 + GATE_PIN_TOP, y: AZ2.y + GATE_PIN_TOP },
        ]} color={WHITE} w={1.5} />
      )}

      {/* ── NOT(Q1) output → OR(K2) bot pin (amber, Q1') ── */}
      <Wire pts={[
        { x: NQ1.x + NOT_W, y: NQ1.y + NOT_PIN_OUT },
        { x: 135, y: NQ1.y + NOT_PIN_OUT },
        { x: 135, y: OK2.y + GATE_PIN_BOT + 3 },
        { x: OK2.x + 4, y: OK2.y + GATE_PIN_BOT + 3 },
      ]} color={AMBER} w={1.5} />
      <SigLabel x={NQ1.x + NOT_W + 2} y={NQ1.y + NOT_PIN_OUT - 2} text="Q₁'" color={AMBER} size={9} />

      {/* ══════════════════════════════════════════════
          GATE → FF CONNECTIONS
          ══════════════════════════════════════════════ */}

      {/* AND(J1) out → FF1.J */}
      <Wire pts={[
        { x: gOutX(AJ1.x), y: AJ1.y + GATE_PIN_OUT },
        { x: FF1.x, y: ff1Jy },
      ]} color={WHITE} w={1.5} />

      {/* AND(K1) out → FF1.K */}
      <Wire pts={[
        { x: gOutX(AK1.x), y: AK1.y + GATE_PIN_OUT },
        { x: 290, y: AK1.y + GATE_PIN_OUT },
        { x: 290, y: ff1Ky },
        { x: FF1.x, y: ff1Ky },
      ]} color={WHITE} w={1.5} />

      {/* XOR(J2) out → FF2.J (route around FF1) */}
      <Wire pts={[
        { x: gOutX(XJ2.x) + 2, y: XJ2.y + GATE_PIN_OUT },
        { x: 460, y: XJ2.y + GATE_PIN_OUT },
        { x: 460, y: ff2Jy },
        { x: FF2.x, y: ff2Jy },
      ]} color={WHITE} w={1.5} />

      {/* OR(K2) out → FF2.K */}
      <Wire pts={[
        { x: orOutX(OK2.x), y: OK2.y + GATE_PIN_OUT },
        { x: 455, y: OK2.y + GATE_PIN_OUT },
        { x: 455, y: ff2Ky },
        { x: FF2.x, y: ff2Ky },
      ]} color={WHITE} w={1.5} />

      {/* ══════════════════════════════════════════════
          CLK
          ══════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════
          Q' output stubs
          ══════════════════════════════════════════════ */}
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
          Z output network (model-dependent)
          ══════════════════════════════════════════════ */}
      
      {/* For Mealy: AND(Z1) → OR(Z) top, AND(Z2) → OR(Z) bot */}
      {modelType === 'mealy' && (
        <>
          <Wire pts={[
            { x: gOutX(AZ1.x), y: AZ1.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: AZ1.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: OZ.y + GATE_PIN_TOP + 3 },
          ]} color={WHITE} w={1.5} />

          <Wire pts={[
            { x: gOutX(AZ2.x), y: AZ2.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: AZ2.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: OZ.y + GATE_PIN_BOT + 3 },
          ]} color={WHITE} w={1.5} />

          {/* OR(Z) output → Z label (Mealy only) */}
          <Wire pts={[
            { x: orOutX(OZ.x), y: OZ.y + GATE_PIN_OUT },
            { x: SVG_W - 15, y: OZ.y + GATE_PIN_OUT },
          ]} color={CYAN} w={1.8} />
        </>
      )}

      {/* For Moore: AND(Z1) directly to Z output (no OR gate) */}
      {modelType === 'moore' && (
        <Wire pts={[
          { x: gOutX(AZ1.x), y: AZ1.y + GATE_PIN_OUT },
          { x: SVG_W - 15, y: AZ1.y + GATE_PIN_OUT },
        ]} color={CYAN} w={1.8} />
      )}

      {/* Z label */}
      <SigLabel x={SVG_W - 12} y={modelType === 'moore' ? AZ1.y + GATE_PIN_OUT + 4 : OZ.y + GATE_PIN_OUT + 4} text="Z" color={CYAN} size={14} />

      {/* ══════════════════════════════════════════════
          DRAW GATES & FFs ON TOP OF WIRES
          ══════════════════════════════════════════════ */}
      <NotGate x={NX.x}  y={NX.y}  />
      <AndGate x={AJ1.x} y={AJ1.y} />
      <AndGate x={AK1.x} y={AK1.y} />
      <XorGate x={XJ2.x} y={XJ2.y} />
      <OrGate  x={OK2.x} y={OK2.y} />
      <NotGate x={NQ1.x} y={NQ1.y} />
      <AndGate x={AZ1.x} y={AZ1.y} />
      {modelType === 'mealy' && (
        <>
          <AndGate x={AZ2.x} y={AZ2.y} />
          <OrGate  x={OZ.x}  y={OZ.y}  />
        </>
      )}

      <FlipFlopBlock x={FF1.x} y={FF1.y} width={FF1.w} height={FF1.h} type="JK" label="FF₁" />
      <FlipFlopBlock x={FF2.x} y={FF2.y} width={FF2.w} height={FF2.h} type="JK" label="FF₂" />

      {/* ══════════════════════════════════════════════
          EQUATION BADGES
          ══════════════════════════════════════════════ */}
      <EqBadge x={AJ1.x} y={AJ1.y - 15} eq={toBadge('J₁', findEquation(kmaps, 'J₁'), "X'·Q₂")} />
      <EqBadge x={AK1.x} y={AK1.y - 15} eq={toBadge('K₁', findEquation(kmaps, 'K₁'), "X'·Q₁")} />
      <EqBadge x={XJ2.x} y={XJ2.y - 15} eq={toBadge('J₂', findEquation(kmaps, 'J₂'), 'X⊕Q₁')} />
      <EqBadge x={OK2.x} y={OK2.y - 15} eq={toBadge('K₂', findEquation(kmaps, 'K₂'), "X'+Q₁'")} />
      <EqBadge
        x={AZ1.x - 10}
        y={AZ1.y - 15}
        eq={toBadge('Z', findEquation(kmaps, 'Z (Output)'), 
          modelType === 'moore' ? 'Q₁·Q₂' : 'X·Q₂+Q₁·Q₂')}
      />

      {/* Legend */}
      <Legend x={SVG_W - 246} y={SVG_H - 62} />
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   T FLIP-FLOP CIRCUIT (with Moore/Mealy Model Support)
──────────────────────────────────────────────────────────────────────────────*/

const TCircuit: React.FC<{ kmaps: KMap[]; modelType: ModelType }> = ({ kmaps, modelType }) => {
  const SVG_W = 800, SVG_H = 390;

  /* XOR gates */
  const XT1 = { x: 140, y: 110 };
  const XT2 = { x: 140, y: 210 };

  /* Flip-flops */
  const FF1 = { x: 330, y: 90, w: 100, h: 160 };
  const FF2 = { x: 490, y: 90, w: 100, h: 160 };

  /* Z output gates */
  const AZ1 = { x: 640, y: 110 };
  const AZ2 = { x: 640, y: 185 };
  const OZ  = { x: 722, y: 135 };

  /* FF1 pin Y */
  const ff1Ty   = FF1.y + ffPinY('T', 'T',   FF1.h);
  const ff1CLKy = FF1.y + ffPinY('T', 'CLK', FF1.h);
  const ff1Qy   = FF1.y + ffPinY('T', 'Q',   FF1.h);
  const ff1QPy  = FF1.y + ffPinY('T', "Q'",  FF1.h);

  /* FF2 pin Y */
  const ff2Ty   = FF2.y + ffPinY('T', 'T',   FF2.h);
  const ff2CLKy = FF2.y + ffPinY('T', 'CLK', FF2.h);
  const ff2Qy   = FF2.y + ffPinY('T', 'Q',   FF2.h);
  const ff2QPy  = FF2.y + ffPinY('T', "Q'",  FF2.h);

  const xBusY   = 14;
  const q2BusX  = 605;
  const q2TopY  = 10;
  const q1BusX  = 445;
  const q1BotY  = 355;

  return (
    <>
      <SchematicGrid rows={13} cols={21} />

      {/* X bus */}
      <Wire pts={[{ x: 15, y: xBusY }, { x: SVG_W - 30, y: xBusY }]} color={CYAN} w={1.8} />
      <SigLabel x={5} y={xBusY + 4} text="X" color={CYAN} size={13} />

      {/* X → XOR(T1) top */}
      <Wire pts={[
        { x: 243, y: xBusY },
        { x: 243, y: XT1.y + GATE_PIN_TOP },
        { x: XT1.x, y: XT1.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={243} y={xBusY} color={CYAN} />

      {/* X → AND(Z2) top (ONLY for Mealy) */}
      {modelType === 'mealy' && (
        <>
          <Wire pts={[
            { x: AZ2.x + 4 + GATE_PIN_TOP, y: xBusY },
            { x: AZ2.x + 4 + GATE_PIN_TOP, y: AZ2.y + GATE_PIN_TOP },
          ]} color={CYAN} w={1.6} />
          <Dot x={AZ2.x + 4 + GATE_PIN_TOP} y={xBusY} color={CYAN} />
        </>
      )}

      {/* Q2 bus: FF2.Q → right, up to top channel, then left */}
      <Wire pts={[
        { x: FF2.x + FF2.w, y: ff2Qy },
        { x: q2BusX, y: ff2Qy },
      ]} color={WHITE} w={1.8} />
      <SigLabel x={q2BusX + 4} y={ff2Qy + 4} text="Q₂" color={WHITE} size={10} />
      <Wire pts={[{ x: q2BusX, y: ff2Qy }, { x: q2BusX, y: q2TopY }]} color={WHITE} w={1.5} />
      <Dot x={q2BusX} y={ff2Qy} color={WHITE} />
      <Wire pts={[{ x: q2BusX, y: q2TopY }, { x: 152, y: q2TopY }]} color={WHITE} w={1.5} />
      <Dot x={q2BusX} y={q2TopY} color={WHITE} />

      {/* Q2 top → XOR(T1) bot */}
      <Wire pts={[
        { x: 152, y: q2TopY },
        { x: 152, y: XT1.y + GATE_PIN_BOT },
        { x: XT1.x, y: XT1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={152} y={q2TopY} color={WHITE} />

      {/* Q2 top → AND(Z1) bot */}
      <Wire pts={[
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: q2TopY },
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: AZ1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={AZ1.x + 4 + GATE_PIN_BOT} y={q2TopY} color={WHITE} />

      {/* Q2 top → AND(Z2) bot (ONLY for Mealy) */}
      {modelType === 'mealy' && (
        <>
          <Wire pts={[
            { x: AZ2.x + 4 + GATE_PIN_BOT, y: q2TopY },
            { x: AZ2.x + 4 + GATE_PIN_BOT, y: AZ2.y + GATE_PIN_BOT },
          ]} color={WHITE} w={1.5} />
          <Dot x={AZ2.x + 4 + GATE_PIN_BOT} y={q2TopY} color={WHITE} />
        </>
      )}

      {/* Q1 bus: FF1.Q → right, down to bot channel, then left */}
      <Wire pts={[
        { x: FF1.x + FF1.w, y: ff1Qy },
        { x: q1BusX, y: ff1Qy },
      ]} color={WHITE} w={1.8} />
      <SigLabel x={q1BusX + 4} y={ff1Qy + 4} text="Q₁" color={WHITE} size={10} />
      <Wire pts={[{ x: q1BusX, y: ff1Qy }, { x: q1BusX, y: q1BotY }]} color={WHITE} w={1.5} />
      <Dot x={q1BusX} y={ff1Qy} color={WHITE} />
      <Wire pts={[{ x: q1BusX, y: q1BotY }, { x: 152, y: q1BotY }]} color={WHITE} w={1.5} />
      <Dot x={q1BusX} y={q1BotY} color={WHITE} />

      {/* Q1 bot → XOR(T2) bot */}
      <Wire pts={[
        { x: 162, y: q1BotY },
        { x: 162, y: XT2.y + GATE_PIN_BOT },
        { x: XT2.x, y: XT2.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={162} y={q1BotY} color={WHITE} />

      {/* Q1 bot → AND(Z1) top (slightly offset lane) */}
      <Wire pts={[
        { x: q1BusX + 6, y: ff1Qy },
        { x: q1BusX + 6, y: q2TopY + 6 },
        { x: AZ1.x + 4 + GATE_PIN_TOP, y: q2TopY + 6 },
        { x: AZ1.x + 4 + GATE_PIN_TOP, y: AZ1.y + GATE_PIN_TOP },
      ]} color={WHITE} w={1.5} />

      {/* X → XOR(T2) top */}
      <Wire pts={[
        { x: 255, y: xBusY },
        { x: 255, y: XT2.y + GATE_PIN_TOP },
        { x: XT2.x, y: XT2.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={255} y={xBusY} color={CYAN} />

      {/* XOR(T1) → FF1.T */}
      <Wire pts={[
        { x: gOutX(XT1.x) + 2, y: XT1.y + GATE_PIN_OUT },
        { x: FF1.x, y: XT1.y + GATE_PIN_OUT },
        { x: FF1.x, y: ff1Ty },
      ]} color={WHITE} w={1.5} />

      {/* XOR(T2) → FF2.T */}
      <Wire pts={[
        { x: gOutX(XT2.x) + 2, y: XT2.y + GATE_PIN_OUT },
        { x: 454, y: XT2.y + GATE_PIN_OUT },
        { x: 454, y: ff2Ty },
        { x: FF2.x, y: ff2Ty },
      ]} color={WHITE} w={1.5} />

      {/* CLK */}
      <SigLabel x={5} y={ff1CLKy + 3} text="CLK" color={CLKC} size={9} />
      <Wire pts={[{ x: 44, y: ff1CLKy }, { x: FF1.x, y: ff1CLKy }]} color={CLKC} dashed w={1.4} />
      <Wire pts={[
        { x: 44, y: ff1CLKy },
        { x: 44, y: ff2CLKy },
        { x: FF2.x, y: ff2CLKy },
      ]} color={CLKC} dashed w={1.4} />
      <Dot x={44} y={ff1CLKy} color={CLKC} r={2.5} />

      {/* Q' stubs */}
      <Wire pts={[{ x: FF1.x + FF1.w, y: ff1QPy }, { x: FF1.x + FF1.w + 14, y: ff1QPy }]} color={DIMW} w={1.4} />
      <SigLabel x={FF1.x + FF1.w + 16} y={ff1QPy + 3} text="Q₁'" color={DIMW} size={9} />
      <Wire pts={[{ x: FF2.x + FF2.w, y: ff2QPy }, { x: FF2.x + FF2.w + 14, y: ff2QPy }]} color={DIMW} w={1.4} />
      <SigLabel x={FF2.x + FF2.w + 16} y={ff2QPy + 3} text="Q₂'" color={DIMW} size={9} />

      {/* Z network (model-dependent) */}
      {modelType === 'mealy' && (
        <>
          <Wire pts={[
            { x: gOutX(AZ1.x), y: AZ1.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: AZ1.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: OZ.y + GATE_PIN_TOP + 3 },
          ]} color={WHITE} w={1.5} />
          <Wire pts={[
            { x: gOutX(AZ2.x), y: AZ2.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: AZ2.y + GATE_PIN_OUT },
            { x: OZ.x + 4, y: OZ.y + GATE_PIN_BOT + 3 },
          ]} color={WHITE} w={1.5} />

          {/* OR(Z) output → Z label (Mealy only) */}
          <Wire pts={[
            { x: orOutX(OZ.x), y: OZ.y + GATE_PIN_OUT },
            { x: SVG_W - 15, y: OZ.y + GATE_PIN_OUT },
          ]} color={CYAN} w={1.8} />
        </>
      )}

      {/* For Moore: AND(Z1) directly to Z output (no OR gate) */}
      {modelType === 'moore' && (
        <Wire pts={[
          { x: gOutX(AZ1.x), y: AZ1.y + GATE_PIN_OUT },
          { x: SVG_W - 15, y: AZ1.y + GATE_PIN_OUT },
        ]} color={CYAN} w={1.8} />
      )}

      {/* Z label */}
      <SigLabel x={SVG_W - 12} y={modelType === 'moore' ? AZ1.y + GATE_PIN_OUT + 4 : OZ.y + GATE_PIN_OUT + 4} text="Z" color={CYAN} size={14} />

      {/* Gates & FFs */}
      <XorGate x={XT1.x} y={XT1.y} />
      <XorGate x={XT2.x} y={XT2.y} />
      <AndGate x={AZ1.x} y={AZ1.y} />
      {modelType === 'mealy' && (
        <>
          <AndGate x={AZ2.x} y={AZ2.y} />
          <OrGate  x={OZ.x}  y={OZ.y}  />
        </>
      )}
      <FlipFlopBlock x={FF1.x} y={FF1.y} width={FF1.w} height={FF1.h} type="T" label="FF₁" />
      <FlipFlopBlock x={FF2.x} y={FF2.y} width={FF2.w} height={FF2.h} type="T" label="FF₂" />

      {/* Badges */}
      <EqBadge x={XT1.x} y={XT1.y - 15} eq={toBadge('T₁', findEquation(kmaps, 'T₁'), 'X⊕Q₂')} />
      <EqBadge x={XT2.x} y={XT2.y - 15} eq={toBadge('T₂', findEquation(kmaps, 'T₂'), 'X⊕Q₁')} />
      <EqBadge
        x={AZ1.x - 10}
        y={AZ1.y - 15}
        eq={toBadge('Z', findEquation(kmaps, 'Z (Output)'), 
          modelType === 'moore' ? 'Q₁·Q₂' : 'Q₁·Q₂+X·Q₂')}
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
const CircuitSchematic: React.FC<Props> = ({ flipFlopType, modelType, hasData, kmaps }) => {
  const schematicNote = useMemo(() => {
    if (kmaps.length === 0) return null;
    const modelLabel = modelType === 'moore' ? 'Moore' : 'Mealy';
    return `${modelLabel} Model · Gate layout is illustrative · Equation badges reflect your minimized design`;
  }, [kmaps.length, modelType]);

  const svgDimensions = flipFlopType === 'jk' 
    ? { width: 880, height: 460 }
    : { width: 800, height: 390 };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <span className="h-px flex-1 bg-gray-700" />
        Circuit Schematic
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
              {flipFlopType === 'jk' ? (
                <JKCircuit kmaps={kmaps} modelType={modelType} />
              ) : (
                <TCircuit kmaps={kmaps} modelType={modelType} />
              )}
            </SchematicViewer>
            <p className="text-xs text-gray-700 text-center mt-2 italic">
              {schematicNote ??
                'Distinctive-shape symbols · orthogonal routing · feedback paths'}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
              <Cpu size={26} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No circuit generated yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Fill in the state table and click &quot;Generate &amp; Minimize&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitSchematic;
