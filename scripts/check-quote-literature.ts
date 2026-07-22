import assert from 'node:assert/strict';

import { unzipSync, zipSync } from 'fflate';

import { buildQuoteShareMessage } from '../lib/quoteDocument';
import { buildLiteratureZipEntryNames } from '../lib/quoteLiteraturePaths';
import type { Quote, QuoteItem } from '../lib/types';

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

const messageOnly = buildQuoteShareMessage({ quote, items });
assert.match(messageOnly, /PDF attached — thank you!/);
assert.doesNotMatch(messageOnly, /literature/);

const messageWithLit = buildQuoteShareMessage({
  quote,
  items,
  literatureCount: 2,
});
assert.match(
  messageWithLit,
  /Quote PDF and 2 product literature files attached/
);

const names = buildLiteratureZipEntryNames({
  quoteFileName: 'Quote-1042.pdf',
  literature: [
    { productName: 'Clack WS1', fileName: 'cut-sheet.pdf' },
    { productName: 'Clack WS1', fileName: 'cut-sheet.pdf' },
    { productName: 'Brine / Tank', fileName: 'spec' },
  ],
});
assert.deepEqual(names, [
  'Quote-1042.pdf',
  'Literature/Clack WS1/cut-sheet.pdf',
  'Literature/Clack WS1/cut-sheet-2.pdf',
  'Literature/Brine _ Tank/spec.pdf',
]);

// fflate round-trip (same path used when packaging quote + literature).
const zipped = zipSync(
  {
    'Quote-1042.pdf': new Uint8Array([37, 80, 68, 70]),
    'Literature/Softener/cut.pdf': new Uint8Array([37, 80, 68, 70, 45]),
  },
  { level: 0 }
);
const unzipped = unzipSync(zipped);
assert.equal(unzipped['Quote-1042.pdf']?.length, 4);
assert.equal(unzipped['Literature/Softener/cut.pdf']?.length, 5);

console.log('quote literature checks passed');
