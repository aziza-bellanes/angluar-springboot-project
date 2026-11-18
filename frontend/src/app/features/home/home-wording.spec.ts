import { describe, expect, it } from 'vitest';
import { inWords, listOf, surname } from './home-wording';

describe('home page wording helpers', () => {
  it('spells counts in words', () => {
    expect(inWords(0)).toBe('No');
    expect(inWords(6)).toBe('Six');
    expect(inWords(30)).toBe('Thirty');
    expect(inWords(24)).toBe('Twenty-four');
    expect(inWords(15)).toBe('15');
    expect(inWords(120)).toBe('120');
  });

  it('keeps particles with the surname', () => {
    expect(surname('Camille Pissarro')).toBe('Pissarro');
    expect(surname('Vincent van Gogh')).toBe('Van Gogh');
    expect(surname('Pierre-Auguste Renoir')).toBe('Renoir');
    expect(surname('Seurat')).toBe('Seurat');
  });

  it('joins names as a sentence', () => {
    expect(listOf([])).toBe('');
    expect(listOf(['A'])).toBe('A');
    expect(listOf(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
