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

export function calculateQuoteSubtotal(items: QuoteItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.priceSnapshot * item.quantity,
    0
  );
}

export function calculateQuoteTotal(
  quote: Pick<Quote, 'discount' | 'taxRate'>,
  items: QuoteItem[]
): number {
  const subtotal = calculateQuoteSubtotal(items);
  const afterDiscount = Math.max(0, subtotal - (quote.discount || 0));
  const tax = afterDiscount * ((quote.taxRate || 0) / 100);
  return afterDiscount + tax;
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
