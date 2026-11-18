import type { ChartConfiguration, ScriptableContext } from 'chart.js';
import { AuctionStatus, BidActivityPoint, TopArtist } from '@app/core/models/api.models';
import { formatPrice } from '@app/core/util/format';
import { TONES } from '../shared/tones';

export type TrendDirection = 'up' | 'down' | 'flat' | 'new';

export interface Trend {
  direction: TrendDirection;
  /** Absolute percentage rounded to one decimal; 0 for flat/new. */
  percent: number;
  label: string;
}

/** Days shown by the activity chart. */
export type ActivityRange = 7 | 14;

const GOLD = TONES.overview.hex;
const AXIS = 'rgba(244,237,222,0.45)';

/** Week-over-week change between two counters, ready for display. */
export function trendOf(current: number, previous: number): Trend {
  if (current === previous) return { direction: 'flat', percent: 0, label: 'No change' };
  if (previous === 0) return { direction: 'new', percent: 0, label: `+${current}` };
  const percent = Math.round((Math.abs(current - previous) / previous) * 1000) / 10;
  const up = current > previous;
  return { direction: up ? 'up' : 'down', percent, label: `${up ? '▲' : '▼'} ${percent}%` };
}

/** Share of the leading artist's volume (0-100, whole percent). */
export function shareOfTop(artists: TopArtist[]): number[] {
  const top = Math.max(0, ...artists.map((a) => a.volume));
  return artists.map((a) => (top > 0 ? Math.round((a.volume / top) * 100) : 0));
}

export function shortDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

export function compactEuro(value: number): string {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M €`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k €`;
  return `${value} €`;
}

/** Last `range` days of the activity series. */
export function inRange(points: BidActivityPoint[], range: ActivityRange): BidActivityPoint[] {
  return points.slice(-range);
}

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Smallest "round" value at or above `value` (1.2k, 4M…), so the top axis label reads cleanly. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = NICE_STEPS.find((s) => s * magnitude >= value - 1e-9) ?? 10;
  return step * magnitude;
}

/**
 * Daily volume as solid gold bars over a faint full-height track per day, so quiet days still
 * read as days. One axis only; the tooltip gives both the volume and the number of bids.
 */
export function bidActivityConfig(points: BidActivityPoint[]): ChartConfiguration<'bar'> {
  const volumes = points.map((p) => p.volume);
  const ceiling = niceCeiling(Math.max(0, ...volumes) * 1.05);
  return {
    type: 'bar',
    data: {
      labels: points.map((p) => shortDay(p.day)),
      datasets: [
        {
          label: 'Volume',
          data: volumes,
          backgroundColor: (ctx: ScriptableContext<'bar'>) => {
            const { ctx: canvas, chartArea } = ctx.chart;
            if (!chartArea) return GOLD;
            const gradient = canvas.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, '#f3d27e');
            gradient.addColorStop(1, '#c99a2e');
            return gradient;
          },
          hoverBackgroundColor: '#f6dc96',
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 34,
          grouped: false,
          order: 1,
        },
        {
          label: 'Track',
          data: points.map(() => ceiling),
          backgroundColor: 'rgba(244,237,222,0.05)',
          hoverBackgroundColor: 'rgba(244,237,222,0.08)',
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 34,
          grouped: false,
          order: 2,
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#f4edde',
          titleColor: '#101d35',
          bodyColor: '#101d35',
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            label: (item) => {
              const bids = points[item.dataIndex]?.bids ?? 0;
              return [formatPrice(Number(item.parsed.y)), `${bids} ${bids === 1 ? 'bid' : 'bids'}`];
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: AXIS } },
        y: {
          beginAtZero: true,
          max: ceiling,
          grid: { color: 'rgba(244,237,222,0.06)' },
          border: { display: false },
          ticks: { color: AXIS, maxTicksLimit: 5, callback: (value) => compactEuro(Number(value)) },
        },
      },
    },
  };
}

const STATUS_ORDER: AuctionStatus[] = ['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'];
const STATUS_COLOURS: Record<AuctionStatus, string> = {
  SCHEDULED: TONES.users.hex,
  OPEN: TONES.overview.hex,
  CLOSED: TONES.artworks.hex,
  CANCELLED: TONES.neutral.hex,
};

export interface StatusSlice {
  status: AuctionStatus;
  label: string;
  count: number;
  colour: string;
  /** Whole percent of all auctions. */
  percent: number;
}

/** Auctions by status in a fixed order, with colour and share, for the doughnut and its legend. */
export function statusSlices(counts: Partial<Record<AuctionStatus, number>>): StatusSlice[] {
  const total = STATUS_ORDER.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  return STATUS_ORDER.map((status) => {
    const count = counts[status] ?? 0;
    return {
      status,
      label: status.charAt(0) + status.slice(1).toLowerCase(),
      count,
      colour: STATUS_COLOURS[status],
      percent: total ? Math.round((count / total) * 100) : 0,
    };
  });
}

export function auctionsByStatusConfig(slices: StatusSlice[]): ChartConfiguration<'doughnut'> {
  return {
    type: 'doughnut',
    data: {
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.count),
          backgroundColor: slices.map((s) => s.colour),
          hoverOffset: 6,
          borderWidth: 3,
          borderColor: '#fbf8f1',
          borderRadius: 6,
          spacing: 2,
        },
      ],
    },
    options: {
      cutout: '74%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (item) => ` ${item.label}: ${item.parsed}` } },
      },
    },
  };
}

export interface ActivityTotals {
  bids: number;
  volume: number;
  averageBid: number;
  /** Day with the most bids, or null when there were none. */
  busiestDay: string | null;
}

/** Headline figures shown above the bid activity chart. */
export function activityTotals(points: BidActivityPoint[]): ActivityTotals {
  const bids = points.reduce((sum, p) => sum + p.bids, 0);
  const volume = points.reduce((sum, p) => sum + p.volume, 0);
  const busiest = points.reduce<BidActivityPoint | null>(
    (best, p) => (p.bids > (best?.bids ?? 0) ? p : best),
    null,
  );
  return {
    bids,
    volume,
    averageBid: bids ? Math.round(volume / bids) : 0,
    busiestDay: busiest ? shortDay(busiest.day) : null,
  };
}

/** Time-of-day greeting for the studio header. */
export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function bidActivitySummary(points: BidActivityPoint[]): string {
  const bids = points.reduce((sum, p) => sum + p.bids, 0);
  const volume = points.reduce((sum, p) => sum + p.volume, 0);
  return `Bar chart of daily bid volume over the last ${points.length} days: ${bids} bids totalling ${formatPrice(volume)}.`;
}

export function auctionsSummary(slices: StatusSlice[]): string {
  return `Doughnut chart of auctions by status: ${slices.map((s) => `${s.count} ${s.status.toLowerCase()}`).join(', ')}.`;
}
