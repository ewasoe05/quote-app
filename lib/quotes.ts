import { calcQuoteTotals } from './calc';
import {
  isFollowUpDue,
  isFollowUpDueToday,
  toDateInputValue,
} from './quoteDocument';
import { formatCurrency } from './products';
import type { Quote, QuoteItem, QuoteStatus } from './types';
import { QUOTE_STATUS_LABELS } from './types';

export type QuoteListItem = Quote & {
  total: number;
  itemCount: number;
};

export type QuoteListFilter =
  | 'all'
  | 'due_today'
  | 'needs_follow_up'
  | 'templates'
  | QuoteStatus;

export const QUOTE_LIST_FILTERS: QuoteListFilter[] = [
  'all',
  'due_today',
  'needs_follow_up',
  ...(['draft', 'sent', 'won', 'lost'] as QuoteStatus[]),
  'templates',
];

export function getQuoteListFilterLabel(filter: QuoteListFilter): string {
  if (filter === 'all') return 'All';
  if (filter === 'due_today') return 'Due today';
  if (filter === 'needs_follow_up') return 'Needs follow-up';
  if (filter === 'templates') return 'Templates';
  return QUOTE_STATUS_LABELS[filter] ?? filter;
}

/** Active pipeline quotes (not templates, not won/lost). */
export function isOpenQuote(quote: Pick<Quote, 'status' | 'isTemplate'>): boolean {
  return !quote.isTemplate && (quote.status === 'draft' || quote.status === 'sent');
}

export function filterQuoteList(
  quotes: QuoteListItem[],
  filter: QuoteListFilter,
  today = toDateInputValue(new Date())
): QuoteListItem[] {
  if (filter === 'templates') {
    return quotes.filter((quote) => quote.isTemplate);
  }

  const nonTemplates = quotes.filter((quote) => !quote.isTemplate);

  if (filter === 'all') return nonTemplates;
  if (filter === 'due_today') {
    return nonTemplates.filter((quote) =>
      isFollowUpDueToday(quote.followUpDate, today)
    );
  }
  if (filter === 'needs_follow_up') {
    return nonTemplates.filter(
      (quote) => isOpenQuote(quote) && isFollowUpDue(quote.followUpDate, today)
    );
  }
  return nonTemplates.filter((quote) => quote.status === filter);
}

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
