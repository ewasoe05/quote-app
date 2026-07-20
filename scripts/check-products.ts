import assert from 'node:assert/strict';

import {
  formatCurrency,
  getProductDisplayPrice,
  groupProductsByCategory,
  SEED_PRODUCTS,
} from '../lib/products';
import type { Product } from '../lib/types';

function asProduct(
  partial: Partial<Product> & Pick<Product, 'id' | 'name' | 'category'>
): Product {
  return {
    description: '',
    unitPrice: 0,
    laborPrice: 0,
    active: true,
    ...partial,
  };
}

const seeded: Product[] = SEED_PRODUCTS.map((product, index) =>
  asProduct({ id: String(index + 1), ...product })
);

const sections = groupProductsByCategory(seeded);
assert.equal(sections.length, 5);
assert.deepEqual(
  sections.map((section) => section.title),
  ['Softeners', 'RO', 'Iron Filters', 'Add-ons', 'Labor/Misc']
);
assert.equal(sections[0].data.length, 2);
assert.equal(sections[0].data[0].name, 'GE 32k Softener');
assert.equal(groupProductsByCategory([]).length, 0);

const softener = seeded.find((p) => p.name === 'Whirlpool 48k Softener')!;
assert.equal(getProductDisplayPrice(softener), 1849);
assert.equal(formatCurrency(1849), '$1,849.00');

console.log('products grouping checks passed');
