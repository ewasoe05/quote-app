import { calcQuoteTotals } from './calc';
import { formatCurrency } from './products';
import type { Quote, QuoteItem, QuoteStatus } from './types';
import { QUOTE_STATUS_LABELS } from './types';

export type QuoteListItem = Quote & {
  total: number;
  itemCount: number;
};

export function getQuoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status] ?? status;
}

export function calculateQuoteTotal(
  quote: Pick<Quote, 'discount' | 'discountType' | 'taxRate'>,
  items: QuoteItem[]
): number {
  return calcQuoteTotals({
    items,
    discount: quote.discount,
    discountType: quote.discountType ?? 'flat',
    taxRate: quote.taxRate,
  }).grandTotal;
}

export function formatQuoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatQuoteTotal(total: number): string {
  return formatCurrency(total);
}

/** Human-readable quote reference, e.g. "#1042". */
export function formatQuoteNumber(quoteNumber: number): string {
  if (!Number.isFinite(quoteNumber) || quoteNumber <= 0) return '';
  return `#${Math.trunc(quoteNumber)}`;
}
