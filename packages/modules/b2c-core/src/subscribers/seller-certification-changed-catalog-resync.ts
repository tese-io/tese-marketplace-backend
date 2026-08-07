import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { IntermediateEvents } from '@mercurjs/framework'

import sellerProductLink from '../links/seller-product'
import { syncProductsToMarketplaceCatalog } from '../utils/marketplace-catalog-sync'

/**
 * When a seller_certification changes (attached, verified, rejected,
 * removed, or expired), re-sync every product owned by that seller into
 * the MarketplaceCatalog. Without this, the seller's Weaviate rows keep
 * a stale verified_certifications[] snapshot — verifying a cert has no
 * effect on the buyer-side card until the next unrelated product edit
 * happens to re-trigger the products-changed subscriber.
 *
 * Cost is bounded: sellers typically have < 100 products; the
 * downstream syncProductsToMarketplaceCatalog batches the calls and
 * short-circuits when MARKETPLACE_CATALOG_SYNC_ENABLED=false. Failures
 * are logged but not thrown — the cert-verify HTTP response has
 * already flushed to the admin at this point.
 */
export default async function sellerCertificationChangedCatalogResyncHandler ({
  event,
  container
}: SubscriberArgs<{ id: string; seller_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const sellerId = event.data?.seller_id
  if (!sellerId) {
    return
  }

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
      return
    }

    await syncProductsToMarketplaceCatalog(container, productIds, 'upsert')
    logger.debug(
      `MarketplaceCatalog sync (cert change): re-synced ${productIds.length} product(s) for seller ${sellerId}`
    )
  } catch (error) {
    logger.error(
      `MarketplaceCatalog cert-change resync failed for seller ${sellerId}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: IntermediateEvents.SELLER_CERTIFICATION_CHANGED,
  context: {
    subscriberId: 'seller-certification-changed-catalog-resync-handler'
  }
}
