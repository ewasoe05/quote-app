import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type NewProduct,
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

export const SEED_PRODUCTS: NewProduct[] = [
  {
    name: 'Whirlpool 48k Softener',
    category: 'softeners',
    description: 'High-efficiency water softener for whole-home use',
    unitPrice: 1499,
    laborPrice: 350,
    active: true,
  },
  {
    name: 'GE 32k Softener',
    category: 'softeners',
    description: 'Compact softener for apartments and small homes',
    unitPrice: 999,
    laborPrice: 275,
    active: true,
  },
  {
    name: 'Aquasana OptimH2O RO',
    category: 'ro_systems',
    description: 'Under-sink reverse osmosis drinking water system',
    unitPrice: 449,
    laborPrice: 175,
    active: true,
  },
  {
    name: 'iSpring RCC7 RO',
    category: 'ro_systems',
    description: '5-stage RO system with remineralization',
    unitPrice: 289,
    laborPrice: 150,
    active: true,
  },
  {
    name: 'Fleck 2510 Iron Filter',
    category: 'iron_filters',
    description: 'Air-injection iron and manganese filter',
    unitPrice: 1299,
    laborPrice: 400,
    active: true,
  },
  {
    name: 'UV Sterilizer',
    category: 'add_ons',
    description: 'Point-of-entry UV disinfection unit',
    unitPrice: 525,
    laborPrice: 125,
    active: true,
  },
  {
    name: 'Sediment Pre-Filter',
    category: 'add_ons',
    description: 'Whole-home sediment cartridge housing kit',
    unitPrice: 89,
    laborPrice: 75,
    active: true,
  },
  {
    name: 'Standard Installation Labor',
    category: 'labor_misc',
    description: 'Base labor for typical residential install',
    unitPrice: 0,
    laborPrice: 450,
    active: true,
  },
  {
    name: 'Trip Charge',
    category: 'labor_misc',
    description: 'Service call / travel fee',
    unitPrice: 75,
    laborPrice: 0,
    active: true,
  },
];

/** Display price: unit + labor when both apply. */
export function getProductDisplayPrice(product: Product): number {
  return product.unitPrice + product.laborPrice;
}
