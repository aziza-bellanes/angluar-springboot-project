/**
 * Geometry of the Riffle opening. The collection moves through four formations while the visitor
 * scrolls: an open ring floating in space, a shuffled pile, a receding corridor and a featured
 * painting. Pure functions of the card index and viewport, with no DOM access.
 */

export type FormationName = 'ring' | 'pile' | 'corridor' | 'featured';

export const FORMATIONS: readonly FormationName[] = ['ring', 'pile', 'corridor', 'featured'];

export interface Pose {
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
  /** True below the tablet breakpoint, where formations are tightened. */
  compact: boolean;
}

const CARD_RATIO = 1.22;
const COMPACT_BREAKPOINT = 768;
const RING_START = Math.PI * 1.22;
const RING_SWEEP = Math.PI * 1.62;
const DEG = 180 / Math.PI;

export function layoutMetrics(viewportWidth: number, viewportHeight: number): LayoutMetrics {
  const compact = viewportWidth < COMPACT_BREAKPOINT;
  const byWidth = viewportWidth * (compact ? 0.22 : 0.115);
  const byHeight = viewportHeight * 0.17;
  const cardWidth = Math.round(Math.max(84, Math.min(byWidth, byHeight, 190)));
  return {
    viewportWidth,
    viewportHeight,
    cardWidth,
    cardHeight: Math.round(cardWidth * CARD_RATIO),
    compact,
  };
}

/** Largest scale any formation uses; cards are rendered at this size so they stay sharp. */
export const RENDER_SCALE = 2.35;

/** Deterministic -1 … 1 jitter so every card has its own character, identically on every render. */
export function jitter(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

/** 0 … 1 position of a card through the set. */
function progress(index: number, count: number): number {
  return count <= 1 ? 0 : index / (count - 1);
}

export function formation(
  name: FormationName,
  index: number,
  count: number,
  m: LayoutMetrics,
): Pose {
  switch (name) {
    case 'ring':
      return ring(index, count, m);
    case 'pile':
      return pile(index, count, m);
    case 'corridor':
      return corridor(index, count, m);
    case 'featured':
      return featured(index, count, m);
  }
}

/**
 * An open ring that starts close to the viewer at the lower left, arcs over the top and recedes
 * down the right-hand side.
 */
function ring(index: number, count: number, m: LayoutMetrics): Pose {
  const t = progress(index, count);
  const angle = RING_START - t * RING_SWEEP;
  // A slightly wide ellipse reads as a ring seen in perspective.
  const radiusY = m.viewportHeight * (m.compact ? 0.24 : 0.31);
  const radiusX = Math.min(m.viewportWidth * (m.compact ? 0.36 : 0.3), radiusY * 1.45);
  const x = Math.cos(angle) * radiusX;
  const y = -Math.sin(angle) * radiusY;
  return {
    x,
    y: y + m.viewportHeight * 0.05,
    z: (0.5 - t) * 420,
    rotationX: 8,
    rotationY: (-x / radiusX) * 18,
    rotationZ: jitter(index) * 9 - (x / radiusX) * 6,
    scale: 1.18 - t * 0.38,
    opacity: 1,
  };
}

/** The collection gathered into a single shuffled pile, the first card on top. */
function pile(index: number, count: number, m: LayoutMetrics): Pose {
  const t = progress(index, count);
  return {
    x: jitter(index + 3) * m.cardWidth * 0.12 + t * m.cardWidth * 0.18,
    y: -t * m.cardHeight * 0.16 + m.viewportHeight * 0.02,
    z: (count - index) * 4,
    rotationX: 6,
    rotationY: 0,
    rotationZ: jitter(index + 11) * 8 + t * 14,
    scale: 1.2,
    opacity: 1,
  };
}

/** A deep diagonal corridor: the first card nearest at the lower right, the last far at the top left. */
function corridor(index: number, count: number, m: LayoutMetrics): Pose {
  const t = progress(index, count);
  const spanX = m.viewportWidth * (m.compact ? 0.32 : 0.36);
  const spanY = m.viewportHeight * 0.36;
  return {
    x: spanX * (0.45 - t * 1.45),
    y: spanY * (0.6 - t * 1.6),
    z: 160 - t * 900,
    rotationX: 10,
    rotationY: -24,
    rotationZ: -4,
    scale: 1.25,
    opacity: Math.max(0.25, 1 - t * 0.5),
  };
}

/** The first painting comes forward; the corridor sinks back behind it. */
function featured(index: number, count: number, m: LayoutMetrics): Pose {
  if (index === 0) {
    return {
      x: m.compact ? 0 : m.viewportWidth * 0.16,
      y: m.compact ? -m.viewportHeight * 0.08 : -m.viewportHeight * 0.01,
      z: 200,
      rotationX: 0,
      rotationY: m.compact ? 0 : -10,
      rotationZ: 0,
      scale: m.compact ? 2 : 2.35,
      opacity: 1,
    };
  }
  const back = corridor(index, count, m);
  return {
    ...back,
    x: back.x - m.viewportWidth * 0.12,
    z: back.z - 700,
    opacity: back.opacity * 0.45,
  };
}

/** Angle of a card along the ring, in degrees. */
export function ringAngle(index: number, count: number): number {
  return (RING_START - progress(index, count) * RING_SWEEP) * DEG;
}
