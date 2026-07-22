import { create } from 'zustand';

import {
  createQuoteItem,
  deleteQuoteItem,
  getProductById,
  getQuoteById,
  getQuoteItemsByQuoteId,
  rememberRecentProduct,
  updateQuote,
  updateQuoteItem,
} from '@/lib/db';
import { getProductDisplayPrice } from '@/lib/products';
import type { DiscountType, Product, Quote, QuoteItem } from '@/lib/types';

type QuoteEditableFields = Partial<
  Pick<
    Quote,
    | 'customerName'
    | 'phone'
    | 'email'
    | 'address'
    | 'discount'
    | 'discountType'
    | 'taxRate'
    | 'notes'
    | 'status'
    | 'validUntil'
    | 'deposit'
    | 'depositType'
    | 'paymentTerms'
  >
>;

type QuoteStore = {
  quote: Quote | null;
  items: QuoteItem[];
  loading: boolean;
  saving: boolean;
  loadError: string | null;
  loadQuote: (id: string) => Promise<void>;
  updateQuoteFields: (fields: QuoteEditableFields) => void;
  /** @deprecated prefer updateQuoteFields */
  updateCustomer: (
    fields: Pick<QuoteEditableFields, 'customerName' | 'phone' | 'email' | 'address'>
  ) => void;
  addProduct: (product: Product) => Promise<void>;
  setItemQuantity: (itemId: string, quantity: number) => Promise<void>;
  setItemPrice: (itemId: string, price: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  flush: () => Promise<void>;
  reset: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingQuoteFields: QuoteEditableFields | null = null;

function clearSaveTimer() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

async function addOrBumpLine(
  get: () => QuoteStore,
  set: (
    partial:
      | Partial<QuoteStore>
      | ((state: QuoteStore) => Partial<QuoteStore>)
  ) => void,
  quoteId: string,
  product: Product,
  addQty: number
): Promise<void> {
  const items = get().items;
  const existing = items.find((item) => item.productId === product.id);
  const priceSnapshot = getProductDisplayPrice(product);

  if (existing) {
    const quantity = existing.quantity + addQty;
    const updated = await updateQuoteItem(existing.id, { quantity });
    if (!updated) return;
    set({
      items: items.map((item) => (item.id === existing.id ? updated : item)),
    });
    return;
  }

  const created = await createQuoteItem({
    quoteId,
    productId: product.id,
    nameSnapshot: product.name,
    descriptionSnapshot: product.description?.trim() ?? '',
    priceSnapshot,
    quantity: addQty,
  });
  set({ items: [...items, created] });
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quote: null,
  items: [],
  loading: false,
  saving: false,
  loadError: null,

  reset: () => {
    clearSaveTimer();
    pendingQuoteFields = null;
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
    pendingQuoteFields = null;
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

  updateQuoteFields: (fields) => {
    const { quote } = get();
    if (!quote) return;

    const nextQuote = { ...quote, ...fields };
    pendingQuoteFields = { ...(pendingQuoteFields ?? {}), ...fields };
    set({ quote: nextQuote });

    clearSaveTimer();
    saveTimer = setTimeout(() => {
      void get().flush();
    }, 250);
  },

  updateCustomer: (fields) => {
    get().updateQuoteFields(fields);
  },

  flush: async () => {
    clearSaveTimer();
    const { quote } = get();
    const fields = pendingQuoteFields;
    pendingQuoteFields = null;
    if (!quote || !fields || Object.keys(fields).length === 0) return;

    set({ saving: true });
    try {
      await updateQuote(quote.id, fields);
    } finally {
      set({ saving: false });
    }
  },

  addProduct: async (product) => {
    const { quote } = get();
    if (!quote) return;

    await get().flush();

    // Kits expand into child catalog lines (never add the package row itself).
    if (product.kind === 'package') {
      const components = product.components ?? [];
      if (components.length === 0) return;

      set({ saving: true });
      try {
        for (const component of components) {
          const child = await getProductById(component.productId);
          if (!child || !child.active || child.kind === 'package') continue;
          const addQty = Math.max(1, Math.floor(Number(component.quantity) || 1));
          await addOrBumpLine(get, set, quote.id, child, addQty);
          void rememberRecentProduct(child.id);
        }
        void rememberRecentProduct(product.id);
      } finally {
        set({ saving: false });
      }
      return;
    }

    set({ saving: true });
    try {
      await addOrBumpLine(get, set, quote.id, product, 1);
      void rememberRecentProduct(product.id);
    } finally {
      set({ saving: false });
    }
  },

  setItemQuantity: async (itemId, quantity) => {
    const nextQty = Math.max(1, Math.floor(quantity));
    const { items } = get();
    const existing = items.find((item) => item.id === itemId);
    if (!existing || existing.quantity === nextQty) return;

    // Optimistic update for instant totals.
    set({
      items: items.map((item) =>
        item.id === itemId ? { ...item, quantity: nextQty } : item
      ),
    });

    set({ saving: true });
    try {
      const updated = await updateQuoteItem(itemId, { quantity: nextQty });
      if (updated) {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? updated : item
          ),
        });
      }
    } finally {
      set({ saving: false });
    }
  },

  setItemPrice: async (itemId, price) => {
    const nextPrice = Math.max(0, Math.round(price * 100) / 100);
    const { items } = get();
    const existing = items.find((item) => item.id === itemId);
    if (!existing || existing.priceSnapshot === nextPrice) return;

    set({
      items: items.map((item) =>
        item.id === itemId ? { ...item, priceSnapshot: nextPrice } : item
      ),
    });

    set({ saving: true });
    try {
      const updated = await updateQuoteItem(itemId, {
        priceSnapshot: nextPrice,
      });
      if (updated) {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? updated : item
          ),
        });
      }
    } finally {
      set({ saving: false });
    }
  },

  removeItem: async (itemId) => {
    const { items } = get();
    set({ items: items.filter((item) => item.id !== itemId), saving: true });
    try {
      await deleteQuoteItem(itemId);
    } finally {
      set({ saving: false });
    }
  },
}));

export type { DiscountType };
