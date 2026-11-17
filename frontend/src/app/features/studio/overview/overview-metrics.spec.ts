import { describe, expect, it } from 'vitest';
import {
  activityTotals,
  auctionsByStatusConfig,
  greeting,
  inRange,
  niceCeiling,
  statusSlices,
  bidActivityConfig,
  compactEuro,
  shareOfTop,
  shortDay,
  trendOf,
} from './overview-metrics';

describe('overview metrics', () => {
  it('computes upward and downward trends', () => {
    expect(trendOf(9, 8)).toEqual({ direction: 'up', percent: 12.5, label: '▲ 12.5%' });
    expect(trendOf(3, 4)).toEqual({ direction: 'down', percent: 25, label: '▼ 25%' });
  });

  it('handles equal and new values', () => {
    expect(trendOf(0, 0).label).toBe('No change');
    expect(trendOf(5, 5).direction).toBe('flat');
    expect(trendOf(2, 0)).toMatchObject({ direction: 'new', label: '+2' });
  });

  it('computes shares relative to the top artist', () => {
    const artist = (volume: number) => ({ artistId: 1, name: 'A', bids: 1, volume });
    expect(shareOfTop([artist(200), artist(50), artist(0)])).toEqual([100, 25, 0]);
    expect(shareOfTop([])).toEqual([]);
    expect(shareOfTop([artist(0)])).toEqual([0]);
  });

  it('compacts euro ticks', () => {
    expect([compactEuro(900), compactEuro(2500), compactEuro(4300000)]).toEqual([
      '900 €',
      '2.5k €',
      '4.3M €',
    ]);
  });

  it('formats days', () => {
    expect(shortDay('2026-11-04')).toBe('04/11');
  });

  it('draws daily volume over a full-height track', () => {
    const points = [
      { day: '2026-11-04', bids: 3, volume: 1000 },
      { day: '2026-11-05', bids: 0, volume: 0 },
    ];
    const cfg = bidActivityConfig(points);
    const [volume, track] = cfg.data.datasets;
    expect(cfg.data.labels).toEqual(['04/11', '05/11']);
    expect(volume.data).toEqual([1000, 0]);
    expect(track.data).toEqual([1200, 1200]);
    expect(cfg.options?.scales?.['y']?.max).toBe(1200);
  });

  it('rounds the axis ceiling to a clean value', () => {
    expect([niceCeiling(1050), niceCeiling(3_470_000), niceCeiling(7), niceCeiling(0)]).toEqual([
      1200, 4_000_000, 8, 1,
    ]);
  });

  it('keeps an axis when there is no volume at all', () => {
    const cfg = bidActivityConfig([{ day: '2026-11-04', bids: 0, volume: 0 }]);
    expect(cfg.data.datasets[1].data).toEqual([1]);
  });

  it('keeps the most recent days of a range', () => {
    const points = Array.from({ length: 14 }, (_, i) => ({
      day: `2026-11-${String(i + 1).padStart(2, '0')}`,
      bids: i,
      volume: i,
    }));
    expect(inRange(points, 7).map((p) => p.bids)).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(inRange(points, 14)).toHaveLength(14);
  });

  it('slices auctions by status in a fixed order with shares', () => {
    const slices = statusSlices({ SCHEDULED: 1, OPEN: 6, CLOSED: 3 });
    expect(slices.map((s) => [s.label, s.count, s.percent])).toEqual([
      ['Scheduled', 1, 10],
      ['Open', 6, 60],
      ['Closed', 3, 30],
      ['Cancelled', 0, 0],
    ]);
    expect(statusSlices({}).every((s) => s.percent === 0)).toBe(true);
    const cfg = auctionsByStatusConfig(slices);
    expect(cfg.data.datasets[0].data).toEqual([1, 6, 3, 0]);
    expect(cfg.data.datasets[0].backgroundColor).toEqual(slices.map((s) => s.colour));
  });
});

describe('activity headline', () => {
  it('totals bids and volume and finds the busiest day', () => {
    const totals = activityTotals([
      { day: '2026-11-15', bids: 1, volume: 1000 },
      { day: '2026-11-16', bids: 3, volume: 5000 },
      { day: '2026-11-17', bids: 0, volume: 0 },
    ]);
    expect(totals).toEqual({ bids: 4, volume: 6000, averageBid: 1500, busiestDay: '16/11' });
  });

  it('handles a quiet fortnight', () => {
    expect(activityTotals([{ day: '2026-11-17', bids: 0, volume: 0 }])).toEqual({
      bids: 0,
      volume: 0,
      averageBid: 0,
      busiestDay: null,
    });
  });

  it('greets by time of day', () => {
    expect(greeting(8)).toBe('Good morning');
    expect(greeting(14)).toBe('Good afternoon');
    expect(greeting(21)).toBe('Good evening');
  });
});
