import { formatCurrency } from './products';
import { formatQuoteNumber } from './quotes';
import type { DiscountType, Quote, QuoteItem } from './types';
import { calcQuoteTotals } from './calc';

/** Calendar date as yyyy-mm-dd in local time. */
export function toDateInputValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Add whole days to today (local) and return yyyy-mm-dd. */
export function validUntilFromDays(days: number, from = new Date()): string | null {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n <= 0) return null;
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + n);
  return toDateInputValue(date);
}

export function normalizeValidUntil(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed;
}

/** Deposit dollars from grand total + deposit fields. */
export function calcDepositAmount(
  grandTotal: number,
  deposit: number,
  depositType: DiscountType
): number {
  const amount = Math.max(0, Number(deposit) || 0);
  if (depositType === 'percent') {
    return Math.round(grandTotal * (amount / 100) * 100) / 100;
  }
  return Math.min(Math.round(amount * 100) / 100, grandTotal);
}

export function buildQuoteShareMessage(input: {
  quote: Quote;
  items: QuoteItem[];
  businessName?: string;
}): string {
  const { quote, items } = input;
  const totals = calcQuoteTotals({
    items,
    discount: quote.discount,
    discountType: quote.discountType ?? 'flat',
    taxRate: quote.taxRate,
  });
  const ref = formatQuoteNumber(quote.quoteNumber) || '';
  const customer = quote.customerName.trim() || 'there';
  const business = input.businessName?.trim();
  const valid = normalizeValidUntil(quote.validUntil);
  const validLabel = valid
    ? new Date(`${valid}T12:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const lines = [
    business
      ? `Hi ${customer}, here's your quote${ref ? ` ${ref}` : ''} from ${business}.`
      : `Hi ${customer}, here's your quote${ref ? ` ${ref}` : ''}.`,
    `Total: ${formatCurrency(totals.grandTotal)}`,
  ];

  if (validLabel) {
    lines.push(`Valid through ${validLabel}.`);
  }

  const depositDue = calcDepositAmount(
    totals.grandTotal,
    quote.deposit ?? 0,
    quote.depositType ?? 'percent'
  );
  if (depositDue > 0) {
    lines.push(`Deposit to schedule: ${formatCurrency(depositDue)}.`);
  }

  lines.push('PDF attached — thank you!');
  return lines.join('\n');
}

export function mapsUrlForAddress(address: string): string {
  const q = encodeURIComponent(address.trim());
  return `https://maps.apple.com/?q=${q}`;
}

export function telUrlForPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}
