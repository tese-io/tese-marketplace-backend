import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export type SellerEnrichment = {
  latitude?: number | null
  longitude?: number | null
  location_precision?: string | null
  warehouse_country?: string | null
  ship_to_countries?: string[]
  verified_certifications?: string[]
  // Seller-level tese-Verified badge (admin grant, seller.is_verified).
  // Mirrored into MarketplaceCatalog so CNI recommendation cards can
  // render the "Tese-verified" trust chip. Distinct from
  // verified_certifications (cert slugs).
  seller_tese_verified?: boolean
  // Multi-warehouse (Phase 5) — parallel arrays over every warehouse
  // the seller has pinned. Distance in the orchestrator's fuse_rank is
  // now min(distance to each warehouse). The scalar latitude/longitude/
  // warehouse_country above still get populated with the FIRST entry
  // so downstream consumers that only read the singular fields keep
  // working (backward compat).
  warehouse_latitudes?: number[]
  warehouse_longitudes?: number[]
  warehouse_countries?: string[]
}

export type MarketplaceCatalogSyncPayload = {
  action: 'upsert' | 'delete'
  product: Record<string, unknown>
  catalog_product_id?: string
  seller_enrichment?: SellerEnrichment
}

const enrichmentCache = new Map<string, SellerEnrichment>()

/**
 * Build the seller-scoped enrichment blob used to populate the
 * MarketplaceCatalog row's location / shipping / cert fields. Memoised
 * for the lifetime of a sync batch since many products belong to the
 * same seller.
 */
export async function fetchSellerEnrichment (
  container: MedusaContainer,
  sellerId: string
): Promise<SellerEnrichment> {
  if (!sellerId) return {}
  const cached = enrichmentCache.get(sellerId)
  if (cached) return cached

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const enrichment: SellerEnrichment = {}

  // 0) Seller-level tese-Verified badge — the admin grant from
  //    Marketplace Admin → Sellers (seller.is_verified). Own try-block
  //    so a failure here never blocks the location/cert enrichment.
  try {
    const { data: sellers } = await query.graph({
      entity: 'seller',
      fields: ['is_verified'],
      filters: { id: sellerId }
    })
    const seller = (sellers || [])[0] as { is_verified?: boolean } | undefined
    enrichment.seller_tese_verified = Boolean(seller?.is_verified)
  } catch (err) {
    // Non-fatal — leave seller_tese_verified unset
  }

  // 1) Warehouse coords — nearest stock_location_geo to the seller HQ,
  //    picked as the "primary" warehouse for map + distance calc.
  try {
    const { data: locations } = await query.graph({
      entity: 'seller',
      fields: [
        'stock_locations.id',
        'stock_locations.address.country_code',
        'stock_locations.stock_location_geo.latitude',
        'stock_locations.stock_location_geo.longitude',
        'stock_locations.stock_location_geo.location_precision'
      ],
      filters: { id: sellerId }
    })
    const seller = (locations || [])[0] as
      | { stock_locations?: Array<Record<string, any>> }
      | undefined
    const warehouses = (seller?.stock_locations || []).filter((sl) => {
      const g = sl?.stock_location_geo
      return (
        g &&
        Number.isFinite(g.latitude) &&
        Number.isFinite(g.longitude)
      )
    })
    if (warehouses.length > 0) {
      // Primary (backward-compat singular fields) = the first warehouse.
      // Downstream buyer-facing UI reads warehouse_country + latitude +
      // longitude as scalars; keep them behaving exactly as before.
      const primary = warehouses[0]
      enrichment.latitude = Number(primary.stock_location_geo.latitude)
      enrichment.longitude = Number(primary.stock_location_geo.longitude)
      enrichment.location_precision =
        primary.stock_location_geo.location_precision || null
      enrichment.warehouse_country =
        (primary?.address?.country_code || '').toUpperCase() || null

      // Phase 5 multi-warehouse arrays — one entry per pinned warehouse
      // maintained in same order across all three arrays.
      enrichment.warehouse_latitudes = warehouses.map((w) => Number(w.stock_location_geo.latitude))
      enrichment.warehouse_longitudes = warehouses.map((w) => Number(w.stock_location_geo.longitude))
      enrichment.warehouse_countries = warehouses.map(
        (w) => (w?.address?.country_code || '').toUpperCase() || ''
      )
    }
  } catch (err) {
    // Non-fatal — leave warehouse fields unset
  }

  // 2) Ship-to countries — traversal via shipping_options -> service_zones
  //    -> geo_zones. Cheap because Mercur's graph resolves this in one call.
  try {
    const { data: shipping } = await query.graph({
      entity: 'seller',
      fields: [
        'shipping_options.service_zone.geo_zones.country_code'
      ],
      filters: { id: sellerId }
    })
    const seller = (shipping || [])[0] as
      | { shipping_options?: Array<Record<string, any>> }
      | undefined
    const set = new Set<string>()
    for (const opt of seller?.shipping_options || []) {
      const zones = opt?.service_zone?.geo_zones || []
      for (const gz of zones) {
        const cc = (gz?.country_code || '').toUpperCase()
        if (cc) set.add(cc)
      }
    }
    if (set.size > 0) enrichment.ship_to_countries = Array.from(set)
  } catch (err) {
    // Non-fatal — leave ship_to_countries unset
  }

  // 3) Verified certifications — slugs of seller_certification rows
  //    with verification_status='verified' and not expired.
  try {
    const { data: certs } = await query.graph({
      entity: 'seller',
      fields: [
        'seller_certifications.certification_slug',
        'seller_certifications.verification_status',
        'seller_certifications.expires_at'
      ],
      filters: { id: sellerId }
    })
    const seller = (certs || [])[0] as
      | { seller_certifications?: Array<Record<string, any>> }
      | undefined
    const now = Date.now()
    const slugs: string[] = []
    for (const c of seller?.seller_certifications || []) {
      if (c?.verification_status !== 'verified') continue
      if (c?.expires_at) {
        const expiresMs = new Date(c.expires_at).getTime()
        if (Number.isFinite(expiresMs) && expiresMs < now) continue
      }
      if (c?.certification_slug) slugs.push(String(c.certification_slug))
    }
    if (slugs.length > 0) enrichment.verified_certifications = slugs
  } catch (err) {
    // Non-fatal — leave verified_certifications unset
  }

  enrichmentCache.set(sellerId, enrichment)
  return enrichment
}

