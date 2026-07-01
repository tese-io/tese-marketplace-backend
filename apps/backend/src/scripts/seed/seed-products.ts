import { ProductStatus } from '@medusajs/framework/utils'

// B2B / industrial sourcing catalog. Each product models a tradable
// commodity or material with procurement metadata (unit, MOQ, origin,
// lead time, certifications, embodied CO2) that the storefront PDP and
// the AI sourcing engine consume as curated candidates.
const img = (seed: string) =>
  `https://picsum.photos/seed/${seed}/900/700`

const SOLAR_KIT_DESCRIPTION =
  'Complete rooftop and commercial solar kits combining modules, inverters, mounting and balance-of-system components. Compare verified suppliers on tese.io — select a brand to view MOQ, efficiency, warranty and quote-ready specs. Suitable for residential rooftops, C&I projects and microgrid deployments.'

export const productsToInsert = [
  {
    title: 'Hot-Rolled Steel Coil',
    handle: 'hot-rolled-steel-coil',
    subtitle: 'Structural carbon steel coil, mill-certified',
    description:
      'Hot-rolled carbon steel coil suitable for structural fabrication, automotive and general engineering. Supplied with EN 10204 3.1 mill test certificates. Thickness 1.5–12mm, width up to 1500mm. Low-sulphur melt with traceable heat numbers.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('hr-steel-coil'),
    metadata: {
      unit: 'metric ton',
      moq: '25 MT',
      origin: 'EU (Germany / Poland)',
      lead_time_days: 21,
      certifications: 'EN 10204 3.1, ISO 9001',
      co2_kg_per_unit: 1850,
      hs_code: '7208'
    },
    options: [{ title: 'Grade', values: ['S235JR', 'S355JR'] }],
    variants: [
      {
        title: 'S235JR',
        allow_backorder: true,
        manage_inventory: true,
        options: { Grade: 'S235JR' },
        prices: [{ amount: 620, currency_code: 'eur' }]
      },
      {
        title: 'S355JR',
        allow_backorder: true,
        manage_inventory: true,
        options: { Grade: 'S355JR' },
        prices: [{ amount: 685, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('hr-steel-coil') }, { url: img('hr-steel-coil-2') }]
  },
  {
    title: 'Recycled Aluminium Ingots 99.7%',
    handle: 'recycled-aluminium-ingots',
    subtitle: 'Low-carbon secondary aluminium, 99.7% purity',
    description:
      'Secondary (recycled) aluminium ingots cast from post-industrial scrap, 99.7% Al minimum. ~95% lower embodied carbon than primary aluminium. Ideal for die-casting, extrusion billet and deoxidation. Spectro analysis provided per lot.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('alu-ingot'),
    metadata: {
      unit: 'metric ton',
      moq: '10 MT',
      origin: 'EU (Netherlands)',
      lead_time_days: 14,
      certifications: 'ASI Performance Standard, ISO 14001',
      co2_kg_per_unit: 560,
      hs_code: '7601'
    },
    options: [{ title: 'Form', values: ['Ingot', 'Billet'] }],
    variants: [
      {
        title: 'Ingot',
        allow_backorder: true,
        manage_inventory: true,
        options: { Form: 'Ingot' },
        prices: [{ amount: 2200, currency_code: 'eur' }]
      },
      {
        title: 'Billet',
        allow_backorder: true,
        manage_inventory: true,
        options: { Form: 'Billet' },
        prices: [{ amount: 2380, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('alu-ingot') }, { url: img('alu-ingot-2') }]
  },
  {
    title: 'Stainless Steel Sheet',
    handle: 'stainless-steel-sheet',
    subtitle: 'Cold-rolled 2B finish, austenitic grades',
    description:
      'Cold-rolled stainless steel sheet with 2B finish for food processing, architecture and chemical equipment. Grades 304 and 316L. Excellent corrosion resistance and weldability. PED/AD2000 documentation available on request.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('ss-sheet'),
    metadata: {
      unit: 'metric ton',
      moq: '5 MT',
      origin: 'EU (Italy)',
      lead_time_days: 18,
      certifications: 'EN 10204 3.1, PED 2014/68/EU',
      co2_kg_per_unit: 2900,
      hs_code: '7219'
    },
    options: [{ title: 'Grade', values: ['304', '316L'] }],
    variants: [
      {
        title: '304',
        allow_backorder: true,
        manage_inventory: true,
        options: { Grade: '304' },
        prices: [{ amount: 2950, currency_code: 'eur' }]
      },
      {
        title: '316L',
        allow_backorder: true,
        manage_inventory: true,
        options: { Grade: '316L' },
        prices: [{ amount: 3680, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('ss-sheet') }, { url: img('ss-sheet-2') }]
  },
  {
    title: 'Recycled PET Flakes (Food-Grade)',
    handle: 'recycled-pet-flakes',
    subtitle: 'Hot-washed, food-contact approved rPET',
    description:
      'Hot-washed, decontaminated post-consumer PET flakes approved for food-contact applications. Clear and light-blue sortations available. IV 0.72–0.80 dl/g. Supports recycled-content targets for bottle-to-bottle and sheet extrusion.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('rpet-flakes'),
    metadata: {
      unit: 'metric ton',
      moq: '20 MT',
      origin: 'EU (France)',
      lead_time_days: 12,
      certifications: 'EFSA, EuCertPlast, GRS',
      co2_kg_per_unit: 450,
      hs_code: '3907'
    },
    options: [{ title: 'Sortation', values: ['Clear', 'Light Blue'] }],
    variants: [
      {
        title: 'Clear',
        allow_backorder: true,
        manage_inventory: true,
        options: { Sortation: 'Clear' },
        prices: [{ amount: 980, currency_code: 'eur' }]
      },
      {
        title: 'Light Blue',
        allow_backorder: true,
        manage_inventory: true,
        options: { Sortation: 'Light Blue' },
        prices: [{ amount: 920, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('rpet-flakes') }, { url: img('rpet-flakes-2') }]
  },
  {
    title: 'HDPE Resin Pellets',
    handle: 'hdpe-resin-pellets',
    subtitle: 'Blow-moulding grade high-density polyethylene',
    description:
      'Virgin and recycled-blend HDPE pellets for blow-moulding and injection. Consistent melt-flow index, high stiffness and chemical resistance. Available with up to 50% PCR content for packaging sustainability targets.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('hdpe-pellets'),
    metadata: {
      unit: 'metric ton',
      moq: '22 MT (FTL)',
      origin: 'EU (Belgium)',
      lead_time_days: 10,
      certifications: 'ISO 9001, REACH',
      co2_kg_per_unit: 1800,
      hs_code: '3901'
    },
    options: [{ title: 'PCR Content', values: ['Virgin', '30% PCR'] }],
    variants: [
      {
        title: 'Virgin',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'PCR Content': 'Virgin' },
        prices: [{ amount: 1180, currency_code: 'eur' }]
      },
      {
        title: '30% PCR',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'PCR Content': '30% PCR' },
        prices: [{ amount: 1090, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('hdpe-pellets') }, { url: img('hdpe-pellets-2') }]
  },
  {
    title: 'Copper Cathode (LME Grade A)',
    handle: 'copper-cathode-grade-a',
    subtitle: '99.99% Cu, LME-registered brand',
    description:
      'Electrolytic copper cathode, 99.99% purity, conforming to BS EN 1978:1998 Cu-CATH-1 and LME Grade A. For wire-rod, busbar and high-conductivity applications. Sourced from LME-registered brands with full chain-of-custody.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('copper-cathode'),
    metadata: {
      unit: 'metric ton',
      moq: '5 MT',
      origin: 'EU (Poland)',
      lead_time_days: 7,
      certifications: 'LME Grade A, BS EN 1978',
      co2_kg_per_unit: 3500,
      hs_code: '7403'
    },
    options: [{ title: 'Packaging', values: ['Bundled', 'Loose'] }],
    variants: [
      {
        title: 'Bundled',
        allow_backorder: true,
        manage_inventory: true,
        options: { Packaging: 'Bundled' },
        prices: [{ amount: 8600, currency_code: 'eur' }]
      },
      {
        title: 'Loose',
        allow_backorder: true,
        manage_inventory: true,
        options: { Packaging: 'Loose' },
        prices: [{ amount: 8520, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('copper-cathode') }, { url: img('copper-cathode-2') }]
  },
  {
    title: 'Portland Cement CEM I 52.5N',
    handle: 'portland-cement-cem-i',
    subtitle: 'High early-strength ordinary Portland cement',
    description:
      'CEM I 52.5N ordinary Portland cement for high-strength structural concrete and precast. Conforms to EN 197-1. Bulk or 25kg bags. Lower-clinker CEM II/B-LL blend available to reduce embodied carbon.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('portland-cement'),
    metadata: {
      unit: 'metric ton',
      moq: '30 MT',
      origin: 'EU (Spain)',
      lead_time_days: 9,
      certifications: 'EN 197-1, CE',
      co2_kg_per_unit: 820,
      hs_code: '2523'
    },
    options: [{ title: 'Packaging', values: ['Bulk', '25kg Bags'] }],
    variants: [
      {
        title: 'Bulk',
        allow_backorder: true,
        manage_inventory: true,
        options: { Packaging: 'Bulk' },
        prices: [{ amount: 105, currency_code: 'eur' }]
      },
      {
        title: '25kg Bags',
        allow_backorder: true,
        manage_inventory: true,
        options: { Packaging: '25kg Bags' },
        prices: [{ amount: 128, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('portland-cement') }, { url: img('portland-cement-2') }]
  },
  {
    title: 'Recycled Kraft Linerboard',
    handle: 'recycled-kraft-linerboard',
    subtitle: '100% recycled testliner for corrugated packaging',
    description:
      '100% recycled testliner and fluting medium for corrugated box production. Grammage 110–200 gsm. High burst and ring-crush strength. FSC Recycled certified, supporting circular packaging supply chains.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('kraft-linerboard'),
    metadata: {
      unit: 'metric ton',
      moq: '20 MT',
      origin: 'EU (Germany)',
      lead_time_days: 15,
      certifications: 'FSC Recycled, ISO 14001',
      co2_kg_per_unit: 680,
      hs_code: '4805'
    },
    options: [{ title: 'Grammage', values: ['140 gsm', '200 gsm'] }],
    variants: [
      {
        title: '140 gsm',
        allow_backorder: true,
        manage_inventory: true,
        options: { Grammage: '140 gsm' },
        prices: [{ amount: 520, currency_code: 'eur' }]
      },
      {
        title: '200 gsm',
        allow_backorder: true,
        manage_inventory: true,
        options: { Grammage: '200 gsm' },
        prices: [{ amount: 560, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('kraft-linerboard') }, { url: img('kraft-linerboard-2') }]
  },
  {
    title: 'Monocrystalline Solar Cells (M10)',
    handle: 'monocrystalline-solar-cells',
    subtitle: 'PERC M10 cells, 22.8% efficiency',
    description:
      'High-efficiency monocrystalline PERC solar cells, M10 (182mm) format, average efficiency 22.8%. For module assembly and renewable-energy projects. Low LID, tight binning, IEC-compliant. Priced per watt-peak.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('solar-cells'),
    metadata: {
      unit: 'watt-peak (Wp)',
      moq: '100 kWp',
      origin: 'EU assembled',
      lead_time_days: 28,
      certifications: 'IEC 60904, ISO 9001',
      co2_kg_per_unit: 0.04,
      hs_code: '8541'
    },
    options: [{ title: 'Efficiency', values: ['22.8%', '23.2%'] }],
    variants: [
      {
        title: '22.8%',
        allow_backorder: true,
        manage_inventory: true,
        options: { Efficiency: '22.8%' },
        prices: [{ amount: 1, currency_code: 'eur' }]
      },
      {
        title: '23.2%',
        allow_backorder: true,
        manage_inventory: true,
        options: { Efficiency: '23.2%' },
        prices: [{ amount: 1, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('solar-cells') }, { url: img('solar-cells-2') }]
  },
  {
    title: 'Caustic Soda Flakes 99% (NaOH)',
    handle: 'caustic-soda-flakes',
    subtitle: 'Industrial-grade sodium hydroxide flakes',
    description:
      'Sodium hydroxide (caustic soda) flakes, 99% min purity, for pulp & paper, water treatment, soap and chemical processing. Packed in 25kg PP bags on shrink-wrapped pallets. SDS and CoA provided per batch.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('caustic-soda'),
    metadata: {
      unit: 'metric ton',
      moq: '18 MT',
      origin: 'EU (Czechia)',
      lead_time_days: 16,
      certifications: 'REACH, ISO 9001',
      co2_kg_per_unit: 1100,
      hs_code: '2815'
    },
    options: [{ title: 'Packaging', values: ['25kg Bags', '1 MT Big Bag'] }],
    variants: [
      {
        title: '25kg Bags',
        allow_backorder: true,
        manage_inventory: true,
        options: { Packaging: '25kg Bags' },
        prices: [{ amount: 450, currency_code: 'eur' }]
      },
      {
        title: '1 MT Big Bag',
        allow_backorder: true,
        manage_inventory: true,
        options: { Packaging: '1 MT Big Bag' },
        prices: [{ amount: 430, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('caustic-soda') }, { url: img('caustic-soda-2') }]
  },
  {
    title: 'Recycled Cotton Yarn (Ne 20/1)',
    handle: 'recycled-cotton-yarn',
    subtitle: 'Mechanically recycled cotton blend yarn',
    description:
      'Open-end recycled cotton yarn, Ne 20/1, blended from pre-consumer textile waste. Reduces water and CO2 vs virgin cotton. For knits, denim and home textiles. GRS-certified with documented recycled content.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('cotton-yarn'),
    metadata: {
      unit: 'metric ton',
      moq: '2 MT',
      origin: 'EU (Italy)',
      lead_time_days: 20,
      certifications: 'GRS, OEKO-TEX',
      co2_kg_per_unit: 2100,
      hs_code: '5205'
    },
    options: [{ title: 'Recycled Content', values: ['50%', '80%'] }],
    variants: [
      {
        title: '50%',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'Recycled Content': '50%' },
        prices: [{ amount: 3200, currency_code: 'eur' }]
      },
      {
        title: '80%',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'Recycled Content': '80%' },
        prices: [{ amount: 3450, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('cotton-yarn') }, { url: img('cotton-yarn-2') }]
  },
  {
    title: 'Polypropylene Woven Bags (50kg)',
    handle: 'polypropylene-woven-bags',
    subtitle: 'UV-stabilised PP bulk bags for dry goods',
    description:
      'Laminated/unlaminated polypropylene woven bags for cement, grain, fertiliser and aggregates. 50kg capacity, UV-stabilised, custom printing available. Recyclable mono-material construction. Priced per unit.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('pp-bags'),
    metadata: {
      unit: 'unit',
      moq: '50,000 units',
      origin: 'EU (Poland)',
      lead_time_days: 25,
      certifications: 'ISO 9001, food-grade option',
      co2_kg_per_unit: 0.18,
      hs_code: '6305'
    },
    options: [{ title: 'Lamination', values: ['Laminated', 'Unlaminated'] }],
    variants: [
      {
        title: 'Laminated',
        allow_backorder: true,
        manage_inventory: true,
        options: { Lamination: 'Laminated' },
        prices: [{ amount: 1, currency_code: 'eur' }]
      },
      {
        title: 'Unlaminated',
        allow_backorder: true,
        manage_inventory: true,
        options: { Lamination: 'Unlaminated' },
        prices: [{ amount: 1, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('pp-bags') }, { url: img('pp-bags-2') }]
  },
  {
    title: 'Solar Kit',
    handle: 'solar-kit',
    subtitle: 'Grid-tied rooftop kit — modules, inverter & BOS',
    description: SOLAR_KIT_DESCRIPTION,
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('solar-kit-exide'),
    metadata: {
      catalog_handle: 'solar-kit',
      catalog_title: 'Solar Kit',
      is_catalog_primary: true,
      brand_name: 'Exide',
      brand_slug: 'exide',
      unit: 'kit',
      moq: '10 kits',
      origin: 'EU (Germany)',
      lead_time_days: 21,
      certifications: 'IEC 61215, IEC 61730',
      inverter_efficiency: 97,
      module_efficiency: 21.5,
      panel_wattage: '550 Wp',
      warranty_years: 12,
      sector_tags: ['energy']
    },
    options: [{ title: 'System size', values: ['5 kWp', '10 kWp'] }],
    variants: [
      {
        title: '5 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '5 kWp' },
        prices: [{ amount: 4200, currency_code: 'eur' }]
      },
      {
        title: '10 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '10 kWp' },
        prices: [{ amount: 7800, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('solar-kit-exide') }, { url: img('solar-kit-exide-2') }]
  },
  {
    title: 'Solar Kit — Luminous',
    handle: 'solar-kit-luminous',
    subtitle: 'Luminous grid-tied rooftop kit',
    description: SOLAR_KIT_DESCRIPTION,
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('solar-kit-luminous'),
    metadata: {
      catalog_handle: 'solar-kit',
      brand_name: 'Luminous',
      brand_slug: 'luminous',
      unit: 'kit',
      moq: '5 kits',
      origin: 'India / EU distribution',
      lead_time_days: 28,
      certifications: 'IEC 61215, BIS',
      inverter_efficiency: 90,
      module_efficiency: 20.2,
      panel_wattage: '540 Wp',
      warranty_years: 10,
      sector_tags: ['energy']
    },
    options: [{ title: 'System size', values: ['5 kWp', '8 kWp'] }],
    variants: [
      {
        title: '5 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '5 kWp' },
        prices: [{ amount: 3900, currency_code: 'eur' }]
      },
      {
        title: '8 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '8 kWp' },
        prices: [{ amount: 6100, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('solar-kit-luminous') }, { url: img('solar-kit-luminous-2') }]
  },
  {
    title: 'Solar Kit — SolarEdge',
    handle: 'solar-kit-solaredge',
    subtitle: 'SolarEdge optimized DC kit',
    description: SOLAR_KIT_DESCRIPTION,
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('solar-kit-solaredge'),
    metadata: {
      catalog_handle: 'solar-kit',
      brand_name: 'SolarEdge',
      brand_slug: 'solaredge',
      unit: 'kit',
      moq: '8 kits',
      origin: 'EU (Israel / Netherlands)',
      lead_time_days: 24,
      certifications: 'IEC 62109, IEC 61215',
      inverter_efficiency: 97,
      module_efficiency: 21.8,
      panel_wattage: '560 Wp',
      warranty_years: 15,
      sector_tags: ['energy']
    },
    options: [{ title: 'System size', values: ['6 kWp', '12 kWp'] }],
    variants: [
      {
        title: '6 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '6 kWp' },
        prices: [{ amount: 5100, currency_code: 'eur' }]
      },
      {
        title: '12 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '12 kWp' },
        prices: [{ amount: 9200, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('solar-kit-solaredge') }, { url: img('solar-kit-solaredge-2') }]
  },
  {
    title: 'Solar Kit — Thinker',
    handle: 'solar-kit-thinker',
    subtitle: 'Thinker hybrid-ready solar kit',
    description: SOLAR_KIT_DESCRIPTION,
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('solar-kit-thinker'),
    metadata: {
      catalog_handle: 'solar-kit',
      brand_name: 'Thinker',
      brand_slug: 'thinker',
      unit: 'kit',
      moq: '6 kits',
      origin: 'EU (Poland)',
      lead_time_days: 18,
      certifications: 'IEC 61215, CE',
      inverter_efficiency: 93,
      module_efficiency: 20.8,
      panel_wattage: '545 Wp',
      warranty_years: 12,
      sector_tags: ['energy']
    },
    options: [{ title: 'System size', values: ['5 kWp', '10 kWp'] }],
    variants: [
      {
        title: '5 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '5 kWp' },
        prices: [{ amount: 4050, currency_code: 'eur' }]
      },
      {
        title: '10 kWp',
        allow_backorder: true,
        manage_inventory: true,
        options: { 'System size': '10 kWp' },
        prices: [{ amount: 7600, currency_code: 'eur' }]
      }
    ],
    discountable: true,
    images: [{ url: img('solar-kit-thinker') }, { url: img('solar-kit-thinker-2') }]
  },
  {
    title: 'Chain-of-Custody Verification Service',
    handle: 'chain-of-custody-verification',
    subtitle: 'Third-party GRS / ISCC / ASI audit & documentation',
    description:
      'Independent chain-of-custody verification for recycled content, bio-based inputs and low-carbon material claims. Desk review plus on-site sampling, certificate issuance and buyer-ready evidence packs. Suitable for apparel, construction and energy supply chains.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: img('coc-service'),
    metadata: {
      unit: 'engagement',
      moq: '1 site',
      origin: 'EU (remote + on-site)',
      lead_time_days: 10,
      certifications: 'ISO 17020 aligned process',
      listing_type: 'service',
      sector_tags: ['energy', 'construction', 'textiles']
    },
    options: [{ title: 'Scope', values: ['Desk review', 'Full audit'] }],
    variants: [
      {
        title: 'Desk review',
        allow_backorder: true,
        manage_inventory: false,
        options: { Scope: 'Desk review' },
        prices: [{ amount: 2500, currency_code: 'eur' }]
      },
      {
        title: 'Full audit',
        allow_backorder: true,
        manage_inventory: false,
        options: { Scope: 'Full audit' },
        prices: [{ amount: 8500, currency_code: 'eur' }]
      }
    ],
    discountable: false,
    images: [{ url: img('coc-service') }, { url: img('coc-service-2') }]
  }
]
