export type ProductCategory =
  | 'softeners'
  | 'ro_systems'
  | 'iron_filters'
  | 'add_ons'
  | 'labor_misc';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'softeners',
  'ro_systems',
  'iron_filters',
  'add_ons',
  'labor_misc',
];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  softeners: 'Softeners',
  ro_systems: 'RO',
  iron_filters: 'Iron Filters',
  add_ons: 'Add-ons',
  labor_misc: 'Labor/Misc',
};

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  unitPrice: number;
  laborPrice: number;
  active: boolean;
}

export interface Quote {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  status: QuoteStatus;
  discount: number;
  taxRate: number;
  notes: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

export type NewProduct = Omit<Product, 'id'>;
export type UpdateProduct = Partial<NewProduct>;

export type NewQuote = Omit<Quote, 'id' | 'createdAt'> & {
  createdAt?: string;
};
export type UpdateQuote = Partial<Omit<Quote, 'id' | 'createdAt'>>;

export type NewQuoteItem = Omit<QuoteItem, 'id'>;
export type UpdateQuoteItem = Partial<Omit<QuoteItem, 'id' | 'quoteId'>>;

export type ProductSection = {
  category: ProductCategory;
  title: string;
  data: Product[];
};
