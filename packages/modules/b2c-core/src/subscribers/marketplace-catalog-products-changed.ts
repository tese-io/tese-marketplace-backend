import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { AlgoliaEvents } from '@mercurjs/framework'

import { syncProductsToMarketplaceCatalog } from '../utils/marketplace-catalog-sync'

export default async function marketplaceCatalogProductsChangedHandler ({
  event,
  container
}: SubscriberArgs<{ ids: string[] }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await syncProductsToMarketplaceCatalog(container, event.data.ids, 'upsert')
    logger.debug(
      `MarketplaceCatalog sync: upserted ${event.data.ids.length} product(s)`
    )
  } catch (error) {
    logger.error(
      `MarketplaceCatalog sync failed for products ${event.data.ids.join(', ')}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: AlgoliaEvents.PRODUCTS_CHANGED,
  context: {
    subscriberId: 'marketplace-catalog-products-changed-handler'
  }
}
