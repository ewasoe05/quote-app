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
    defaultValidDays: Math.max(0, Number(parsed.defaultValidDays) || 0),
    defaultDeposit: Number(parsed.defaultDeposit) || 0,
    defaultDepositType:
      parsed.defaultDepositType === 'flat' ? 'flat' : 'percent',
    defaultPaymentTerms:
      typeof parsed.defaultPaymentTerms === 'string'
        ? parsed.defaultPaymentTerms
        : DEFAULT_BUSINESS_SETTINGS.defaultPaymentTerms,
    accentColor:
      typeof parsed.accentColor === 'string' &&
      /^#([0-9a-fA-F]{6})$/.test(parsed.accentColor.trim())
        ? parsed.accentColor.trim()
        : DEFAULT_BUSINESS_SETTINGS.accentColor,
    logoUri: parsed.logoUri ?? null,
  };
}

assert.deepEqual(mergeBusinessSettings(null), DEFAULT_BUSINESS_SETTINGS);
assert.equal(DEFAULT_BUSINESS_SETTINGS.defaultValidDays, 7);
assert.equal(DEFAULT_BUSINESS_SETTINGS.accentColor, '#2b6cb0');

const saved = mergeBusinessSettings(
  JSON.stringify({
    businessName: 'Clear Water Co',
    defaultTaxRate: '6.5',
    defaultValidDays: 14,
    defaultDeposit: 25,
    defaultDepositType: 'percent',
    defaultPaymentTerms: '50% to schedule',
    accentColor: '#c45c26',
    quoteFooter: '1-year warranty',
    logoUri: 'file:///logo.png',
  })
);
assert.equal(saved.businessName, 'Clear Water Co');
assert.equal(saved.defaultTaxRate, 6.5);
assert.equal(saved.defaultValidDays, 14);
assert.equal(saved.defaultDeposit, 25);
assert.equal(saved.defaultDepositType, 'percent');
assert.equal(saved.defaultPaymentTerms, '50% to schedule');
assert.equal(saved.accentColor, '#c45c26');
assert.equal(saved.phone, '');
assert.equal(saved.logoUri, 'file:///logo.png');
assert.equal(saved.quoteFooter, '1-year warranty');

const badAccent = mergeBusinessSettings(
  JSON.stringify({ accentColor: 'blue' })
);
assert.equal(badAccent.accentColor, DEFAULT_BUSINESS_SETTINGS.accentColor);

console.log('business settings checks passed');
