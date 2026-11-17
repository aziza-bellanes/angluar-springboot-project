/** Geometry of the four Riffle formations. Pure functions, unit tested, no DOM access. */

export type FormationName = 'fan' | 'deck' | 'grid' | 'featured';

export interface Formation {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  opacity: number;
}

export interface LayoutMetrics {
  viewportWidth: number;
  viewportHeight: number;
  cardWidth: number;
  cardHeight: number;
}

const CARD_RATIO = 1.25;
const GRID_COLUMNS = 6;
const GRID_SCALE = 0.72;
const GRID_GAP = 22;

export function layoutMetrics(viewportWidth: number, viewportHeight: number): LayoutMetrics {
  const byWidth = viewportWidth * 0.14;
  const byHeight = (viewportHeight * 0.42) / CARD_RATIO;
  const cardWidth = Math.round(Math.max(140, Math.min(byWidth, byHeight, 260)));
  return { viewportWidth, viewportHeight, cardWidth, cardHeight: Math.round(cardWidth * CARD_RATIO) };
}

export function formation(
  name: FormationName,
  index: number,
  count: number,
  featuredIndex: number,
  m: LayoutMetrics,
): Formation {
  switch (name) {
    case 'fan':
      return fan(index, count, m);
    case 'deck':
      return deck(index, count, m);
    case 'grid':
      return grid(index, count, m);
    case 'featured':
      return featured(index, featuredIndex, m);
  }
}

/** -1 … 1 position of a card across the set. */
function spread(index: number, count: number): number {
  return count <= 1 ? 0 : (index / (count - 1)) * 2 - 1;
}

/** A curved fan opening along a three-dimensional arc. */
function fan(index: number, count: number, m: LayoutMetrics): Formation {
  const t = spread(index, count);
  return {
    x: t * m.viewportWidth * 0.36,
    y: t * t * m.viewportHeight * 0.12 - m.viewportHeight * 0.06,
    z: -Math.abs(t) * 240,
    rotationX: 0,
    rotationY: -t * 26,
    rotationZ: t * 12,
    scale: 1,
    opacity: 1,
  };
}

/** A tilted cascading deck, like canvases leaning against the studio wall. */
function deck(index: number, count: number, m: LayoutMetrics): Formation {
  const offset = index - (count - 1) / 2;
  return {
    x: offset * m.cardWidth * 0.34 + m.viewportWidth * 0.08,
    y: -offset * m.cardHeight * 0.05 - m.viewportHeight * 0.04,
    z: -offset * 30,
    rotationX: 10,
    rotationY: -38,
    rotationZ: -4,
    scale: 1.05,
    opacity: 1,
  };
}

/** An organised gallery wall. */
function grid(index: number, count: number, m: LayoutMetrics): Formation {
  const columns = Math.min(GRID_COLUMNS, count);
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const cellWidth = m.cardWidth * GRID_SCALE + GRID_GAP;
  const cellHeight = m.cardHeight * GRID_SCALE + GRID_GAP;
  return {
    x: (column - (columns - 1) / 2) * cellWidth,
    y: (row - (rows - 1) / 2) * cellHeight - m.viewportHeight * 0.08,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: GRID_SCALE,
    opacity: 1,
  };
}

/** One painting comes forward, the others recede. */
function featured(index: number, featuredIndex: number, m: LayoutMetrics): Formation {
  if (index === featuredIndex) {
    return {
      x: m.viewportWidth * 0.14,
      y: m.viewportHeight * 0.04,
      z: 240,
      rotationX: 0,
      rotationY: -8,
      rotationZ: 0,
      scale: 1.35,
      opacity: 1,
    };
  }
  const distance = index - featuredIndex;
  const side = Math.sign(distance);
  return {
    x: side * m.viewportWidth * 0.3 + distance * m.cardWidth * 0.35 + m.viewportWidth * 0.14,
    y: m.viewportHeight * 0.06,
    z: -700 - Math.abs(distance) * 40,
    rotationX: 0,
    rotationY: side * 30,
    rotationZ: 0,
    scale: 0.85,
    opacity: Math.max(0.12, 0.45 - Math.abs(distance) * 0.06),
  };
}