export function clearSellerEnrichmentCache () {
  enrichmentCache.clear()
}

export async function fetchProductsForCatalogSync (
  container: MedusaContainer,
  ids: string[]
) {
  if (!ids.length) return []

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: 'product',
    fields: [
      'id',
      'title',
      'handle',
      'description',
      'status',
      'external_id',
      'metadata',
      'thumbnail',
      // Fallback for the card image: products whose media was uploaded
      // without an explicit thumbnail still get images[0].url projected
      // into MarketplaceCatalog.product_image_url by the orchestrator.
      'images.*',
      'updated_at',
      'tags.*',
      'variants.*',
      'variants.prices.*',
      'seller.id',
      'seller.name',
      'seller.handle',
      'seller.metadata',
      // Additive fields for the AI orchestrator's classifier (D20 / P1.9).
      // These give the LLM the strongest taxonomy signal we have. All are
      // resolved by Medusa's product graph resolver; the extension is safe
      // because the receiver at ${ORCHESTRATOR_URL}/api/v1/marketplace/catalog/sync
      // takes product as Dict[str, Any] and existing consumers only read the
      // fields they know about.
      'categories.*',
      'collection.*',
      'type.*'
    ],
    filters: { id: ids }
  })

  return (data || []).map((product: Record<string, unknown>) => {
    const seller = product.seller as Record<string, unknown> | undefined
    const metadata = (product.metadata || {}) as Record<string, unknown>
    // Resolve the tese tenant_id for this seller. Two sources, tried in
    // order:
    //   1. seller.metadata.tese_tenant_id — the explicit, canonical link
    //      written by POST /vendor/sellers/tese when the seller is created.
    //      Doesn't depend on any naming convention.
    //   2. seller.handle prefix — the legacy convention (handle format
    //      "tese-<tenantId>") used to pin the store to a tenant before
    //      metadata was carried explicitly. Kept as a fallback for older
    //      tese-created sellers that pre-date the metadata field.
    // Seed / demo sellers (e.g. EuroMaterials Trading, handle
    // "euromaterials-trading") intentionally have neither — they're not
    // linked to any tese tenant, so tenant_id stays empty which is the
    // correct semantic answer.
    const sellerMetadata = (seller?.metadata || {}) as Record<string, unknown>
    const handle = (seller?.handle || '') as string
    const tenantFromMeta = typeof sellerMetadata.tese_tenant_id === 'string'
      ? (sellerMetadata.tese_tenant_id as string)
      : ''
    const tenantFromHandle = handle.startsWith('tese-')
      ? handle.slice('tese-'.length)
      : ''
    const tenant_id = tenantFromMeta || tenantFromHandle
    return {
      ...product,
      tenant_id,
      vendor_name: seller?.name || metadata.vendor_name,
      vendor: seller?.name,
      tags: Array.isArray(product.tags)
        ? product.tags.map((t: { value?: string }) => t?.value).filter(Boolean)
        : []
    }
  })
}

export async function postMarketplaceCatalogSync (
  payload: MarketplaceCatalogSyncPayload
) {
  const baseUrl = process.env.ORCHESTRATOR_URL || process.env.AI_ORCHESTRATOR_URL
  if (!baseUrl) {
    return { skipped: true, reason: 'ORCHESTRATOR_URL not configured' }
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/marketplace/catalog/sync`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const apiKey = process.env.ORCHESTRATOR_API_KEY || process.env.AI_ORCHESTRATOR_API_KEY
  if (apiKey) headers['X-API-Key'] = apiKey

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Catalog sync failed (${response.status}): ${text}`)
  }

  return { skipped: false }
}

export async function syncProductsToMarketplaceCatalog (
  container: MedusaContainer,
  ids: string[],
  action: 'upsert' | 'delete' = 'upsert'
) {
  if (process.env.MARKETPLACE_CATALOG_SYNC_ENABLED === 'false') {
    return
  }

  if (action === 'delete') {
    for (const id of ids) {
      await postMarketplaceCatalogSync({
        action: 'delete',
        product: { id },
        catalog_product_id: id
      })
    }
    return
  }

  clearSellerEnrichmentCache()
  const products = (await fetchProductsForCatalogSync(container, ids)) as Array<
    Record<string, unknown>
  >
  for (const product of products) {
    const seller = product.seller as Record<string, unknown> | undefined
    const sellerId = seller?.id ? String(seller.id) : ''
    let seller_enrichment: SellerEnrichment | undefined
    if (sellerId) {
      try {
        seller_enrichment = await fetchSellerEnrichment(container, sellerId)
      } catch {
        seller_enrichment = undefined
      }
    }
    await postMarketplaceCatalogSync({
      action: 'upsert',
      product,
      seller_enrichment
    })
  }
}
