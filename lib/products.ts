import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type PackageComponent,
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

/**
 * Sell price from cost + margin % of sell.
 * sell = cost / (1 - margin/100). Margin must be < 100.
 */
export function sellFromCostMargin(cost: number, marginPercent: number): number {
  const c = Math.max(0, Number(cost) || 0);
  const m = Number(marginPercent) || 0;
  if (m >= 100) return c;
  if (m <= 0) return Math.round(c * 100) / 100;
  return Math.round((c / (1 - m / 100)) * 100) / 100;
}

/** Margin % of sell from cost + sell. Returns 0 when sell <= 0. */
export function marginFromCostSell(cost: number, sell: number): number {
  const c = Math.max(0, Number(cost) || 0);
  const s = Math.max(0, Number(sell) || 0);
  if (s <= 0) return 0;
  const raw = ((s - c) / s) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.round(Math.max(0, Math.min(99.99, raw)) * 100) / 100;
}

export function normalizePackageComponents(
  components: PackageComponent[] | null | undefined
): PackageComponent[] {
  if (!Array.isArray(components)) return [];
  const byId = new Map<string, number>();
  for (const item of components) {
    if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
      continue;
    }
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    byId.set(item.productId, (byId.get(item.productId) ?? 0) + qty);
  }
  return [...byId.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

/** Rollup sell total for a kit from catalog children (skips missing/nested kits). */
export function getPackageDisplayPrice(
  product: Product,
  catalog: Product[]
): number {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  let total = 0;
  for (const component of normalizePackageComponents(product.components)) {
    const child = byId.get(component.productId);
    if (!child || child.kind === 'package') continue;
    total += (child.unitPrice + child.laborPrice) * component.quantity;
  }
  return Math.round(total * 100) / 100;
}

/** Display price: unit + labor, or kit rollup when catalog is provided. */
export function getProductDisplayPrice(
  product: Product,
  catalog?: Product[]
): number {
  if (product.kind === 'package' && catalog) {
    return getPackageDisplayPrice(product, catalog);
  }
  return product.unitPrice + product.laborPrice;
}
