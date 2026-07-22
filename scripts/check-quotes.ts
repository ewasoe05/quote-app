import assert from 'node:assert/strict';

import { calculateQuoteTotal, getQuoteStatusLabel } from '../lib/quotes';
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
    descriptionSnapshot: '',
    priceSnapshot: 1000,
    quantity: 1,
  },
  {
    id: '2',
    quoteId: 'q1',
    productId: 'p2',
    nameSnapshot: 'Labor',
    descriptionSnapshot: '',
    priceSnapshot: 200,
    quantity: 2,
  },
];

const flatQuote: Pick<Quote, 'discount' | 'discountType' | 'taxRate'> = {
  discount: 100,
  discountType: 'flat',
  taxRate: 10,
};
assert.equal(calculateQuoteTotal(flatQuote, items), 1430);

const percentQuote: Pick<Quote, 'discount' | 'discountType' | 'taxRate'> = {
  discount: 10,
  discountType: 'percent',
  taxRate: 0,
};
assert.equal(calculateQuoteTotal(percentQuote, items), 1260);

console.log('quote helpers checks passed');
