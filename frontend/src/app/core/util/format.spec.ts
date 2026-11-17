import { describe, expect, it } from 'vitest';
import { formatCountdown, formatPrice } from './format';

describe('formatCountdown', () => {
  it('reports ended when no time remains', () => {
    expect(formatCountdown(0)).toBe('Ended');
    expect(formatCountdown(-5_000)).toBe('Ended');
  });

  it('shows hh:mm:ss under a day', () => {
    const ms = (4 * 3600 + 12 * 60 + 9) * 1000;
    expect(formatCountdown(ms)).toBe('04:12:09');
  });

  it('pads single-digit components', () => {
    expect(formatCountdown(1000)).toBe('00:00:01');
  });

  it('shows "Nd HHh MMm" once a day or more remains', () => {
    const ms = (2 * 86400 + 4 * 3600 + 12 * 60 + 59) * 1000;
    expect(formatCountdown(ms)).toBe('2d 04h 12m');
  });
});

describe('formatPrice', () => {
  it('renders a dash when there is no price', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });

  it('formats an amount in euros with grouping', () => {
    const text = formatPrice(1234);
    expect(text).toContain('1,234');
    expect(text).toContain('€');
  });
});
