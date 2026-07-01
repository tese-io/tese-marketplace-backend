import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { AlgoliaEvents } from '@mercurjs/framework'

import { syncProductsToMarketplaceCatalog } from '../utils/marketplace-catalog-sync'

export default async function marketplaceCatalogProductsDeletedHandler ({
  event,
  container
}: SubscriberArgs<{ ids: string[] }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await syncProductsToMarketplaceCatalog(container, event.data.ids, 'delete')
    logger.debug(
      `MarketplaceCatalog sync: deleted ${event.data.ids.length} product(s)`
    )
  } catch (error) {
    logger.error(
      `MarketplaceCatalog sync delete failed for ${event.data.ids.join(', ')}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: AlgoliaEvents.PRODUCTS_DELETED,
  context: {
    subscriberId: 'marketplace-catalog-products-deleted-handler'
  }
}
