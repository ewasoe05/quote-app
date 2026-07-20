import assert from 'node:assert/strict';

import {
  calculateQuoteSubtotal,
  calculateQuoteTotal,
  formatQuoteDate,
  getQuoteStatusLabel,
} from '../lib/quotes';
import type { Quote, QuoteItem } from '../lib/types';
import { QUOTE_STATUS_LABELS } from '../lib/types';

assert.deepEqual(Object.values(QUOTE_STATUS_LABELS), [
  'Draft',
  'Sent',
  'Won',
  'Lost',
]);
assert.equal(getQuoteStatusLabel('won'), 'Won');

const items: QuoteItem[] = [
  {
    id: '1',
    quoteId: 'q1',
    productId: 'p1',
    nameSnapshot: 'Softener',
    priceSnapshot: 1000,
    quantity: 1,
  },
  {
    id: '2',
    quoteId: 'q1',
    productId: 'p2',
    nameSnapshot: 'Labor',
    priceSnapshot: 200,
    quantity: 2,
  },
];

assert.equal(calculateQuoteSubtotal(items), 1400);

const quote: Pick<Quote, 'discount' | 'taxRate'> = {
  discount: 100,
  taxRate: 10,
};
assert.equal(calculateQuoteTotal(quote, items), 1430); // (1400-100)*1.10
assert.equal(formatQuoteDate('2026-07-20T12:00:00.000Z').includes('2026'), true);

console.log('quote helpers checks passed');
