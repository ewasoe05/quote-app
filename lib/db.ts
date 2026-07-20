import * as SQLite from 'expo-sqlite';

import { CATALOG_SEEDED_KEY, DEFAULT_CATALOG } from './seed';
import type {
  NewProduct,
  NewQuote,
  NewQuoteItem,
  Product,
  ProductCategory,
  Quote,
  QuoteItem,
  QuoteStatus,
  UpdateProduct,
  UpdateQuote,
  UpdateQuoteItem,
} from './types';

const DATABASE_NAME = 'quote-app.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function createId(): string {
  return crypto.randomUUID();
}

type ProductRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  unit_price: number;
  labor_price: number;
  active: number;
};

type QuoteRow = {
  id: string;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  discount: number;
  tax_rate: number;
  notes: string;
  created_at: string;
};

type QuoteItemRow = {
  id: string;
  quote_id: string;
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ProductCategory,
    description: row.description,
    unitPrice: row.unit_price,
    laborPrice: row.labor_price,
    active: row.active === 1,
  };
}

function mapQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    status: row.status as QuoteStatus,
    discount: row.discount,
    taxRate: row.tax_rate,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapQuoteItem(row: QuoteItemRow): QuoteItem {
  return {
    id: row.id,
    quoteId: row.quote_id,
    productId: row.product_id,
    nameSnapshot: row.name_snapshot,
    priceSnapshot: row.price_snapshot,
    quantity: row.quantity,
  };
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      unit_price REAL NOT NULL DEFAULT 0,
      labor_price REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      discount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY NOT NULL,
      quote_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      price_snapshot REAL NOT NULL DEFAULT 0,
      quantity REAL NOT NULL DEFAULT 1,
      FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  return db;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

/**
 * One-time default catalog seed, guarded by settings.catalog_seeded.
 * Fresh installs get DEFAULT_CATALOG once; later launches never re-insert.
 */
export async function seedDefaultCatalog(): Promise<number> {
  const alreadySeeded = await getSetting(CATALOG_SEEDED_KEY);
  if (alreadySeeded === '1') {
    return 0;
  }

  const existing = await getAllProducts();
  let inserted = 0;

  if (existing.length === 0) {
    for (const product of DEFAULT_CATALOG) {
      await createProduct(product);
      inserted += 1;
    }
    console.log(`[db] seeded ${inserted} default catalog products`);
  } else {
    // Upgrade path: products already present from an earlier seed — just set the flag.
    console.log(
      `[db] catalog seed flag set; skipped insert (${existing.length} products already present)`
    );
  }

  await setSetting(CATALOG_SEEDED_KEY, '1');
  return inserted;
}

// --- Products ---

export async function createProduct(input: NewProduct): Promise<Product> {
  const db = await getDatabase();
  const product: Product = {
    id: createId(),
    ...input,
  };

  await db.runAsync(
    `INSERT INTO products (id, name, category, description, unit_price, labor_price, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    product.id,
    product.name,
    product.category,
    product.description,
    product.unitPrice,
    product.laborPrice,
    product.active ? 1 : 0
  );

  return product;
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProductRow>(
    'SELECT * FROM products WHERE id = ?',
    id
  );
  return row ? mapProduct(row) : null;
}

export async function getAllProducts(options?: {
  activeOnly?: boolean;
}): Promise<Product[]> {
  const db = await getDatabase();
  const rows = options?.activeOnly
    ? await db.getAllAsync<ProductRow>(
        'SELECT * FROM products WHERE active = 1 ORDER BY name COLLATE NOCASE'
      )
    : await db.getAllAsync<ProductRow>(
        'SELECT * FROM products ORDER BY name COLLATE NOCASE'
      );
  return rows.map(mapProduct);
}

export async function updateProduct(
  id: string,
  updates: UpdateProduct
): Promise<Product | null> {
  const existing = await getProductById(id);
  if (!existing) return null;

  const next: Product = {
    ...existing,
    ...updates,
  };

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE products
     SET name = ?, category = ?, description = ?, unit_price = ?, labor_price = ?, active = ?
     WHERE id = ?`,
    next.name,
    next.category,
    next.description,
    next.unitPrice,
    next.laborPrice,
    next.active ? 1 : 0,
    id
  );

  return next;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM products WHERE id = ?', id);
  return result.changes > 0;
}

// --- Quotes ---

export async function createQuote(input: NewQuote): Promise<Quote> {
  const db = await getDatabase();
  const quote: Quote = {
    id: createId(),
    customerName: input.customerName,
    phone: input.phone,
    email: input.email,
    address: input.address,
    status: input.status,
    discount: input.discount,
    taxRate: input.taxRate,
    notes: input.notes,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO quotes (
      id, customer_name, phone, email, address, status, discount, tax_rate, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    quote.id,
    quote.customerName,
    quote.phone,
    quote.email,
    quote.address,
    quote.status,
    quote.discount,
    quote.taxRate,
    quote.notes,
    quote.createdAt
  );

  return quote;
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<QuoteRow>(
    'SELECT * FROM quotes WHERE id = ?',
    id
  );
  return row ? mapQuote(row) : null;
}

export async function getAllQuotes(): Promise<Quote[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QuoteRow>(
    'SELECT * FROM quotes ORDER BY created_at DESC'
  );
  return rows.map(mapQuote);
}

export async function updateQuote(
  id: string,
  updates: UpdateQuote
): Promise<Quote | null> {
  const existing = await getQuoteById(id);
  if (!existing) return null;

  const next: Quote = {
    ...existing,
    ...updates,
  };

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE quotes
     SET customer_name = ?, phone = ?, email = ?, address = ?, status = ?,
         discount = ?, tax_rate = ?, notes = ?
     WHERE id = ?`,
    next.customerName,
    next.phone,
    next.email,
    next.address,
    next.status,
    next.discount,
    next.taxRate,
    next.notes,
    id
  );

  return next;
}

export async function deleteQuote(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM quotes WHERE id = ?', id);
  return result.changes > 0;
}

// --- Quote items ---

export async function createQuoteItem(input: NewQuoteItem): Promise<QuoteItem> {
  const db = await getDatabase();
  const item: QuoteItem = {
    id: createId(),
    ...input,
  };

  await db.runAsync(
    `INSERT INTO quote_items (
      id, quote_id, product_id, name_snapshot, price_snapshot, quantity
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    item.id,
    item.quoteId,
    item.productId,
    item.nameSnapshot,
    item.priceSnapshot,
    item.quantity
  );

  return item;
}

export async function getQuoteItemById(id: string): Promise<QuoteItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<QuoteItemRow>(
    'SELECT * FROM quote_items WHERE id = ?',
    id
  );
  return row ? mapQuoteItem(row) : null;
}

export async function getQuoteItemsByQuoteId(
  quoteId: string
): Promise<QuoteItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QuoteItemRow>(
    'SELECT * FROM quote_items WHERE quote_id = ? ORDER BY name_snapshot COLLATE NOCASE',
    quoteId
  );
  return rows.map(mapQuoteItem);
}

export async function updateQuoteItem(
  id: string,
  updates: UpdateQuoteItem
): Promise<QuoteItem | null> {
  const existing = await getQuoteItemById(id);
  if (!existing) return null;

  const next: QuoteItem = {
    ...existing,
    ...updates,
  };

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE quote_items
     SET product_id = ?, name_snapshot = ?, price_snapshot = ?, quantity = ?
     WHERE id = ?`,
    next.productId,
    next.nameSnapshot,
    next.priceSnapshot,
    next.quantity,
    id
  );

  return next;
}

export async function deleteQuoteItem(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM quote_items WHERE id = ?', id);
  return result.changes > 0;
}

export async function deleteQuoteItemsByQuoteId(
  quoteId: string
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'DELETE FROM quote_items WHERE quote_id = ?',
    quoteId
  );
  return result.changes;
}
