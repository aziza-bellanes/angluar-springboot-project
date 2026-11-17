import type { ChartConfiguration, ScriptableContext } from 'chart.js';
import { AuctionStatus, BidActivityPoint, TopArtist } from '@app/core/models/api.models';
import { formatPrice } from '@app/core/util/format';

export type TrendDirection = 'up' | 'down' | 'flat' | 'new';

export interface Trend {
  direction: TrendDirection;
  /** Absolute percentage rounded to one decimal; 0 for flat/new. */
  percent: number;
  label: string;
}

export type BidMetric = 'volume' | 'bids';

const SUNFLOWER = '#e7b84b';
const COBALT = '#315c91';

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

export function bidActivityConfig(
  points: BidActivityPoint[],
  metric: BidMetric,
): ChartConfiguration<'line'> {
  const isVolume = metric === 'volume';
  return {
    type: 'line',
    data: {
      labels: points.map((p) => shortDay(p.day)),
      datasets: [
        {
          label: isVolume ? 'Bid volume' : 'Bids',
          data: points.map((p) => (isVolume ? p.volume : p.bids)),
          borderColor: SUNFLOWER,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: SUNFLOWER,
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const { ctx: canvas, chartArea } = ctx.chart;
            if (!chartArea) return 'rgba(231,184,75,0.2)';
            const gradient = canvas.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(231,184,75,0.35)');
            gradient.addColorStop(1, 'rgba(231,184,75,0)');
            return gradient;
          },
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => (isVolume ? formatPrice(item.parsed.y) : `${item.parsed.y} bids`),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: 'rgba(244,237,222,0.4)', maxTicksLimit: 7 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(244,237,222,0.08)' },
          border: { display: false },
          ticks: {
            color: 'rgba(244,237,222,0.4)',
            precision: 0,
            maxTicksLimit: 5,
            callback: (value) => (isVolume ? compactEuro(Number(value)) : String(value)),
          },
        },
      },
    },
  };
}

const STATUS_ORDER: AuctionStatus[] = ['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'];

export function auctionsByStatusConfig(
  counts: Record<AuctionStatus, number>,
): ChartConfiguration<'bar'> {
  return {
    type: 'bar',
    data: {
      labels: STATUS_ORDER.map((s) => s.charAt(0) + s.slice(1).toLowerCase()),
      datasets: [
        {
          label: 'Auctions',
          data: STATUS_ORDER.map((s) => counts[s] ?? 0),
          backgroundColor: STATUS_ORDER.map((s) => (s === 'OPEN' ? SUNFLOWER : COBALT)),
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 36,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#5d6273' } },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: 'rgba(27,34,56,0.08)' },
          ticks: { color: '#5d6273', precision: 0, maxTicksLimit: 5 },
        },
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
  return `Line chart of bid activity over the last ${points.length} days: ${bids} bids totalling ${formatPrice(volume)}.`;
}

export function auctionsSummary(counts: Record<AuctionStatus, number>): string {
  return `Bar chart of auctions by status: ${STATUS_ORDER.map((s) => `${counts[s] ?? 0} ${s.toLowerCase()}`).join(', ')}.`;
}
