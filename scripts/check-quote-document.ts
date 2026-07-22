import assert from 'node:assert/strict';

import {
  buildQuoteShareMessage,
  calcDepositAmount,
  mapsUrlForAddress,
  normalizeValidUntil,
  telUrlForPhone,
  toDateInputValue,
  validUntilFromDays,
} from '../lib/quoteDocument';
import type { Quote, QuoteItem } from '../lib/types';

assert.equal(normalizeValidUntil('2026-07-27'), '2026-07-27');
assert.equal(normalizeValidUntil(' 2026-07-27 '), '2026-07-27');
assert.equal(normalizeValidUntil('07/27/2026'), null);
assert.equal(normalizeValidUntil(''), null);
assert.equal(normalizeValidUntil(null), null);

assert.equal(validUntilFromDays(0), null);
assert.equal(validUntilFromDays(-3), null);
assert.equal(
  validUntilFromDays(7, new Date('2026-07-20T12:00:00')),
  '2026-07-27'
);
assert.equal(toDateInputValue(new Date('2026-07-20T15:30:00')), '2026-07-20');

assert.equal(calcDepositAmount(1000, 50, 'percent'), 500);
assert.equal(calcDepositAmount(1000, 150, 'flat'), 150);
assert.equal(calcDepositAmount(100, 250, 'flat'), 100);
assert.equal(calcDepositAmount(1000, 0, 'percent'), 0);

assert.equal(telUrlForPhone('(555) 019-9'), 'tel:5550199');
assert.equal(telUrlForPhone('+1 555-0100'), 'tel:+15550100');
assert.match(mapsUrlForAddress('12 Oak Ave, Springfield'), /maps\.apple\.com/);
assert.match(mapsUrlForAddress('12 Oak Ave'), /12%20Oak%20Ave/);

const quote: Quote = {
  id: 'q1',
  quoteNumber: 1042,
  customerName: 'Jane Doe',
  phone: '555-0199',
  email: 'jane@example.com',
  address: '12 Oak Ave',
  status: 'draft',
  discount: 0,
  discountType: 'flat',
  taxRate: 0,
  notes: '',
  validUntil: '2026-07-27',
  deposit: 50,
  depositType: 'percent',
  paymentTerms: '50% to schedule',
  createdAt: '2026-07-20T12:00:00.000Z',
};

const items: QuoteItem[] = [
  {
    id: 'i1',
    quoteId: 'q1',
    productId: 'p1',
    nameSnapshot: 'Softener',
    descriptionSnapshot: '',
    priceSnapshot: 1000,
    quantity: 1,
  },
];

const message = buildQuoteShareMessage({
  quote,
  items,
  businessName: 'Clear Water Co',
});
assert.match(message, /Hi Jane Doe/);
assert.match(message, /Clear Water Co/);
assert.match(message, /Total: \$1,000\.00/);
assert.match(message, /Valid through/);
assert.match(message, /Deposit to schedule: \$500\.00/);
assert.match(message, /PDF attached/);

const withLit = buildQuoteShareMessage({
  quote,
  items,
  businessName: 'Clear Water Co',
  literatureCount: 1,
});
assert.match(withLit, /product literature attached/);

console.log('quote document checks passed');
