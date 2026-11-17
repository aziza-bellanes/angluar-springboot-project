/**
 * Studio colour system: one tone per domain, used by the sidebar, KPI cards and charts
 * so a colour always means the same thing (terracotta = artists, gold = exhibitions, …).
 */
export type Tone =
  'artists' | 'exhibitions' | 'artworks' | 'auctions' | 'users' | 'overview' | 'neutral';

export interface ToneStyle {
  /** Solid hex for charts. */
  hex: string;
  /** Gradient tile for KPI icons. */
  tile: string;
  /** Tinted chip for sidebar icons on the dark sidenav. */
  chip: string;
}

export const TONES: Record<Tone, ToneStyle> = {
  overview: {
    hex: '#e7b84b',
    tile: 'bg-gradient-to-br from-[#c99a2e] to-[#f0cd73] text-midnight',
    chip: 'bg-[#e7b84b]/15 text-[#f0cd73]',
  },
  artists: {
    hex: '#c4674a',
    tile: 'bg-gradient-to-br from-[#a85c43] to-[#e3906f] text-white',
    chip: 'bg-[#e3906f]/15 text-[#f0a586]',
  },
  exhibitions: {
    hex: '#d9a53a',
    tile: 'bg-gradient-to-br from-[#c48a1f] to-[#efc35d] text-midnight',
    chip: 'bg-[#efc35d]/15 text-[#f3cf76]',
  },
  artworks: {
    hex: '#4f8a6a',
    tile: 'bg-gradient-to-br from-[#2f6448] to-[#6fae86] text-white',
    chip: 'bg-[#6fae86]/15 text-[#8fcaa3]',
  },
  auctions: {
    hex: '#7d6bc2',
    tile: 'bg-gradient-to-br from-[#5b4b9e] to-[#9b8ae0] text-white',
    chip: 'bg-[#9b8ae0]/15 text-[#b5a8ee]',
  },
  users: {
    hex: '#3f72b5',
    tile: 'bg-gradient-to-br from-[#2b5591] to-[#6a9be0] text-white',
    chip: 'bg-[#6a9be0]/15 text-[#94b9ee]',
  },
  neutral: {
    hex: '#8a8f9c',
    tile: 'bg-gradient-to-br from-[#5d6273] to-[#9aa0ae] text-white',
    chip: 'bg-white/10 text-ivory/80',
  },
};

/** Chart series colours in display order. */
export const SERIES = [
  TONES.artists.hex,
  TONES.exhibitions.hex,
  TONES.artworks.hex,
  TONES.users.hex,
  TONES.auctions.hex,
  TONES.neutral.hex,
];
