import assert from 'node:assert/strict';

import {
  formatCurrency,
  getProductDisplayPrice,
  groupProductsByCategory,
} from '../lib/products';
import { DEFAULT_CATALOG } from '../lib/seed';
import type { Product } from '../lib/types';

function asProduct(
  partial: Partial<Product> & Pick<Product, 'id' | 'name' | 'category'>
): Product {
  return {
    description: '',
    unitPrice: 0,
    laborPrice: 0,
    active: true,
    attachments: [],
    ...partial,
  };
}

const seeded: Product[] = DEFAULT_CATALOG.map((product, index) =>
  asProduct({ id: String(index + 1), ...product })
);

assert.equal(DEFAULT_CATALOG.length, 12);

const sections = groupProductsByCategory(seeded);
assert.equal(sections.length, 5);
assert.deepEqual(
  sections.map((section) => section.title),
  ['Softeners', 'RO', 'Iron Filters', 'Add-ons', 'Labor/Misc']
);
assert.equal(sections[0].data.length, 7);
assert.equal(sections[0].data[0].name, 'Clack WS1 110k Softener'); // sorted alpha
assert.ok(sections[0].data.some((p) => p.name.includes('48k')));
assert.ok(seeded.some((p) => p.name === 'Brine Tank'));
assert.ok(seeded.some((p) => p.name === 'Service Call'));
assert.equal(groupProductsByCategory([]).length, 0);

const softener = seeded.find((p) => p.name === 'Clack WS1 48k Softener')!;
assert.equal(getProductDisplayPrice(softener), 1599);
assert.equal(formatCurrency(1599), '$1,599.00');

console.log('default catalog seed checks passed');
