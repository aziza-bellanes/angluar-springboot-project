import { describe, expect, it } from 'vitest';
import { auctionsByStatusConfig, bidActivityConfig, compactEuro, shareOfTop, shortDay, trendOf } from './overview-metrics';

describe('overview metrics', () => {
  it('computes upward and downward trends', () => {
    expect(trendOf(9, 8)).toEqual({ direction: 'up', percent: 12.5, label: '▲ 12.5%' });
    expect(trendOf(3, 4)).toEqual({ direction: 'down', percent: 25, label: '▼ 25%' });
  });

  it('handles equal and new values', () => {
    expect(trendOf(0, 0).label).toBe('No change');
    expect(trendOf(5, 5).direction).toBe('flat');
    expect(trendOf(2, 0)).toMatchObject({ direction: 'new', label: 'New' });
  });

  it('computes shares relative to the top artist', () => {
    const artist = (volume: number) => ({ artistId: 1, name: 'A', bids: 1, volume });
    expect(shareOfTop([artist(200), artist(50), artist(0)])).toEqual([100, 25, 0]);
    expect(shareOfTop([])).toEqual([]);
    expect(shareOfTop([artist(0)])).toEqual([0]);
  });

  it('compacts euro ticks', () => {
    expect([compactEuro(900), compactEuro(2500), compactEuro(4300000)]).toEqual(['900 €', '2.5k €', '4.3M €']);
  });

  it('formats days', () => {
    expect(shortDay('2026-11-04')).toBe('04/11');
  });

  it('builds the line dataset for each metric', () => {
    const points = [{ day: '2026-11-04', bids: 3, volume: 1200 }, { day: '2026-11-05', bids: 1, volume: 300 }];
    expect(bidActivityConfig(points, 'volume').data.datasets[0].data).toEqual([1200, 300]);
    expect(bidActivityConfig(points, 'bids').data.datasets[0].data).toEqual([3, 1]);
    expect(bidActivityConfig(points, 'bids').data.labels).toEqual(['04/11', '05/11']);
  });

  it('builds the status bars in a fixed order with OPEN highlighted', () => {
    const cfg = auctionsByStatusConfig({ SCHEDULED: 1, OPEN: 6, CLOSED: 2, CANCELLED: 0 });
    expect(cfg.data.datasets[0].data).toEqual([1, 6, 2, 0]);
    expect((cfg.data.datasets[0].backgroundColor as string[])[1]).toBe('#e7b84b');
  });
});
