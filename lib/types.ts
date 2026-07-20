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

export type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost';

export type DiscountType = 'flat' | 'percent';

export const QUOTE_STATUSES: QuoteStatus[] = [
  'draft',
  'sent',
  'won',
  'lost',
];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  won: 'Won',
  lost: 'Lost',
};

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
  discountType: DiscountType;
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

export type BusinessSettings = {
  businessName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  licenseNumber: string;
  defaultTaxRate: number;
  quoteFooter: string;
  logoUri: string | null;
};

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  licenseNumber: '',
  defaultTaxRate: 0,
  quoteFooter: '',
  logoUri: null,
};
