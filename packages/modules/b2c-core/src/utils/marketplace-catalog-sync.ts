import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export type MarketplaceCatalogSyncPayload = {
  action: 'upsert' | 'delete'
  product: Record<string, unknown>
  catalog_product_id?: string
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
      'updated_at',
      'tags.*',
      'variants.*',
      'variants.prices.*',
      'seller.id',
      'seller.name',
      'seller.handle',
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
    return {
      ...product,
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

  const products = await fetchProductsForCatalogSync(container, ids)
  for (const product of products) {
    await postMarketplaceCatalogSync({ action: 'upsert', product })
  }
}
