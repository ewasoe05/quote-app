import assert from 'node:assert/strict';

/**
 * Documents the settings-flag seed guard without needing SQLite:
 * first call seeds, subsequent calls no-op when the flag is set.
 */
function createSeedGuard() {
  const settings = new Map<string, string>();
  let products: string[] = [];

  return {
    async seed(catalog: string[]) {
      if (settings.get('catalog_seeded') === '1') {
        return 0;
      }
      let inserted = 0;
      if (products.length === 0) {
        products = [...catalog];
        inserted = catalog.length;
      }
      settings.set('catalog_seeded', '1');
      return inserted;
    },
    get products() {
      return products;
    },
    clearProducts() {
      products = [];
    },
  };
}

async function main() {
  const catalog = ['A', 'B', 'C'];
  const db = createSeedGuard();

  assert.equal(await db.seed(catalog), 3);
  assert.deepEqual(db.products, catalog);
  assert.equal(await db.seed(catalog), 0);
  assert.equal(db.products.length, 3);

  db.clearProducts();
  assert.equal(await db.seed(catalog), 0, 'flag prevents re-seed after clear');
  assert.equal(db.products.length, 0);

  console.log('seed guard checks passed');
}

void main();
