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
  quoteNumber: 1042,
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
    descriptionSnapshot: 'Clack WS1 valve, 48k resin tank',
    priceSnapshot: 1599,
    quantity: 1,
  },
  {
    id: 'i2',
    quoteId: 'q1',
    productId: 'p2',
    nameSnapshot: 'Brine Tank',
    descriptionSnapshot: '',
    priceSnapshot: 179,
    quantity: 2,
  },
];

const html = buildQuoteHtml({ quote, items, business }, null);

assert.match(html, /Clear Water Co/);
assert.match(html, /Jane Doe/);
assert.match(html, /Clack WS1 48k Softener/);
assert.match(html, /Clack WS1 valve, 48k resin tank/);
assert.match(html, /Brine Tank/);
assert.match(html, /License # LIC-123/);
assert.match(html, /1-year parts warranty/);
assert.match(html, /Discount \(10%\)/);
assert.match(html, /page-break-inside:\s*avoid/);
assert.match(html, /thead\s*\{\s*display:\s*table-header-group/);

// QuickBooks-style layout markers
assert.match(html, /Bill to/i);
assert.match(html, /Ship to/i);
assert.match(html, /Quote total/i);
assert.match(html, /sum-dark/);
assert.match(html, />Status</);
assert.match(html, />Draft</);
assert.match(html, /Description/);
assert.match(html, /Thank you\./i);
assert.match(html, /class="sign-block"/);
assert.match(html, /tot-due-row/);

// Quote number appears on the document so customers can reference it.
assert.match(html, /Quote 1042/);

// MM/DD/YYYY date style from the sample invoice
assert.match(html, /07\/20\/2026/);

// Notes render only when present, and are escaped like every other field.
assert.doesNotMatch(html, /class="notes-block"/);
const withNotes = buildQuoteHtml({
  quote: { ...quote, notes: 'Crawlspace access\n<b>tight fit</b>' },
  items,
  business,
});
assert.match(withNotes, /class="notes-block"/);
assert.match(withNotes, /Crawlspace access<br\/>&lt;b&gt;tight fit&lt;\/b&gt;/);

// Escapes HTML in user content
const sneaky = buildQuoteHtml({
  quote: { ...quote, customerName: '<script>x</script>' },
  items: [],
  business,
});
assert.doesNotMatch(sneaky, /<script>x<\/script>/);
assert.match(sneaky, /&lt;script&gt;x&lt;\/script&gt;/);

// Logo comes from the app-provided data URI only (never baked-in sample artwork).
const withLogo = buildQuoteHtml(
  { quote, items, business },
  'data:image/png;base64,abc'
);
assert.match(withLogo, /src="data:image\/png;base64,abc"/);
assert.doesNotMatch(html, /src="data:image/);

// Empty customer fields stay blank — no sample names from the example invoice.
const blankCustomer = buildQuoteHtml({
  quote: {
    ...quote,
    customerName: '',
    phone: '',
    email: '',
    address: '',
  },
  items: [],
  business,
});
assert.doesNotMatch(blankCustomer, /Martha Thomas|Hampton Inn|Zanesville/i);
assert.doesNotMatch(blankCustomer, />Customer</);

console.log('pdf html checks passed');
