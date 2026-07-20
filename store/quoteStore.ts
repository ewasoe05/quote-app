import { create } from 'zustand';

import {
  createQuoteItem,
  getQuoteById,
  getQuoteItemsByQuoteId,
  updateQuote,
  updateQuoteItem,
} from '@/lib/db';
import { getProductDisplayPrice } from '@/lib/products';
import type { Product, Quote, QuoteItem } from '@/lib/types';

type CustomerFields = Pick<
  Quote,
  'customerName' | 'phone' | 'email' | 'address'
>;

type QuoteStore = {
  quote: Quote | null;
  items: QuoteItem[];
  loading: boolean;
  saving: boolean;
  loadError: string | null;
  loadQuote: (id: string) => Promise<void>;
  updateCustomer: (fields: Partial<CustomerFields>) => void;
  addProduct: (product: Product) => Promise<void>;
  flush: () => Promise<void>;
  reset: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingCustomer: Partial<CustomerFields> | null = null;

function clearSaveTimer() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

async function persistCustomer(quoteId: string, fields: Partial<CustomerFields>) {
  await updateQuote(quoteId, fields);
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quote: null,
  items: [],
  loading: false,
  saving: false,
  loadError: null,

  reset: () => {
    clearSaveTimer();
    pendingCustomer = null;
    set({
      quote: null,
      items: [],
      loading: false,
      saving: false,
      loadError: null,
    });
  },

  loadQuote: async (id) => {
    clearSaveTimer();
    pendingCustomer = null;
    set({ loading: true, loadError: null });
    try {
      const quote = await getQuoteById(id);
      if (!quote) {
        set({
          quote: null,
          items: [],
          loading: false,
          loadError: 'Quote not found',
        });
        return;
      }
      const items = await getQuoteItemsByQuoteId(id);
      set({ quote, items, loading: false, loadError: null });
    } catch (err) {
      set({
        loading: false,
        loadError: err instanceof Error ? err.message : 'Failed to load quote',
      });
    }
  },

  updateCustomer: (fields) => {
    const { quote } = get();
    if (!quote) return;

    const nextQuote = { ...quote, ...fields };
    pendingCustomer = { ...(pendingCustomer ?? {}), ...fields };
    set({ quote: nextQuote });

    clearSaveTimer();
    saveTimer = setTimeout(() => {
      void get().flush();
    }, 250);
  },

  flush: async () => {
    clearSaveTimer();
    const { quote } = get();
    const fields = pendingCustomer;
    pendingCustomer = null;
    if (!quote || !fields || Object.keys(fields).length === 0) return;

    set({ saving: true });
    try {
      await persistCustomer(quote.id, fields);
    } finally {
      set({ saving: false });
    }
  },

  addProduct: async (product) => {
    const { quote, items } = get();
    if (!quote) return;

    // Ensure customer edits are not lost before adding items.
    await get().flush();

    const priceSnapshot = getProductDisplayPrice(product);
    const existing = items.find((item) => item.productId === product.id);

    set({ saving: true });
    try {
      if (existing) {
        const quantity = existing.quantity + 1;
        const updated = await updateQuoteItem(existing.id, { quantity });
        if (!updated) return;
        set({
          items: items.map((item) =>
            item.id === existing.id ? updated : item
          ),
        });
      } else {
        const created = await createQuoteItem({
          quoteId: quote.id,
          productId: product.id,
          nameSnapshot: product.name,
          priceSnapshot,
          quantity: 1,
        });
        set({ items: [...items, created] });
      }
    } finally {
      set({ saving: false });
    }
  },
}));
