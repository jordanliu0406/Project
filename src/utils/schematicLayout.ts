/**
 * Schematic Layout Engine
 * 
 * Provides structured layout and routing for sequential circuit schematics.
 * Organizes components into layers and manages orthogonal wire routing.
 */

export interface LayerConfig {
  name: string;
  y: number;
  height: number;
  components: string[];
}

export interface LayoutContext {
  svgWidth: number;
  svgHeight: number;
  layers: LayerConfig[];
  busLines: { [key: string]: number };
  gateSpacing: number;
}

/**
 * Create a standard layout context for JK Flip-Flop circuits
 */
export function createJKLayoutContext(svgWidth: number, svgHeight: number): LayoutContext {
  return {
    svgWidth,
    svgHeight,
    gateSpacing: 70,
    layers: [
      {
        name: 'Input Signals',
        y: 0,
        height: 50,
        components: ['X', "X'", 'Q₁', 'Q₂', "Q₁'", "Q₂'"],
      },
      {
        name: 'J/K Logic',
        y: 50,
        height: 150,
        components: ['J₁ Logic', 'K₁ Logic', 'J₂ Logic', 'K₂ Logic'],
      },
      {
        name: 'Flip-Flops',
        y: 200,
        height: 180,
        components: ['FF₁', 'FF₂'],
      },
      {
        name: 'Output Logic',
        y: 380,
        height: 80,
        components: ['Z Logic'],
      },
    ],
    busLines: {
      'X': 14,
      "X'": 40,
      'Q₁': 300,
      'Q₂': 320,
      "Q₁'": 340,
      "Q₂'": 360,
    },
  };
}

/**
 * Create a standard layout context for T Flip-Flop circuits
 */
export function createTLayoutContext(svgWidth: number, svgHeight: number): LayoutContext {
  return {
    svgWidth,
    svgHeight,
    gateSpacing: 60,
    layers: [
      {
        name: 'Input Signals',
        y: 0,
        height: 40,
        components: ['X', 'Q₁', 'Q₂', "Q₁'", "Q₂'"],
      },
      {
        name: 'T Logic',
        y: 40,
        height: 140,
        components: ['T₁ Logic', 'T₂ Logic'],
      },
      {
        name: 'Flip-Flops',
        y: 180,
        height: 160,
        components: ['FF₁', 'FF₂'],
      },
      {
        name: 'Output Logic',
        y: 340,
        height: 50,
        components: ['Z Logic'],
      },
    ],
    busLines: {
      'X': 14,
      'Q₁': 280,
      'Q₂': 300,
      "Q₁'": 320,
      "Q₂'": 340,
    },
  };
}

/**
 * Calculate optimal horizontal position for a gate within a layer
 */
export function calculateGateX(
  gateIndex: number,
  totalGates: number,
  layerWidth: number,
  gateWidth: number = 60
): number {
  const padding = 40;
  const availableWidth = layerWidth - padding * 2;
  const spacing = availableWidth / (totalGates + 1);
  return padding + spacing * (gateIndex + 1) - gateWidth / 2;
}

/**
 * Generate orthogonal wire path between two points
 */
export function generateOrthogonalPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  preferVerticalFirst: boolean = true
): { x: number; y: number }[] {
  if (preferVerticalFirst) {
    return [
      from,
      { x: from.x, y: to.y },
      to,
    ];
  } else {
    return [
      from,
      { x: to.x, y: from.y },
      to,
    ];
  }
}

/**
 * Calculate wire junction points to minimize crossings
 */
export function calculateWireJunctions(
  source: { x: number; y: number },
  targets: { x: number; y: number }[],
  busY: number
): { x: number; y: number }[] {
  // Route through a common bus line
  const junctions: { x: number; y: number }[] = [
    source,
    { x: source.x, y: busY },
  ];

  for (const target of targets) {
    junctions.push({ x: target.x, y: busY });
    junctions.push(target);
  }

  return junctions;
}

/**
 * Get layer by name
 */
export function getLayer(context: LayoutContext, layerName: string): LayerConfig | undefined {
  return context.layers.find(l => l.name === layerName);
}

/**
 * Calculate total schematic height based on layers
 */
export function calculateTotalHeight(context: LayoutContext): number {
  const lastLayer = context.layers[context.layers.length - 1];
  return lastLayer ? lastLayer.y + lastLayer.height : context.svgHeight;
}
