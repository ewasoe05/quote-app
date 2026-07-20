import assert from 'node:assert/strict';

import { buildQuoteHtml } from '../lib/pdfTemplate';
import type { BusinessSettings, Quote, QuoteItem } from '../lib/types';

const business: BusinessSettings = {
  businessName: 'Clear Water Co',
  phone: '555-0100',
  email: 'hello@clearwater.test',
  website: 'https://clearwater.test',
  address: '100 Main St\nSpringfield',
  licenseNumber: 'LIC-123',
  defaultTaxRate: 6,
  quoteFooter: '1-year parts warranty.\nThank you!',
  logoUri: null,
};

const quote: Quote = {
  id: 'q1',
  customerName: 'Jane Doe',
  phone: '555-0199',
  email: 'jane@example.com',
  address: '12 Oak Ave',
  status: 'draft',
  discount: 10,
  discountType: 'percent',
  taxRate: 6,
  notes: '',
  createdAt: '2026-07-20T12:00:00.000Z',
};

const items: QuoteItem[] = [
  {
    id: 'i1',
    quoteId: 'q1',
    productId: 'p1',
    nameSnapshot: 'Clack WS1 48k Softener',
    priceSnapshot: 1599,
    quantity: 1,
  },
  {
    id: 'i2',
    quoteId: 'q1',
    productId: 'p2',
    nameSnapshot: 'Brine Tank',
    priceSnapshot: 179,
    quantity: 2,
  },
];

const html = buildQuoteHtml({ quote, items, business }, null);

assert.match(html, /Clear Water Co/);
assert.match(html, /Jane Doe/);
assert.match(html, /Clack WS1 48k Softener/);
assert.match(html, /Brine Tank/);
assert.match(html, /License # LIC-123/);
assert.match(html, /1-year parts warranty/);
assert.match(html, /Discount \(10%\)/);
assert.match(html, /page-break-inside:\s*avoid/);
assert.match(html, /thead\s*\{\s*display:\s*table-header-group/);

// Escapes HTML in user content
const sneaky = buildQuoteHtml({
  quote: { ...quote, customerName: '<script>x</script>' },
  items: [],
  business,
});
assert.doesNotMatch(sneaky, /<script>x<\/script>/);
assert.match(sneaky, /&lt;script&gt;x&lt;\/script&gt;/);

console.log('pdf html checks passed');
