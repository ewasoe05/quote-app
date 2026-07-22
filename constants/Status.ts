import type { QuoteStatus } from '@/lib/types';

/** Status chip colors tuned for sunlight readability on the truck. */
export const STATUS_COLORS: Record<QuoteStatus, { bg: string; text: string }> = {
  draft: { bg: 'rgba(90,107,125,0.16)', text: '#5A6B7D' },
  sent: { bg: 'rgba(31,111,235,0.16)', text: '#1A5BB8' },
  won: { bg: 'rgba(31,122,63,0.16)', text: '#1F7A3F' },
  lost: { bg: 'rgba(209,26,42,0.14)', text: '#D11A2A' },
};

export const STATUS_COLORS_DARK: Record<
  QuoteStatus,
  { bg: string; text: string }
> = {
  draft: { bg: 'rgba(154,168,181,0.22)', text: '#C5CED6' },
  sent: { bg: 'rgba(31,111,235,0.28)', text: '#8BB4F5' },
  won: { bg: 'rgba(61,220,132,0.22)', text: '#3DDC84' },
  lost: { bg: 'rgba(255,107,111,0.22)', text: '#FF8A8D' },
};
