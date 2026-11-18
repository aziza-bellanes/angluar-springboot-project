const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' });

/** Demonstration currency: prices are displayed in euros. */
export const formatPrice = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : currency.format(value);

export const formatDateTime = (iso: string | null | undefined): string => (iso ? dateTime.format(new Date(iso)) : '—');

export const formatDate = (iso: string | null | undefined): string => (iso ? date.format(new Date(iso)) : '—');

/** "2d 04h 12m" / "04:12:09" countdown text for a remaining duration in milliseconds. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return 'Ended';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
