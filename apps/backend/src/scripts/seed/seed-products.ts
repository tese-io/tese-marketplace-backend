import { ProductStatus } from '@medusajs/framework/utils'

/**
 * TESE.io-relevant products and services for seed.
 * Sustainability, ESG, carbon accounting, consulting, training, audits.
 */

export const productsToInsert = [
  // —— Services (request quote) ——
  {
    title: 'Corporate Carbon Footprint (Scope 1 & 2)',
    handle: 'corporate-carbon-footprint-scope-1-2',
    subtitle: 'Annual GHG inventory and report',
    description:
      'Annual corporate carbon footprint (Scope 1 & 2) with activity data review, emission factors and GHG Protocol alignment. Deliverables: report and Excel inventory.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: false,
    metadata: {
      listing_type: 'service',
      request_quote_only: true,
      duration_text: '1–2 weeks',
      price_range_min: 500,
      price_range_max: 2000
    },
    variants: [
      {
        title: 'Default',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Type: 'Default' },
        prices: [{ currency_code: 'eur', amount: 0 }]
      }
    ],
    options: [{ title: 'Type', values: ['Default'] }],
    images: []
  },
  {
    title: 'ESG Consulting Session',
    handle: 'esg-consulting-session',
    subtitle: 'Strategy and reporting guidance',
    description:
      'One-on-one ESG consulting session: materiality, reporting framework alignment (GRI, SASB, TCFD), and action plan. Ideal for SMEs starting their sustainability journey.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: false,
    metadata: {
      listing_type: 'service',
      request_quote_only: true,
      duration_text: '1 hour',
      price_range_min: 150,
      price_range_max: 300
    },
    variants: [
      {
        title: 'Default',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Type: 'Default' },
        prices: [{ currency_code: 'eur', amount: 0 }]
      }
    ],
    options: [{ title: 'Type', values: ['Default'] }],
    images: []
  },
  {
    title: 'Science-Based Targets (SBT) Advisory',
    handle: 'science-based-targets-advisory',
    subtitle: 'SBTi alignment and target setting',
    description:
      'Support for setting and validating science-based targets (SBTi): scope 1–3 baseline, reduction pathway, and submission package. For companies committed to net-zero alignment.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: false,
    metadata: {
      listing_type: 'service',
      request_quote_only: true,
      duration_text: '4–8 weeks',
      price_range_min: 3000,
      price_range_max: 8000
    },
    variants: [
      {
        title: 'Default',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Type: 'Default' },
        prices: [{ currency_code: 'eur', amount: 0 }]
      }
    ],
    options: [{ title: 'Type', values: ['Default'] }],
    images: []
  },
  {
    title: 'Life Cycle Assessment (LCA)',
    handle: 'life-cycle-assessment',
    subtitle: 'Product or service footprint',
    description:
      'LCA for product or service: system boundary, data collection, impact assessment (e.g. GWP, water, land use). Compliant with ISO 14040/14044. Optional EPD support.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: false,
    metadata: {
      listing_type: 'service',
      request_quote_only: true,
      duration_text: '2–6 weeks',
      price_range_min: 2000,
      price_range_max: 6000
    },
    variants: [
      {
        title: 'Default',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Type: 'Default' },
        prices: [{ currency_code: 'eur', amount: 0 }]
      }
    ],
    options: [{ title: 'Type', values: ['Default'] }],
    images: []
  },
  {
    title: 'Sustainability Report Assurance',
    handle: 'sustainability-report-assurance',
    subtitle: 'Limited or reasonable assurance',
    description:
      'Third-party assurance on sustainability or non-financial report (GRI, TCFD, or custom). Limited or reasonable assurance depending on scope and maturity.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: false,
    metadata: {
      listing_type: 'service',
      request_quote_only: true,
      duration_text: '4–12 weeks',
      price_range_min: 5000,
      price_range_max: 15000
    },
    variants: [
      {
        title: 'Default',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Type: 'Default' },
        prices: [{ currency_code: 'eur', amount: 0 }]
      }
    ],
    options: [{ title: 'Type', values: ['Default'] }],
    images: []
  },
  // —— Services (with price) ——
  {
    title: 'Sustainable Packaging Audit',
    handle: 'sustainable-packaging-audit',
    subtitle: 'Single-site packaging review',
    description:
      'On-site or remote audit of packaging materials and processes with recommendations to reduce waste and align with circular economy principles. Includes a short report and action checklist.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: true,
    metadata: {
      listing_type: 'service',
      request_quote_only: false,
      duration_text: '1 day',
      price_range_min: 299,
      price_range_max: 499
    },
    options: [{ title: 'Type', values: ['Remote', 'On-site'] }],
    variants: [
      {
        title: 'Remote',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Type: 'Remote' },
        prices: [{ currency_code: 'eur', amount: 299 }]
      },
      {
        title: 'On-site',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 1,
        options: { Type: 'On-site' },
        prices: [{ currency_code: 'eur', amount: 499 }]
      }
    ],
    images: []
  },
  {
    title: 'Energy Efficiency Audit',
    handle: 'energy-efficiency-audit',
    subtitle: 'Site energy and decarbonisation review',
    description:
      'Assessment of energy use, efficiency measures and decarbonisation options for a site or portfolio. Delivers an actionable roadmap and quick wins.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: true,
    metadata: {
      listing_type: 'service',
      request_quote_only: false,
      duration_text: '1–2 days',
      price_range_min: 499,
      price_range_max: 999
    },
    options: [{ title: 'Scope', values: ['Single site', 'Portfolio (3 sites)'] }],
    variants: [
      {
        title: 'Single site',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Scope: 'Single site' },
        prices: [{ currency_code: 'eur', amount: 499 }]
      },
      {
        title: 'Portfolio (3 sites)',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 1,
        options: { Scope: 'Portfolio (3 sites)' },
        prices: [{ currency_code: 'eur', amount: 999 }]
      }
    ],
    images: []
  },
  {
    title: 'Net-Zero Roadmap Workshop',
    handle: 'net-zero-roadmap-workshop',
    subtitle: 'Half-day strategy workshop',
    description:
      'Facilitated workshop to define net-zero ambition, scope boundaries and high-level roadmap. For leadership and sustainability teams. Includes summary deck.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: true,
    metadata: {
      listing_type: 'service',
      request_quote_only: false,
      duration_text: '0.5 day',
      price_range_min: 399,
      price_range_max: 399
    },
    options: [{ title: 'Type', values: ['Default'] }],
    variants: [
      {
        title: 'Default',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Type: 'Default' },
        prices: [{ currency_code: 'eur', amount: 399 }]
      }
    ],
    images: []
  },
  {
    title: 'Carbon & GHG Reporting Training',
    handle: 'carbon-ghg-reporting-training',
    subtitle: 'Team training on GHG Protocol',
    description:
      'Half-day or full-day training on GHG Protocol, Scope 1–3, data collection and reporting. Tailored to your sector. Includes materials and Q&A.',
    is_giftcard: false,
    status: ProductStatus.PUBLISHED,
    thumbnail: '',
    discountable: true,
    metadata: {
      listing_type: 'service',
      request_quote_only: false,
      duration_text: '0.5–1 day',
      price_range_min: 349,
      price_range_max: 599
    },
    options: [{ title: 'Duration', values: ['Half-day', 'Full-day'] }],
    variants: [
      {
        title: 'Half-day',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 0,
        options: { Duration: 'Half-day' },
        prices: [{ currency_code: 'eur', amount: 349 }]
      },
      {
        title: 'Full-day',
        allow_backorder: true,
        manage_inventory: false,
        variant_rank: 1,
        options: { Duration: 'Full-day' },
        prices: [{ currency_code: 'eur', amount: 599 }]
      }
    ],
    images: []
  }
]

/** Handles of products from the old seed (sneakers, etc.) to remove when re-seeding. */
export const legacySeedHandles = [
  'air-force-1-luxe-unisex-sneakers',
  'new-runner-flag',
  'classic-cupsole-sneakers',
  'storm-96-2k-lite',
  'u574-unisex-sneakers',
  'air-vapormax-2023-flyknit-triple-black-sneakers',
  'reelwind-sneakers',
  'u9060eee',
  'brown-sneakers',
  'green-high-tops',
  'high-sneakers'
]
