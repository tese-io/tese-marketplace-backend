import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { SellerEvents } from '@mercurjs/framework'

import sellerProductLink from '../links/seller-product'
import { syncProductsToMarketplaceCatalog } from '../utils/marketplace-catalog-sync'

/**
 * When a seller profile is updated (name, tese-Verified grant/revoke,
 * contact details), re-sync every product owned by that seller into the
 * MarketplaceCatalog. Without this, the Weaviate rows keep a stale
 * seller snapshot — most visibly, granting the tese-Verified badge in
 * the admin panel never reaches the CNI recommendation cards' trust
 * chip (seller_tese_verified in the seller_enrichment blob), and a
 * seller rename never updates vendor_name on the buyer-side cards.
 *
 * Cost is bounded the same way as the cert-change resync: sellers
 * typically have < 100 products, syncProductsToMarketplaceCatalog
 * batches per-seller enrichment lookups, and it short-circuits when
 * MARKETPLACE_CATALOG_SYNC_ENABLED=false. Failures are logged but not
 * thrown — the seller-update HTTP response has already flushed to the
 * admin at this point.
 */
export default async function sellerUpdatedCatalogResyncHandler ({
  event,
  container
}: SubscriberArgs<{ ids: string[] }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sellerIds = (event.data?.ids || []).filter(Boolean)
  if (!sellerIds.length) {
    return
  }

  for (const sellerId of sellerIds) {
    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: sellerProducts } = await query.graph({
        entity: sellerProductLink.entryPoint,
        fields: ['product.id'],
        filters: {
          seller_id: sellerId,
          deleted_at: { $eq: null }
        }
      })

      const productIds = (sellerProducts as Array<{ product?: { id?: string } }>)
        .map((sp) => sp?.product?.id)
        .filter((id): id is string => Boolean(id))

      if (productIds.length === 0) {
        continue
      }

      await syncProductsToMarketplaceCatalog(container, productIds, 'upsert')
      logger.debug(
        `MarketplaceCatalog sync (seller update): re-synced ${productIds.length} product(s) for seller ${sellerId}`
      )
    } catch (error) {
      logger.error(
        `MarketplaceCatalog seller-update resync failed for seller ${sellerId}:`,
        error
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: SellerEvents.SELLER_UPDATED,
  context: {
    subscriberId: 'seller-updated-catalog-resync-handler'
  }
}
