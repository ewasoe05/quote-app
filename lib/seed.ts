import type { NewProduct } from './types';

/**
 * One-time default catalog for first launch.
 *
 * Softener sizes match the Water Treatment Coach HTML sizing ladder
 * (STD_SIZES: 24k–110k). Lineup mirrors a typical Clack WS1 estimate
 * template: softener sizes, RO, iron filter, brine tank, install labor,
 * and service call.
 */
export const CATALOG_SEEDED_KEY = 'catalog_seeded';

export const DEFAULT_CATALOG: NewProduct[] = [
  // Softeners — Clack WS1 sizes from the HTML estimate / sizing tools
  {
    name: 'Clack WS1 24k Softener',
    category: 'softeners',
    description: 'Clack WS1 valve, 24,000-grain resin tank — apartments / light use',
    unitPrice: 899,
    laborPrice: 350,
    active: true,
  },
  {
    name: 'Clack WS1 32k Softener',
    category: 'softeners',
    description: 'Clack WS1 valve, 32,000-grain resin tank — small households',
    unitPrice: 999,
    laborPrice: 375,
    active: true,
  },
  {
    name: 'Clack WS1 48k Softener',
    category: 'softeners',
    description: 'Clack WS1 valve, 48,000-grain resin tank — most family homes',
    unitPrice: 1199,
    laborPrice: 400,
    active: true,
  },
  {
    name: 'Clack WS1 64k Softener',
    category: 'softeners',
    description: 'Clack WS1 valve, 64,000-grain resin tank — larger homes / harder water',
    unitPrice: 1399,
    laborPrice: 425,
    active: true,
  },
  {
    name: 'Clack WS1 80k Softener',
    category: 'softeners',
    description: 'Clack WS1 valve, 80,000-grain resin tank — high demand households',
    unitPrice: 1599,
    laborPrice: 450,
    active: true,
  },
  {
    name: 'Clack WS1 96k Softener',
    category: 'softeners',
    description: 'Clack WS1 valve, 96,000-grain resin tank — very hard water / large homes',
    unitPrice: 1799,
    laborPrice: 475,
    active: true,
  },
  {
    name: 'Clack WS1 110k Softener',
    category: 'softeners',
    description: 'Clack WS1 valve, 110,000-grain resin tank — top residential size',
    unitPrice: 1999,
    laborPrice: 500,
    active: true,
  },

  // RO
  {
    name: 'Under-Sink RO System',
    category: 'ro_systems',
    description: '5-stage reverse osmosis drinking water system with faucet',
    unitPrice: 449,
    laborPrice: 175,
    active: true,
  },

  // Iron
  {
    name: 'Clack WS1 Iron Filter',
    category: 'iron_filters',
    description: 'Air-injection (AIO) iron and manganese filter with Clack WS1 valve',
    unitPrice: 1299,
    laborPrice: 400,
    active: true,
  },

  // Add-ons
  {
    name: 'Brine Tank',
    category: 'add_ons',
    description: 'Standard brine tank with grid plate and overflow safety float',
    unitPrice: 179,
    laborPrice: 0,
    active: true,
  },

  // Labor / misc
  {
    name: 'Standard Installation Labor',
    category: 'labor_misc',
    description: 'Base labor for a typical residential softener / filter install',
    unitPrice: 0,
    laborPrice: 450,
    active: true,
  },
  {
    name: 'Service Call',
    category: 'labor_misc',
    description: 'Diagnostic / service visit trip charge',
    unitPrice: 95,
    laborPrice: 0,
    active: true,
  },
];
