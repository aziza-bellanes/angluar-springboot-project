import { describe, expect, it } from 'vitest';
import { FORMATIONS, formation, jitter, layoutMetrics, ringAngle } from './riffle-formations';

describe('riffle formations', () => {
  const desktop = layoutMetrics(1440, 900);
  const phone = layoutMetrics(390, 844);
  const count = 20;

  it('keeps cards readable and compact on phones', () => {
    for (const m of [desktop, phone]) {
      expect(m.cardWidth).toBeGreaterThanOrEqual(84);
      expect(m.cardWidth).toBeLessThanOrEqual(190);
      expect(m.cardHeight).toBe(Math.round(m.cardWidth * 1.22));
    }
    expect(phone.compact).toBe(true);
    expect(desktop.compact).toBe(false);
  });

  it('jitter is deterministic and bounded', () => {
    for (let i = 0; i < 40; i++) {
      expect(jitter(i)).toBe(jitter(i));
      expect(Math.abs(jitter(i))).toBeLessThanOrEqual(1);
    }
  });

  it('opens the ring near the viewer at the lower left and recedes along the arc', () => {
    const first = formation('ring', 0, count, desktop);
    const last = formation('ring', count - 1, count, desktop);
    expect(first.x).toBeLessThan(0);
    expect(first.y).toBeGreaterThan(0);
    expect(first.z).toBeGreaterThan(last.z);
    expect(first.scale).toBeGreaterThan(last.scale);
    expect(ringAngle(0, count)).toBeGreaterThan(ringAngle(count - 1, count));
  });

  it('puts the first card on top of the pile', () => {
    const zs = Array.from({ length: count }, (_, i) => formation('pile', i, count, desktop).z);
    expect(Math.max(...zs)).toBe(zs[0]);
  });

  it('runs the corridor from near lower right to far upper left', () => {
    const near = formation('corridor', 0, count, desktop);
    const far = formation('corridor', count - 1, count, desktop);
    expect(near.x).toBeGreaterThan(far.x);
    expect(near.y).toBeGreaterThan(far.y);
    expect(near.z).toBeGreaterThan(far.z);
  });

  it('features the first painting in front of every other card', () => {
    const hero = formation('featured', 0, count, desktop);
    for (let i = 1; i < count; i++) {
      const other = formation('featured', i, count, desktop);
      expect(other.z).toBeLessThan(hero.z);
      expect(other.opacity).toBeLessThan(1);
    }
  });

  it('produces finite poses for every formation and size', () => {
    for (const name of FORMATIONS) {
      for (const m of [desktop, phone]) {
        for (let i = 0; i < count; i++) {
          Object.values(formation(name, i, count, m)).forEach((value) =>
            expect(Number.isFinite(value)).toBe(true),
          );
        }
      }
    }
  });
});
