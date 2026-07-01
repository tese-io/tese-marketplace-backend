import { ProductStatus } from '@medusajs/framework/utils'

/** Mongo store_product document (subset used for migration). */
export type MongoStoreProduct = {
  _id: { toString(): string } | string
  id?: number
  title?: string
  handle?: string
  body_html?: string
  vendor?: string
  product_type?: string
  product_category?: string
  tags?: unknown[]
  variants?: Array<{
    title?: string
    price?: string
    sku?: string
    option1?: string
    option2?: string
    option3?: string
    manage_inventory?: boolean
  }>
  options?: Array<{
    name?: string
    values?: unknown[]
  }>
  images?: Array<{ src?: string; alt?: string }>
  image?: { src?: string }
  metafields?: Record<string, unknown>
  review_status?: string
  isArchived?: boolean
  tenant_id?: { toString(): string } | string
  updatedAt?: Date | string
  updated_at?: Date | string
}

export type MongoTenant = {
  _id: { toString(): string } | string
  company_name?: string
  headquarter_location?: unknown
}

export const CNI_METADATA_KEYS = [
  'useCases',
  'industryFocus',
  'esgMetrics',
  'serviceCapabilities',
  'serviceOptions',
  'purchaseType',
  'vendorProfileHandle',
  'keyFeatures',
  'specifications',
  'certificationsImages',
  'environmentalImpactMetrics',
  'supportingDocuments',
  'faqs',
  'sustainabilityStrategy',
  'sdgImpactImages'
] as const

export function mongoId (value: MongoStoreProduct['_id'] | undefined): string {
  if (!value) return ''
  return typeof value === 'string' ? value : value.toString()
}

export function mapReviewStatusToMedusa (
  reviewStatus?: string,
  isArchived?: boolean
): ProductStatus {
  if (isArchived) return ProductStatus.DRAFT
  const status = String(reviewStatus || 'APPROVED').toUpperCase()
  if (status === 'APPROVED') return ProductStatus.PUBLISHED
  if (status === 'REJECTED') return ProductStatus.REJECTED
  return ProductStatus.PROPOSED
}

export function normalizeProductType (productType?: string): 'PRODUCT' | 'SERVICE' {
  const value = String(productType || 'Product').toUpperCase()
  return value === 'SERVICE' ? 'SERVICE' : 'PRODUCT'
}

function parsePrice (raw?: string): number | null {
  if (raw == null || raw === '') return null
  const n = Number.parseFloat(String(raw))
  return Number.isFinite(n) ? n : null
}

function buildOptions (doc: MongoStoreProduct) {
  const mongoOptions = Array.isArray(doc.options) ? doc.options : []
  if (mongoOptions.length > 0) {
    return mongoOptions
      .filter((o) => o?.name && Array.isArray(o.values) && o.values.length)
      .map((o) => ({
        title: String(o.name),
        values: o.values!.map((v) => String(v))
      }))
  }
  return [{ title: 'Default', values: ['Default'] }]
}

function buildVariants (doc: MongoStoreProduct, options: ReturnType<typeof buildOptions>) {
  const mongoVariants = Array.isArray(doc.variants) ? doc.variants : []
  const optionTitle = options[0]?.title || 'Default'

  if (mongoVariants.length === 0) {
    return [{
      title: doc.title || 'Default',
      manage_inventory: false,
      options: { [optionTitle]: 'Default' },
      prices: [{ amount: 0, currency_code: 'usd' }]
    }]
  }

  return mongoVariants.map((variant, index) => {
    const optionValue =
      variant.option1 ||
      variant.title ||
      options[0]?.values?.[index] ||
      'Default'
    const amount = parsePrice(variant.price) ?? 0

    return {
      title: variant.title || String(optionValue) || `Variant ${index + 1}`,
      sku: variant.sku,
      manage_inventory: false,
      options: { [optionTitle]: String(optionValue) },
      prices: [{ amount, currency_code: 'usd' }]
    }
  })
}

function buildImages (doc: MongoStoreProduct) {
  const images: Array<{ url: string }> = []
  if (Array.isArray(doc.images)) {
    for (const img of doc.images) {
      if (img?.src) images.push({ url: String(img.src) })
    }
  }
  if (images.length === 0 && doc.image && typeof doc.image === 'object' && doc.image.src) {
    images.push({ url: String(doc.image.src) })
  }
  return images
}

export function buildMedusaMetadata (doc: MongoStoreProduct): Record<string, unknown> {
  const metafields =
    doc.metafields && typeof doc.metafields === 'object' ? doc.metafields : {}

  const metadata: Record<string, unknown> = {
    product_type: normalizeProductType(doc.product_type),
    product_category: doc.product_category || '',
    mongo_tenant_id: doc.tenant_id ? mongoId(doc.tenant_id as MongoStoreProduct['_id']) : '',
    shopify_product_id: doc.id ?? null,
    migrated_from: 'mongo_store_product',
    migrated_at: new Date().toISOString()
  }

  for (const key of CNI_METADATA_KEYS) {
    if (metafields[key] !== undefined) {
      metadata[key] = metafields[key]
    }
  }

  return metadata
}

export function mapMongoStoreProductToMedusaInput (
  doc: MongoStoreProduct,
  salesChannelId: string
) {
  const options = buildOptions(doc)
  const variants = buildVariants(doc, options)
  const images = buildImages(doc)
  const handle =
    doc.handle ||
    String(doc.title || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  return {
    title: String(doc.title || 'Untitled'),
    handle,
    description: doc.body_html || '',
    status: mapReviewStatusToMedusa(doc.review_status, doc.isArchived),
    external_id: mongoId(doc._id),
    thumbnail: images[0]?.url,
    metadata: buildMedusaMetadata(doc),
    options,
    variants,
    images,
    sales_channels: [{ id: salesChannelId }]
  }
}

export function validateCniMetadataCoverage (metadata: Record<string, unknown>) {
  const missing: string[] = []
  for (const key of ['useCases', 'industryFocus', 'esgMetrics'] as const) {
    const value = metadata[key]
    if (value == null) missing.push(key)
  }
  return { ok: missing.length === 0, missing }
}

/** Reverse shape for legacy admin proxy responses. */
export function mapMedusaProductToMongoShape (product: Record<string, unknown>) {
  const metadata = (product.metadata || {}) as Record<string, unknown>
  return {
    _id: product.external_id || product.id,
    id: metadata.shopify_product_id ?? null,
    title: product.title,
    handle: product.handle,
    body_html: product.description,
    product_type: metadata.product_type || 'Product',
    product_category: metadata.product_category || '',
    review_status: product.status === 'published' ? 'APPROVED' : String(product.status || '').toUpperCase(),
    isArchived: product.status === 'draft',
    metafields: metadata,
    medusa_product_id: product.id
  }
}
