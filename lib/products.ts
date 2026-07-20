import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type Product,
  type ProductSection,
} from './types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function groupProductsByCategory(products: Product[]): ProductSection[] {
  return PRODUCT_CATEGORIES.map((category) => ({
    category,
    title: PRODUCT_CATEGORY_LABELS[category],
    data: products
      .filter((product) => product.category === category)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((section) => section.data.length > 0);
}

/** Display price: unit + labor when both apply. */
export function getProductDisplayPrice(product: Product): number {
  return product.unitPrice + product.laborPrice;
}
