import type { DiscountType } from './types';

export type { DiscountType };

export type LineAmount = {
  priceSnapshot: number;
  quantity: number;
};

export type QuoteCalcInput = {
  items: LineAmount[];
  discount: number;
  discountType: DiscountType;
  taxRate: number;
};

export type QuoteTotals = {
  subtotal: number;
  discountAmount: number;
  taxable: number;
  tax: number;
  grandTotal: number;
};

/** Round half-up to the nearest cent. */
export function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calcSubtotal(items: LineAmount[]): number {
  const raw = items.reduce(
    (sum, item) => sum + item.priceSnapshot * item.quantity,
    0
  );
  return roundToCents(raw);
}

export function calcDiscountAmount(
  subtotal: number,
  discount: number,
  discountType: DiscountType
): number {
  const value = Math.max(0, discount || 0);
  if (value === 0 || subtotal <= 0) return 0;

  if (discountType === 'percent') {
    const pct = Math.min(value, 100);
    return roundToCents(subtotal * (pct / 100));
  }

  return roundToCents(Math.min(value, subtotal));
}

export function calcTax(taxable: number, taxRate: number): number {
  const rate = Math.max(0, taxRate || 0);
  if (taxable <= 0 || rate === 0) return 0;
  return roundToCents(taxable * (rate / 100));
}

export function calcQuoteTotals(input: QuoteCalcInput): QuoteTotals {
  const subtotal = calcSubtotal(input.items);
  const discountAmount = calcDiscountAmount(
    subtotal,
    input.discount,
    input.discountType
  );
  const taxable = roundToCents(Math.max(0, subtotal - discountAmount));
  const tax = calcTax(taxable, input.taxRate);
  const grandTotal = roundToCents(taxable + tax);

  return {
    subtotal,
    discountAmount,
    taxable,
    tax,
    grandTotal,
  };
}
