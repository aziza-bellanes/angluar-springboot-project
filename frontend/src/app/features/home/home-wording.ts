/** Wording helpers for the homepage statement. Pure functions. */

const NUMBER_WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** "Thirty", "Twenty-four", … up to 99, digits beyond. */
export function inWords(value: number): string {
  if (value < NUMBER_WORDS.length) {
    return NUMBER_WORDS[value];
  }
  if (value < 20) {
    return String(value);
  }
  if (value < 100) {
    const unit = value % 10;
    return TENS[Math.floor(value / 10)] + (unit ? '-' + NUMBER_WORDS[unit].toLowerCase() : '');
  }
  return String(value);
}

/** "Camille Pissarro" → "Pissarro", "Vincent van Gogh" → "Van Gogh". */
export function surname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/** "A, B and C". */
export function listOf(items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}
