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

/** PDF picture / literature file stored with a catalog product. */
export type ProductAttachment = {
  id: string;
  fileName: string;
  uri: string;
};

export type ProductKind = 'standard' | 'package';

/** Child product inside a kit/package (expanded when added to a quote). */
export type PackageComponent = {
  productId: string;
  quantity: number;
};

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  unitPrice: number;
  laborPrice: number;
  active: boolean;
  /** Product pictures and literature as PDF files in app documents. */
  attachments: ProductAttachment[];
  /** `package` expands into `components` when added to a quote. */
  kind: ProductKind;
  components: PackageComponent[];
  /** Dealer cost for the unit (catalog helper; not shown on quotes). */
  costPrice: number;
  /** Target margin % of sell price; drives unitPrice via helper. */
  marginPercent: number;
}

export type NewProduct = Omit<
  Product,
  | 'id'
  | 'attachments'
  | 'kind'
  | 'components'
  | 'costPrice'
  | 'marginPercent'
> & {
  attachments?: ProductAttachment[];
  kind?: ProductKind;
  components?: PackageComponent[];
  costPrice?: number;
  marginPercent?: number;
};
export type UpdateProduct = Partial<NewProduct>;

export interface Quote {
  id: string;
  /** Sequential, human-readable identifier shown on the PDF. Never reused. */
  quoteNumber: number;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  status: QuoteStatus;
  discount: number;
  discountType: DiscountType;
  taxRate: number;
  notes: string;
  /** ISO date (yyyy-mm-dd) when the quote expires; null if unset. */
  validUntil: string | null;
  deposit: number;
  depositType: DiscountType;
  paymentTerms: string;
  /** Why status is won/lost (optional free text). */
  statusReason: string;
  /** Local file URI for customer signature SVG. */
  customerSignatureUri: string | null;
  /** Local file URI for optional tech signature SVG. */
  techSignatureUri: string | null;
  /** ISO timestamp when customer signed; null if unsigned. */
  signedAt: string | null;
  /** Local file URI for optional job-site photo. */
  jobSitePhotoUri: string | null;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  nameSnapshot: string;
  /** Product description at add-time; shown on the quote PDF. */
  descriptionSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

/** quoteNumber is allocated by the database, never supplied by callers. */
export type NewQuote = Omit<Quote, 'id' | 'createdAt' | 'quoteNumber'> & {
  createdAt?: string;
};
export type UpdateQuote = Partial<
  Omit<Quote, 'id' | 'createdAt' | 'quoteNumber'>
>;

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
  /** Days from create date used to seed quote.validUntil (0 = leave blank). */
  defaultValidDays: number;
  defaultDeposit: number;
  defaultDepositType: DiscountType;
  defaultPaymentTerms: string;
  quoteFooter: string;
  /** Hex accent used on quote PDFs, e.g. #2b6cb0. */
  accentColor: string;
  logoUri: string | null;
};

export const DEFAULT_ACCENT_COLOR = '#2b6cb0';

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  licenseNumber: '',
  defaultTaxRate: 0,
  defaultValidDays: 7,
  defaultDeposit: 0,
  defaultDepositType: 'percent',
  defaultPaymentTerms: '',
  quoteFooter: '',
  accentColor: DEFAULT_ACCENT_COLOR,
  logoUri: null,
};
