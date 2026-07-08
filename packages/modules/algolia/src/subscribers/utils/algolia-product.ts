import { z } from 'zod'

import { MedusaContainer } from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  arrayDifference,
} from '@medusajs/framework/utils'


import {
  AlgoliaProductValidator,
  AlgoliaVariantValidator
} from '@mercurjs/framework'

async function selectProductVariantsSupportedCountries(
  container: MedusaContainer,
  product_id: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: 'product_variant',
    fields: ['inventory_items.inventory.location_levels.location_id'],
    filters: {
      product_id
    }
  })

  let location_ids = []

  for (const variant of variants) {
    const inventory_items =
      variant.inventory_items?.map((item) => item.inventory) || []
    const locations = inventory_items
      .flatMap((inventory_item) => inventory_item.location_levels || [])
      .map((level) => level.location_id)

    location_ids = location_ids.concat(locations)
  }

  const { data: stock_locations } = await query.graph({
    entity: 'stock_location',
    fields: ['fulfillment_sets.service_zones.geo_zones.country_code'],
    filters: {
      id: location_ids
    }
  })

  let country_codes = []

  for (const location of stock_locations) {
    const fulfillmentSets =
      location.fulfillment_sets?.flatMap((set) => set.service_zones || []) || []
    const codes = fulfillmentSets
      .flatMap((sz) => sz.geo_zones || [])
      .map((gz) => gz.country_code)

    country_codes = country_codes.concat(codes)
  }

  return [...new Set(country_codes)]
}

async function selectProductSeller(
  container: MedusaContainer,
  product_id: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [product]
  } = await query.graph({
    entity: 'product',
    fields: [
      'seller.id',
      'seller.handle',
      'seller.store_status',
      'seller.is_verified'
    ],
    filters: {
      id: product_id
    }
  })

  return product && product.seller
    ? {
        id: product.seller.id,
        handle: product.seller.handle,
        store_status: product.seller.store_status,
        is_verified: Boolean(product.seller.is_verified)
      }
    : null
}

export async function filterProductsByStatus(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['id', 'status'],
    filters: {
      id: ids
    }
  })

  const published = products.filter((p) => p.status === 'published')
  const notPublished = arrayDifference(products, published)

  const existingIds = new Set(products.map((p) => p.id))

  const deletedIds = ids.filter((id) => !existingIds.has(id))

  return {
    published: published.map((p) => p.id),
    other: [...notPublished.map((p) => p.id), ...deletedIds]
  }
}

export async function findAndTransformAlgoliaProducts(
  container: MedusaContainer,
  ids: string[] = []
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: 'product',
    fields: [
      '*',
      'categories.name',
      'categories.id',
      'categories.handle',
      'categories.metadata',
      'collection.id',
      'collection.title',
      'tags.value',
      'type.value',
      'variants.*',
      'variants.options.*',
      'variants.options.prices.*',
      'variants.prices.*',
      'options.*',
      'options.values.*',
      'images.*',
      'attribute_values.value',
      'attribute_values.attribute.name',
      'attribute_values.attribute.handle',
      'attribute_values.attribute.is_filterable',
      'attribute_values.attribute.ui_component'
    ],
    filters: ids.length
      ? {
          id: ids,
          status: 'published'
        }
      : { status: 'published' }
  })

  for (const product of products) {
    product.average_rating = 0
    product.supported_countries = await selectProductVariantsSupportedCountries(
      container,
      product.id
    )
    product.seller = await selectProductSeller(container, product.id)

    product.options = (product.options ?? [])
      .filter((option) => option?.title && option?.values)
      .map((option) => {
        return option.values.map((value) => {
          const entry = {}
          entry[option.title.toLowerCase()] = value.value
          return entry
        })
      })
      .flat()

    product.variants = z
      .array(AlgoliaVariantValidator)
      .parse(product.variants ?? [])
    // Keep indexed variants slim: Algolia only serves ids + facet/filter data
    // (full product data is hydrated from the DB by the search route), and
    // full variant payloads push multi-variant products over Algolia's
    // 10KB record limit.
    product.variants = (product.variants ?? []).map((variant) => {
      const optionEntries = (variant.options ?? []).reduce((entry, item) => {
        if (item?.option?.title) {
          entry[item.option.title.toLowerCase()] = item.value
        }
        return entry
      }, {})

      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        prices: (variant.prices ?? []).map((price) => ({
          amount: price.amount,
          currency_code: price.currency_code
        })),
        ...optionEntries
      }
    })

    // Not used by search — the store search route hydrates products
    // (incl. images) from the database by id.
    delete product.images

    if (typeof product.description === 'string') {
      product.description = product.description.slice(0, 4000)
    }

    product.attribute_values = (product.attribute_values ?? [])
      .filter(
        (attrValue) =>
          attrValue && attrValue.attribute && attrValue.attribute.name
      )
      .map((attrValue) => {
        return {
          name: attrValue.attribute.name,
          handle: attrValue.attribute.handle,
          value: attrValue.value,
          is_filterable: attrValue.attribute.is_filterable,
          ui_component: attrValue.attribute.ui_component
        }
      })

    Object.assign(product, buildSustainabilityFacets(product))
  }

  return z.array(AlgoliaProductValidator).parse(products)
}

function parseStringList(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean)
      }
    } catch {
      // not JSON — fall through to comma-separated parsing
    }
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

function parseNullableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

const CIRCULAR_PATTERN = /recycl|circular|reclaim|post-consumer|post-industrial/i

/**
 * Flattens product.metadata (and category sector tags) into typed top-level
 * fields so Algolia can facet on them — metadata itself is stripped by
 * AlgoliaProductValidator.
 */
function buildSustainabilityFacets(product: {
  title?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  categories?: {
    handle?: string | null
    metadata?: Record<string, unknown> | null
  }[]
  attribute_values?: {
    handle?: string | null
    value?: string | null
  }[]
  seller?: unknown
}) {
  const meta = product.metadata ?? {}
  const categories = product.categories ?? []

  // Prefer structured attribute values (controlled vocabulary) over the
  // legacy free-text metadata string.
  const structuredCerts = (product.attribute_values ?? [])
    .filter((av) => av?.handle === 'certifications' && av.value)
    .map((av) => String(av.value))

  const sectors = new Set(parseStringList(meta.sector_tags))
  for (const category of categories) {
    parseStringList(category?.metadata?.sector_tags).forEach((tag) =>
      sectors.add(tag)
    )
  }

  const searchableText = `${product.title ?? ''} ${product.description ?? ''}`
  const is_circular =
    CIRCULAR_PATTERN.test(searchableText) ||
    categories.some((c) => c?.handle === 'recycled-materials')

  return {
    has_seller: Boolean(product.seller),
    certifications: structuredCerts.length
      ? structuredCerts
      : parseStringList(meta.certifications),
    origin: meta.origin ? String(meta.origin) : null,
    co2_kg_per_unit: parseNullableNumber(meta.co2_kg_per_unit),
    lead_time_days: parseNullableNumber(meta.lead_time_days),
    moq: meta.moq ? String(meta.moq) : null,
    unit: meta.unit ? String(meta.unit) : null,
    listing_type: meta.listing_type === 'service' ? 'service' : 'product',
    sectors: Array.from(sectors),
    is_circular
  }
}
