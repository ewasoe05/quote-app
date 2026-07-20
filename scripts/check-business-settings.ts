import assert from 'node:assert/strict';

import { DEFAULT_BUSINESS_SETTINGS, type BusinessSettings } from '../lib/types';

function mergeBusinessSettings(
  raw: string | null
): BusinessSettings {
  if (!raw) return { ...DEFAULT_BUSINESS_SETTINGS };
  const parsed = JSON.parse(raw) as Partial<BusinessSettings>;
  return {
    ...DEFAULT_BUSINESS_SETTINGS,
    ...parsed,
    defaultTaxRate: Number(parsed.defaultTaxRate) || 0,
    logoUri: parsed.logoUri ?? null,
  };
}

assert.deepEqual(mergeBusinessSettings(null), DEFAULT_BUSINESS_SETTINGS);

const saved = mergeBusinessSettings(
  JSON.stringify({
    businessName: 'Clear Water Co',
    defaultTaxRate: '6.5',
    quoteFooter: '1-year warranty',
    logoUri: 'file:///logo.png',
  })
);
assert.equal(saved.businessName, 'Clear Water Co');
assert.equal(saved.defaultTaxRate, 6.5);
assert.equal(saved.phone, '');
assert.equal(saved.logoUri, 'file:///logo.png');
assert.equal(saved.quoteFooter, '1-year warranty');

console.log('business settings checks passed');
