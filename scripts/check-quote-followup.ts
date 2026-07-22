import assert from 'node:assert/strict';

import {
  isFollowUpDue,
  isFollowUpDueToday,
  normalizeFollowUpDate,
} from '../lib/quoteDocument';
import {
  filterQuoteList,
  isOpenQuote,
  type QuoteListItem,
} from '../lib/quotes';
import type { Quote } from '../lib/types';

assert.equal(normalizeFollowUpDate('2026-07-22'), '2026-07-22');
assert.equal(normalizeFollowUpDate('bad'), null);
assert.equal(isFollowUpDueToday('2026-07-22', '2026-07-22'), true);
assert.equal(isFollowUpDueToday('2026-07-21', '2026-07-22'), false);
assert.equal(isFollowUpDue('2026-07-21', '2026-07-22'), true);
assert.equal(isFollowUpDue('2026-07-23', '2026-07-22'), false);

function asListItem(
  partial: Partial<Quote> & Pick<Quote, 'id' | 'status'>
): QuoteListItem {
  return {
    quoteNumber: 1001,
    customerName: 'Jane',
    phone: '',
    email: '',
    address: '',
    discount: 0,
    discountType: 'flat',
    taxRate: 0,
    notes: '',
    validUntil: null,
    deposit: 0,
    depositType: 'percent',
    paymentTerms: '',
    statusReason: '',
    customerSignatureUri: null,
    techSignatureUri: null,
    signedAt: null,
    jobSitePhotoUri: null,
    followUpDate: null,
    isTemplate: false,
    createdAt: '2026-07-20T12:00:00.000Z',
    total: 100,
    itemCount: 1,
    ...partial,
  };
}

const quotes: QuoteListItem[] = [
  asListItem({
    id: 'a',
    status: 'sent',
    followUpDate: '2026-07-22',
  }),
  asListItem({
    id: 'b',
    status: 'draft',
    followUpDate: '2026-07-20',
  }),
  asListItem({
    id: 'c',
    status: 'won',
    followUpDate: '2026-07-22',
  }),
  asListItem({
    id: 't',
    status: 'draft',
    isTemplate: true,
    customerName: '',
    notes: 'Softener kit template',
  }),
];

assert.equal(isOpenQuote(quotes[0]!), true);
assert.equal(isOpenQuote(quotes[2]!), false);

const all = filterQuoteList(quotes, 'all', '2026-07-22');
assert.equal(all.length, 3);
assert.ok(all.every((quote) => !quote.isTemplate));

const dueToday = filterQuoteList(quotes, 'due_today', '2026-07-22');
assert.deepEqual(
  dueToday.map((quote) => quote.id),
  ['a', 'c']
);

const needs = filterQuoteList(quotes, 'needs_follow_up', '2026-07-22');
assert.deepEqual(
  needs.map((quote) => quote.id).sort(),
  ['a', 'b']
);

const templates = filterQuoteList(quotes, 'templates', '2026-07-22');
assert.equal(templates.length, 1);
assert.equal(templates[0]?.id, 't');

console.log('quote follow-up filter checks passed');
