import assert from 'node:assert/strict';

import {
  calcDiscountAmount,
  calcQuoteTotals,
  calcSubtotal,
  calcTax,
  roundToCents,
} from '../lib/calc';

assert.equal(roundToCents(1.005), 1.01);
assert.equal(roundToCents(1.004), 1);
assert.equal(roundToCents(10.999), 11);

const items = [
  { priceSnapshot: 100, quantity: 2 },
  { priceSnapshot: 49.99, quantity: 1 },
];
assert.equal(calcSubtotal(items), 249.99);

assert.equal(calcDiscountAmount(249.99, 50, 'flat'), 50);
assert.equal(calcDiscountAmount(249.99, 500, 'flat'), 249.99); // capped
assert.equal(calcDiscountAmount(249.99, 10, 'percent'), 25);
assert.equal(calcDiscountAmount(249.99, 100, 'percent'), 249.99);

// Tax rounding to cents: 10% of 19.99 = 1.999 → 2.00
assert.equal(calcTax(19.99, 10), 2);

const flatTotals = calcQuoteTotals({
  items,
  discount: 50,
  discountType: 'flat',
  taxRate: 6,
});
assert.equal(flatTotals.subtotal, 249.99);
assert.equal(flatTotals.discountAmount, 50);
assert.equal(flatTotals.taxable, 199.99);
assert.equal(flatTotals.tax, 12); // 199.99 * 0.06 = 11.9994 → 12.00
assert.equal(flatTotals.grandTotal, 211.99);

const percentTotals = calcQuoteTotals({
  items,
  discount: 10,
  discountType: 'percent',
  taxRate: 8.25,
});
assert.equal(percentTotals.discountAmount, 25);
assert.equal(percentTotals.taxable, 224.99);
assert.equal(percentTotals.tax, 18.56); // 224.99 * 0.0825 = 18.561675 → 18.56
assert.equal(percentTotals.grandTotal, 243.55);

console.log('calc.ts checks passed');
