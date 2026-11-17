import { describe, expect, it } from 'vitest';
import { formation, layoutMetrics } from './riffle-formations';

describe('riffle formations', () => {
  const metrics = layoutMetrics(1440, 900);

  it('keeps card size within readable bounds', () => {
    expect(metrics.cardWidth).toBeGreaterThanOrEqual(140);
    expect(metrics.cardWidth).toBeLessThanOrEqual(260);
    expect(metrics.cardHeight).toBe(Math.round(metrics.cardWidth * 1.25));
  });

  it('opens the fan symmetrically around the centre', () => {
    const first = formation('fan', 0, 11, 5, metrics);
    const last = formation('fan', 10, 11, 5, metrics);
    const middle = formation('fan', 5, 11, 5, metrics);
    expect(first.x).toBeCloseTo(-last.x);
    expect(first.rotationZ).toBeCloseTo(-last.rotationZ);
    expect(middle.x).toBeCloseTo(0);
  });

  it('lays the grid out in at most six columns without overlap', () => {
    const positions = Array.from({ length: 12 }, (_, i) => formation('grid', i, 12, 6, metrics));
    const keys = new Set(positions.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`));
    expect(keys.size).toBe(12);
    expect(new Set(positions.map((p) => Math.round(p.x))).size).toBe(6);
  });

  it('brings the featured painting forward and recedes the others', () => {
    const featured = formation('featured', 6, 12, 6, metrics);
    const other = formation('featured', 2, 12, 6, metrics);
    expect(featured.z).toBeGreaterThan(other.z);
    expect(featured.scale).toBeGreaterThan(other.scale);
    expect(other.opacity).toBeLessThan(1);
  });
});
