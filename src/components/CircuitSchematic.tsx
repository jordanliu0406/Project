import React, { useMemo } from 'react';
import { FlipFlopType, KMap } from '../types';
import { Cpu } from 'lucide-react';
import {
  AndGate, OrGate, XorGate, NotGate,
  FlipFlopBlock, ffPinY,
  Wire, Dot, SigLabel,
  GATE_W, GATE_PIN_TOP, GATE_PIN_BOT, GATE_PIN_OUT,
  NOT_W, NOT_PIN_IN, NOT_PIN_OUT,
} from './LogicGates';

interface Props {
  flipFlopType: FlipFlopType;
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
   JK FLIP-FLOP CIRCUIT
   ─────────────────────────────────────────────────────────────────────────────
   Equations (verified against K-Maps):
     J1 = X' · Q0      ← AND gate: inputs = [X', Q0]
     K1 = X' · Q1      ← AND gate: inputs = [X', Q1]
     J0 = X  ⊕ Q1     ← XOR gate: inputs = [X,  Q1]
     K0 = X' + Q1'     ← OR  gate: inputs = [X', NOT(Q1)]
     Z  = X·Q0 + Q1·Q0 ← two ANDs feeding one OR

   Layout columns (left → right):
     Col A  x≈35      NOT(X)  generates X'
     Col B  x≈140     AND(J1), AND(K1)       driven by {X', Q0/Q1}
     Col C  x≈310     FF1 block
     Col D  x≈160     XOR(J0), OR(K0)        between the two FFs (shifted left so wires don't overlap)
              x≈100    NOT(Q1)                below Col A
     Col E  x≈490     FF0 block
     Col F  x≈640     AND(Z1=X·Q0), AND(Z2=Q1·Q0)  then OR(Z)
     Col G  x≈740     OR(Z) output

   Horizontal buses:
     X  bus  y=28     (cyan, entire width)
     X' bus  x=122    vertical (amber, from NOT(X) output downward)
     Q0 bus  x=600    vertical (white) from FF0.Q, goes UP to top channel y=14 then routes left
     Q1 bus  x=420    vertical (white) from FF1.Q, goes DOWN to bot channel y=390 then routes left
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

/* ──────────────────────────────────────────────── */
const JKCircuit: React.FC<{ kmaps: KMap[] }> = ({ kmaps }) => {
  /* ── geometry constants ── */
  const SVG_W = 880, SVG_H = 460;

  /* NOT(X) gate */
  const NX = { x: 30, y: 30 };   // top-left of gate; input pin at (NX.x, NX.y+NOT_PIN_IN)

  /* AND gates for J1, K1 */
  const AJ1 = { x: 140, y: 105 };
  const AK1 = { x: 140, y: 195 };

  /* FF1 */
  const FF1 = { x: 310, y: 90, w: 100, h: 180 };

  /* XOR(J0), OR(K0), NOT(Q1) */
  const XJ0 = { x: 160, y: 295 };
  const OK0 = { x: 160, y: 373 };
  const NQ1 = { x: 65, y: 370 };  // NOT(Q1)

  /* FF0 */
  const FF0 = { x: 490, y: 90, w: 100, h: 180 };

  /* Z output gates */
  const AZ1 = { x: 680, y: 115 };  // AND: X · Q0
  const AZ2 = { x: 680, y: 185 };  // AND: Q1 · Q0
  const OZ  = { x: 762, y: 138 };  // OR combines Z1 and Z2

  /* FF1 pin Y positions */
  const ff1Jy   = FF1.y + ffPinY('JK', 'J',   FF1.h);
  const ff1Ky   = FF1.y + ffPinY('JK', 'K',   FF1.h);
  const ff1CLKy = FF1.y + ffPinY('JK', 'CLK', FF1.h);
  const ff1Qy   = FF1.y + ffPinY('JK', 'Q',   FF1.h);
  const ff1QPy  = FF1.y + ffPinY('JK', "Q'",  FF1.h);

  /* FF0 pin Y positions */
  const ff0Jy   = FF0.y + ffPinY('JK', 'J',   FF0.h);
  const ff0Ky   = FF0.y + ffPinY('JK', 'K',   FF0.h);
  const ff0CLKy = FF0.y + ffPinY('JK', 'CLK', FF0.h);
  const ff0Qy   = FF0.y + ffPinY('JK', 'Q',   FF0.h);
  const ff0QPy  = FF0.y + ffPinY('JK', "Q'",  FF0.h);

  /* Bus rail coordinates */
  const xBusY  = 14;    // X  horizontal bus (cyan) near top
  const xpBusX = 122;   // X' vertical bus (amber)
  const q0BusX = 606;   // Q0 vertical bus right of FF0
  const q0TopY = 10;    // Q0 top channel
  const q1BusX = 418;   // Q1 vertical bus right of FF1
  const q1BotY = 412;   // Q1 bottom channel

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 420 }} fill="none">
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

      {/* X  → XOR(J0) top input */}
      <Wire pts={[
        { x: 358, y: xBusY },
        { x: 358, y: XJ0.y + GATE_PIN_TOP },
        { x: XJ0.x, y: XJ0.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={358} y={xBusY} color={CYAN} />

      {/* X  → AND(Z1) top input */}
      <Wire pts={[
        { x: AZ1.x + 4 + GATE_PIN_TOP, y: xBusY },
        { x: AZ1.x + 4 + GATE_PIN_TOP, y: AZ1.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={AZ1.x + 4 + GATE_PIN_TOP} y={xBusY} color={CYAN} />

      {/* ── X' vertical bus (amber) ── */}
      {/* NOT(X) output → xpBusX rail */}
      <Wire pts={[
        { x: NX.x + NOT_W, y: NX.y + NOT_PIN_OUT },
        { x: xpBusX, y: NX.y + NOT_PIN_OUT },
        { x: xpBusX, y: OK0.y + GATE_PIN_TOP + 3 },
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

      {/* X' rail → OR(K0) top pin (offset +3 for OR shape) */}
      <Wire pts={[
        { x: xpBusX, y: OK0.y + GATE_PIN_TOP + 3 },
        { x: OK0.x + 4, y: OK0.y + GATE_PIN_TOP + 3 },
      ]} color={AMBER} w={1.6} />
      <Dot x={xpBusX} y={OK0.y + GATE_PIN_TOP + 3} color={AMBER} />

      {/* ── Q0 bus (white) – from FF0.Q right, up to top channel, then left ── */}
      {/* FF0.Q → Q0 bus x */}
      <Wire pts={[
        { x: FF0.x + FF0.w, y: ff0Qy },
        { x: q0BusX, y: ff0Qy },
      ]} color={WHITE} w={1.8} />
      <SigLabel x={q0BusX + 4} y={ff0Qy + 4} text="Q₀" color={WHITE} size={10} />

      {/* Q0 up to top channel */}
      <Wire pts={[
        { x: q0BusX, y: ff0Qy },
        { x: q0BusX, y: q0TopY },
      ]} color={WHITE} w={1.5} />
      <Dot x={q0BusX} y={ff0Qy} color={WHITE} />

      {/* top channel: Q0 routes left to AND(J1) bot, AND(Z1) bot, AND(Z2) bot */}
      <Wire pts={[
        { x: q0BusX, y: q0TopY },
        { x: 152, y: q0TopY },
      ]} color={WHITE} w={1.5} />
      <Dot x={q0BusX} y={q0TopY} color={WHITE} />

      {/* drop from top channel → AND(J1) bot pin */}
      <Wire pts={[
        { x: 152, y: q0TopY },
        { x: 152, y: AJ1.y + GATE_PIN_BOT },
        { x: AJ1.x, y: AJ1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={152} y={q0TopY} color={WHITE} />

      {/* drop → AND(Z1) bot */}
      <Wire pts={[
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: q0TopY },
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: AZ1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={AZ1.x + 4 + GATE_PIN_BOT} y={q0TopY} color={WHITE} />

      {/* Q0 also drops → AND(Z2) bot (slightly different x to avoid overlap) */}
      <Wire pts={[
        { x: AZ2.x + 4 + GATE_PIN_BOT, y: q0TopY },
        { x: AZ2.x + 4 + GATE_PIN_BOT, y: AZ2.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={AZ2.x + 4 + GATE_PIN_BOT} y={q0TopY} color={WHITE} />

      {/* ── Q1 bus (white) – from FF1.Q right, down to bot channel, then left ── */}
      <Wire pts={[
        { x: FF1.x + FF1.w, y: ff1Qy },
        { x: q1BusX, y: ff1Qy },
      ]} color={WHITE} w={1.8} />
      <SigLabel x={q1BusX + 4} y={ff1Qy + 4} text="Q₁" color={WHITE} size={10} />

      {/* Q1 down to bot channel */}
      <Wire pts={[
        { x: q1BusX, y: ff1Qy },
        { x: q1BusX, y: q1BotY },
      ]} color={WHITE} w={1.5} />
      <Dot x={q1BusX} y={ff1Qy} color={WHITE} />

      {/* bot channel: Q1 routes left */}
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

      {/* bot channel drop → XOR(J0) bot pin */}
      <Wire pts={[
        { x: 172, y: q1BotY },
        { x: 172, y: XJ0.y + GATE_PIN_BOT },
        { x: XJ0.x, y: XJ0.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={172} y={q1BotY} color={WHITE} />

      {/* bot channel → NOT(Q1) input */}
      <Wire pts={[
        { x: 75, y: q1BotY },
        { x: 75, y: NQ1.y + NOT_PIN_IN },
        { x: NQ1.x, y: NQ1.y + NOT_PIN_IN },
      ]} color={WHITE} w={1.5} />
      <Dot x={75} y={q1BotY} color={WHITE} />

      {/* Q1 also feeds AND(Z2) top (offset lane x = q1BusX+6) */}
      <Wire pts={[
        { x: q1BusX + 6, y: ff1Qy },
        { x: q1BusX + 6, y: q0TopY + 6 },   /* use a slightly lower top channel lane */
        { x: AZ2.x + 4 + GATE_PIN_TOP, y: q0TopY + 6 },
        { x: AZ2.x + 4 + GATE_PIN_TOP, y: AZ2.y + GATE_PIN_TOP },
      ]} color={WHITE} w={1.5} />

      {/* ── NOT(Q1) output → OR(K0) bot pin (amber, Q1') ── */}
      <Wire pts={[
        { x: NQ1.x + NOT_W, y: NQ1.y + NOT_PIN_OUT },
        { x: 135, y: NQ1.y + NOT_PIN_OUT },
        { x: 135, y: OK0.y + GATE_PIN_BOT + 3 },
        { x: OK0.x + 4, y: OK0.y + GATE_PIN_BOT + 3 },
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

      {/* XOR(J0) out → FF0.J (route around FF1) */}
      <Wire pts={[
        { x: gOutX(XJ0.x) + 2, y: XJ0.y + GATE_PIN_OUT },
        { x: 460, y: XJ0.y + GATE_PIN_OUT },
        { x: 460, y: ff0Jy },
        { x: FF0.x, y: ff0Jy },
      ]} color={WHITE} w={1.5} />

      {/* OR(K0) out → FF0.K */}
      <Wire pts={[
        { x: orOutX(OK0.x), y: OK0.y + GATE_PIN_OUT },
        { x: 455, y: OK0.y + GATE_PIN_OUT },
        { x: 455, y: ff0Ky },
        { x: FF0.x, y: ff0Ky },
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
        { x: 44, y: ff0CLKy },
        { x: FF0.x, y: ff0CLKy },
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
        { x: FF0.x + FF0.w, y: ff0QPy },
        { x: FF0.x + FF0.w + 14, y: ff0QPy },
      ]} color={DIMW} w={1.4} />
      <SigLabel x={FF0.x + FF0.w + 16} y={ff0QPy + 3} text="Q₀'" color={DIMW} size={9} />

      {/* ══════════════════════════════════════════════
          Z output network
          ══════════════════════════════════════════════ */}
      {/* AND(Z1) → OR(Z) top */}
      <Wire pts={[
        { x: gOutX(AZ1.x), y: AZ1.y + GATE_PIN_OUT },
        { x: OZ.x + 4, y: AZ1.y + GATE_PIN_OUT },
        { x: OZ.x + 4, y: OZ.y + GATE_PIN_TOP + 3 },
      ]} color={WHITE} w={1.5} />

      {/* AND(Z2) → OR(Z) bot */}
      <Wire pts={[
        { x: gOutX(AZ2.x), y: AZ2.y + GATE_PIN_OUT },
        { x: OZ.x + 4, y: AZ2.y + GATE_PIN_OUT },
        { x: OZ.x + 4, y: OZ.y + GATE_PIN_BOT + 3 },
      ]} color={WHITE} w={1.5} />

      {/* OR(Z) output → Z label */}
      <Wire pts={[
        { x: orOutX(OZ.x), y: OZ.y + GATE_PIN_OUT },
        { x: SVG_W - 15, y: OZ.y + GATE_PIN_OUT },
      ]} color={CYAN} w={1.8} />
      <SigLabel x={SVG_W - 12} y={OZ.y + GATE_PIN_OUT + 4} text="Z" color={CYAN} size={14} />

      {/* ══════════════════════════════════════════════
          DRAW GATES & FFs ON TOP OF WIRES
          ══════════════════════════════════════════════ */}
      <NotGate x={NX.x}  y={NX.y}  />
      <AndGate x={AJ1.x} y={AJ1.y} />
      <AndGate x={AK1.x} y={AK1.y} />
      <XorGate x={XJ0.x} y={XJ0.y} />
      <OrGate  x={OK0.x} y={OK0.y} />
      <NotGate x={NQ1.x} y={NQ1.y} />
      <AndGate x={AZ1.x} y={AZ1.y} />
      <AndGate x={AZ2.x} y={AZ2.y} />
      <OrGate  x={OZ.x}  y={OZ.y}  />

      <FlipFlopBlock x={FF1.x} y={FF1.y} width={FF1.w} height={FF1.h} type="JK" label="FF₁" />
      <FlipFlopBlock x={FF0.x} y={FF0.y} width={FF0.w} height={FF0.h} type="JK" label="FF₀" />

      {/* ══════════════════════════════════════════════
          EQUATION BADGES
          ══════════════════════════════════════════════ */}
      <EqBadge x={AJ1.x} y={AJ1.y - 15} eq={toBadge('J₁', findEquation(kmaps, 'J₁'), "X'·Q₀")} />
      <EqBadge x={AK1.x} y={AK1.y - 15} eq={toBadge('K₁', findEquation(kmaps, 'K₁'), "X'·Q₁")} />
      <EqBadge x={XJ0.x} y={XJ0.y - 15} eq={toBadge('J₀', findEquation(kmaps, 'J₀'), 'X⊕Q₁')} />
      <EqBadge x={OK0.x} y={OK0.y - 15} eq={toBadge('K₀', findEquation(kmaps, 'K₀'), "X'+Q₁'")} />
      <EqBadge
        x={AZ1.x - 10}
        y={AZ1.y - 15}
        eq={toBadge('Z', findEquation(kmaps, 'Z (Output)'), 'X·Q₀+Q₁·Q₀')}
      />

      {/* Legend */}
      <Legend x={SVG_W - 246} y={SVG_H - 62} />
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   T FLIP-FLOP CIRCUIT
   ─────────────────────────────────────────────────────────────────────────────
   Equations:
     T1 = X · Q0' + X' · Q0  =  X ⊕ Q0   (needs to be updated from XOR)
         wait — from K-Map: T1 = X·Q0' + X'·Q0 = X⊕Q0  (checking circuitData)
         circuitData says: T₁ = X · Q₀' + X' · Q₀  (but also equation 'T₁ = X · Q₀\' + X\' · Q₀')
         So T1 = X XOR Q0
     T0 = X ⊕ Q1
     Z  = Q1·Q0 + X·Q0
──────────────────────────────────────────────────────────────────────────────*/

const TCircuit: React.FC<{ kmaps: KMap[] }> = ({ kmaps }) => {
  const SVG_W = 800, SVG_H = 390;

  /* XOR gates */
  const XT1 = { x: 140, y: 110 };  // T1 = X ⊕ Q0
  const XT0 = { x: 140, y: 210 };  // T0 = X ⊕ Q1

  /* Flip-flops */
  const FF1 = { x: 330, y: 90, w: 100, h: 160 };
  const FF0 = { x: 490, y: 90, w: 100, h: 160 };

  /* Z output gates */
  const AZ1 = { x: 640, y: 110 };  // Q1·Q0
  const AZ2 = { x: 640, y: 185 };  // X·Q0
  const OZ  = { x: 722, y: 135 };

  /* FF1 pin Y */
  const ff1Ty   = FF1.y + ffPinY('T', 'T',   FF1.h);
  const ff1CLKy = FF1.y + ffPinY('T', 'CLK', FF1.h);
  const ff1Qy   = FF1.y + ffPinY('T', 'Q',   FF1.h);
  const ff1QPy  = FF1.y + ffPinY('T', "Q'",  FF1.h);

  /* FF0 pin Y */
  const ff0Ty   = FF0.y + ffPinY('T', 'T',   FF0.h);
  const ff0CLKy = FF0.y + ffPinY('T', 'CLK', FF0.h);
  const ff0Qy   = FF0.y + ffPinY('T', 'Q',   FF0.h);
  const ff0QPy  = FF0.y + ffPinY('T', "Q'",  FF0.h);

  const xBusY   = 14;
  const q0BusX  = 605;
  const q0TopY  = 10;
  const q1BusX  = 445;
  const q1BotY  = 355;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 360 }} fill="none">
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

      {/* X → AND(Z2) top */}
      <Wire pts={[
        { x: AZ2.x + 4 + GATE_PIN_TOP, y: xBusY },
        { x: AZ2.x + 4 + GATE_PIN_TOP, y: AZ2.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={AZ2.x + 4 + GATE_PIN_TOP} y={xBusY} color={CYAN} />

      {/* Q0 bus: FF0.Q → right, up to top channel, then left */}
      <Wire pts={[
        { x: FF0.x + FF0.w, y: ff0Qy },
        { x: q0BusX, y: ff0Qy },
      ]} color={WHITE} w={1.8} />
      <SigLabel x={q0BusX + 4} y={ff0Qy + 4} text="Q₀" color={WHITE} size={10} />
      <Wire pts={[{ x: q0BusX, y: ff0Qy }, { x: q0BusX, y: q0TopY }]} color={WHITE} w={1.5} />
      <Dot x={q0BusX} y={ff0Qy} color={WHITE} />
      <Wire pts={[{ x: q0BusX, y: q0TopY }, { x: 152, y: q0TopY }]} color={WHITE} w={1.5} />
      <Dot x={q0BusX} y={q0TopY} color={WHITE} />

      {/* Q0 top → XOR(T1) bot */}
      <Wire pts={[
        { x: 152, y: q0TopY },
        { x: 152, y: XT1.y + GATE_PIN_BOT },
        { x: XT1.x, y: XT1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={152} y={q0TopY} color={WHITE} />

      {/* Q0 top → AND(Z1) bot */}
      <Wire pts={[
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: q0TopY },
        { x: AZ1.x + 4 + GATE_PIN_BOT, y: AZ1.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={AZ1.x + 4 + GATE_PIN_BOT} y={q0TopY} color={WHITE} />

      {/* Q0 top → AND(Z2) bot */}
      <Wire pts={[
        { x: AZ2.x + 4 + GATE_PIN_BOT, y: q0TopY },
        { x: AZ2.x + 4 + GATE_PIN_BOT, y: AZ2.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={AZ2.x + 4 + GATE_PIN_BOT} y={q0TopY} color={WHITE} />

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

      {/* Q1 bot → XOR(T0) bot */}
      <Wire pts={[
        { x: 162, y: q1BotY },
        { x: 162, y: XT0.y + GATE_PIN_BOT },
        { x: XT0.x, y: XT0.y + GATE_PIN_BOT },
      ]} color={WHITE} w={1.5} />
      <Dot x={162} y={q1BotY} color={WHITE} />

      {/* Q1 bot → AND(Z1) top (slightly offset lane) */}
      <Wire pts={[
        { x: q1BusX + 6, y: ff1Qy },
        { x: q1BusX + 6, y: q0TopY + 6 },
        { x: AZ1.x + 4 + GATE_PIN_TOP, y: q0TopY + 6 },
        { x: AZ1.x + 4 + GATE_PIN_TOP, y: AZ1.y + GATE_PIN_TOP },
      ]} color={WHITE} w={1.5} />

      {/* X → XOR(T0) top */}
      <Wire pts={[
        { x: 255, y: xBusY },
        { x: 255, y: XT0.y + GATE_PIN_TOP },
        { x: XT0.x, y: XT0.y + GATE_PIN_TOP },
      ]} color={CYAN} w={1.6} />
      <Dot x={255} y={xBusY} color={CYAN} />

      {/* XOR(T1) → FF1.T */}
      <Wire pts={[
        { x: gOutX(XT1.x) + 2, y: XT1.y + GATE_PIN_OUT },
        { x: FF1.x, y: XT1.y + GATE_PIN_OUT },
        { x: FF1.x, y: ff1Ty },
      ]} color={WHITE} w={1.5} />

      {/* XOR(T0) → FF0.T */}
      <Wire pts={[
        { x: gOutX(XT0.x) + 2, y: XT0.y + GATE_PIN_OUT },
        { x: 454, y: XT0.y + GATE_PIN_OUT },
        { x: 454, y: ff0Ty },
        { x: FF0.x, y: ff0Ty },
      ]} color={WHITE} w={1.5} />

      {/* CLK */}
      <SigLabel x={5} y={ff1CLKy + 3} text="CLK" color={CLKC} size={9} />
      <Wire pts={[{ x: 44, y: ff1CLKy }, { x: FF1.x, y: ff1CLKy }]} color={CLKC} dashed w={1.4} />
      <Wire pts={[
        { x: 44, y: ff1CLKy },
        { x: 44, y: ff0CLKy },
        { x: FF0.x, y: ff0CLKy },
      ]} color={CLKC} dashed w={1.4} />
      <Dot x={44} y={ff1CLKy} color={CLKC} r={2.5} />

      {/* Q' stubs */}
      <Wire pts={[{ x: FF1.x + FF1.w, y: ff1QPy }, { x: FF1.x + FF1.w + 14, y: ff1QPy }]} color={DIMW} w={1.4} />
      <SigLabel x={FF1.x + FF1.w + 16} y={ff1QPy + 3} text="Q₁'" color={DIMW} size={9} />
      <Wire pts={[{ x: FF0.x + FF0.w, y: ff0QPy }, { x: FF0.x + FF0.w + 14, y: ff0QPy }]} color={DIMW} w={1.4} />
      <SigLabel x={FF0.x + FF0.w + 16} y={ff0QPy + 3} text="Q₀'" color={DIMW} size={9} />

      {/* Z network */}
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
      <Wire pts={[
        { x: orOutX(OZ.x), y: OZ.y + GATE_PIN_OUT },
        { x: SVG_W - 15, y: OZ.y + GATE_PIN_OUT },
      ]} color={CYAN} w={1.8} />
      <SigLabel x={SVG_W - 12} y={OZ.y + GATE_PIN_OUT + 4} text="Z" color={CYAN} size={14} />

      {/* Gates & FFs */}
      <XorGate x={XT1.x} y={XT1.y} />
      <XorGate x={XT0.x} y={XT0.y} />
      <AndGate x={AZ1.x} y={AZ1.y} />
      <AndGate x={AZ2.x} y={AZ2.y} />
      <OrGate  x={OZ.x}  y={OZ.y}  />
      <FlipFlopBlock x={FF1.x} y={FF1.y} width={FF1.w} height={FF1.h} type="T" label="FF₁" />
      <FlipFlopBlock x={FF0.x} y={FF0.y} width={FF0.w} height={FF0.h} type="T" label="FF₀" />

      {/* Badges */}
      <EqBadge x={XT1.x} y={XT1.y - 15} eq={toBadge('T₁', findEquation(kmaps, 'T₁'), 'X⊕Q₀')} />
      <EqBadge x={XT0.x} y={XT0.y - 15} eq={toBadge('T₀', findEquation(kmaps, 'T₀'), 'X⊕Q₁')} />
      <EqBadge
        x={AZ1.x - 10}
        y={AZ1.y - 15}
        eq={toBadge('Z', findEquation(kmaps, 'Z (Output)'), 'Q₁·Q₀+X·Q₀')}
      />

      <Legend x={SVG_W - 246} y={SVG_H - 62} />
    </svg>
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
const CircuitSchematic: React.FC<Props> = ({ flipFlopType, hasData, kmaps }) => {
  const schematicNote = useMemo(() => {
    if (kmaps.length === 0) return null;
    return 'Gate layout is illustrative. Equation badges reflect your minimized design.';
  }, [kmaps.length]);

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
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
              MIL-STD-806B
            </span>
          </div>
          <div className="bg-gray-950 rounded-lg p-3 overflow-x-auto">
            {flipFlopType === 'jk' ? (
              <JKCircuit kmaps={kmaps} />
            ) : (
              <TCircuit kmaps={kmaps} />
            )}
          </div>
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
