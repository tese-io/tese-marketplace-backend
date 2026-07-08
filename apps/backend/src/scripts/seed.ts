import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  createAdminUser,
  createConfigurationRules,
  createDefaultCommissionLevel,
  createProductsForSeller,
  createProductCategories,
  createProductCollections,
  createPublishableKey,
  createRegions,
  createSalesChannel,
  createSellerInventoryLevels,
  createStore,
  groupProductHandlesBySeller,
  provisionMarketplaceSeller,
  SEED_SELLER_PROFILES,
  type SeedSellerKey,
} from './seed/seed-functions'

export default async function seedMarketplaceData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info('=== Configurations ===')
  logger.info('Creating admin user...')
  await createAdminUser(container)
  logger.info('Creating default sales channel...')
  const salesChannel = await createSalesChannel(container)
  logger.info('Creating default regions...')
  const region = await createRegions(container)
  logger.info('Creating publishable api key...')
  const apiKey = await createPublishableKey(container, salesChannel.id)
  logger.info('Creating store data...')
  await createStore(container, salesChannel.id, region.id)
  logger.info('Creating configuration rules...')
  await createConfigurationRules(container)

  logger.info('=== Example data ===')
  logger.info('Creating product categories...')
  await createProductCategories(container)
  logger.info('Creating product collections...')
  await createProductCollections(container)

  logger.info('Provisioning marketplace sellers...')
  const sellerGroups = groupProductHandlesBySeller()
  const provisioned: Record<
    SeedSellerKey,
    { sellerId: string; stockLocationId: string }
  > = {} as Record<SeedSellerKey, { sellerId: string; stockLocationId: string }>

  for (const sellerKey of Object.keys(SEED_SELLER_PROFILES) as SeedSellerKey[]) {
    const profile = SEED_SELLER_PROFILES[sellerKey]
    logger.info(`  → ${profile.sellerName}`)
    const { seller, stockLocation } = await provisionMarketplaceSeller(
      container,
      salesChannel.id,
      region.id,
      profile
    )
    provisioned[sellerKey] = {
      sellerId: seller.id,
      stockLocationId: stockLocation.id,
    }
  }

  logger.info('Creating seller product listings...')
  for (const sellerKey of Object.keys(sellerGroups) as SeedSellerKey[]) {
    const handles = sellerGroups[sellerKey]
    if (!handles.length) continue
    logger.info(`  → ${handles.length} listings for ${SEED_SELLER_PROFILES[sellerKey].sellerName}`)
    await createProductsForSeller(
      container,
      provisioned[sellerKey].sellerId,
      salesChannel.id,
      handles
    )
  }

  logger.info('Creating inventory levels per seller...')
  for (const sellerKey of Object.keys(provisioned) as SeedSellerKey[]) {
    await createSellerInventoryLevels(
      container,
      provisioned[sellerKey].sellerId,
      provisioned[sellerKey].stockLocationId
    )
  }

  logger.info('Creating default commission...')
  await createDefaultCommissionLevel(container)

  logger.info('=== Finished ===')
  logger.info(`Publishable api key: ${apiKey.token}`)
  logger.info(`Admin panel access:`)
  logger.info(`email: admin@mercurjs.com`)
  logger.info(`pass: supersecret`)
  logger.info(`Vendor panel access (primary):`)
  logger.info(`email: seller@mercurjs.com`)
  logger.info(`pass: secret`)
  logger.info(`Solar kit vendors also seeded: exide-solar@tese.io, luminous@tese.io, solaredge@tese.io, thinker@tese.io (pass: secret)`)
}
