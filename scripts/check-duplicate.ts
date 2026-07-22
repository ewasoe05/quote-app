import assert from 'node:assert/strict';

/**
 * Documents that duplication creates a new draft with copied fields/items
 * while leaving the source untouched. Supports clear-customer / template modes.
 */
function duplicateQuoteRecord(
  source: {
    id: string;
    status: string;
    customerName: string;
    phone: string;
    items: { id: string; name: string; price: number; quantity: number }[];
  },
  options: { clearCustomer?: boolean; asTemplate?: boolean } = {}
) {
  const clearCustomer = Boolean(options.clearCustomer || options.asTemplate);
  return {
    id: 'new-' + source.id,
    status: 'draft' as const,
    customerName: clearCustomer ? '' : source.customerName,
    phone: clearCustomer ? '' : source.phone,
    isTemplate: Boolean(options.asTemplate),
    items: source.items.map((item, index) => ({
      id: `new-item-${index}`,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  };
}

const source = {
  id: 'q1',
  status: 'won',
  customerName: 'Jane',
  phone: '555',
  items: [{ id: 'i1', name: 'Softener', price: 1000, quantity: 1 }],
};

const copy = duplicateQuoteRecord(source);
assert.notEqual(copy.id, source.id);
assert.equal(copy.status, 'draft');
assert.equal(source.status, 'won');
assert.equal(copy.customerName, source.customerName);
assert.equal(copy.items[0].name, 'Softener');
assert.notEqual(copy.items[0].id, source.items[0].id);

const asNew = duplicateQuoteRecord(source, { clearCustomer: true });
assert.equal(asNew.customerName, '');
assert.equal(asNew.phone, '');
assert.equal(asNew.isTemplate, false);

const template = duplicateQuoteRecord(source, { asTemplate: true });
assert.equal(template.customerName, '');
assert.equal(template.isTemplate, true);

// Mutating the copy does not mutate the source
copy.items[0].price = 1;
assert.equal(source.items[0].price, 1000);

console.log('quote duplicate checks passed');
