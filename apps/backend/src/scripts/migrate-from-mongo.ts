import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { migrateMongoStoreProducts } from './migration/migrate-sellers'

/**
 * Bulk migrate approved Mongo store_products into Medusa/Postgres.
 *
 * Usage:
 *   MONGO_URL=mongodb://... medusa exec ./src/scripts/migrate-from-mongo.ts
 *   MONGO_URL=... MIGRATE_DRY_RUN=true medusa exec ./src/scripts/migrate-from-mongo.ts
 *   MONGO_URL=... MIGRATE_LIMIT=10 medusa exec ./src/scripts/migrate-from-mongo.ts
 */
export default async function migrateFromMongo ({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || ''

  if (!mongoUrl) {
    throw new Error(
      'MONGO_URL (or MONGODB_URI) is required. Example: MONGO_URL=mongodb://localhost:27017/tese_prod_v2'
    )
  }

  const dryRun = process.env.MIGRATE_DRY_RUN === 'true'
  const limit = process.env.MIGRATE_LIMIT
    ? Number.parseInt(process.env.MIGRATE_LIMIT, 10)
    : undefined

  logger.info(`Starting Mongo → Medusa migration (dryRun=${dryRun}, limit=${limit ?? 'none'})`)

  const result = await migrateMongoStoreProducts({
    container,
    mongoUrl,
    dryRun,
    limit
  })

  logger.info(
    `Migration complete: migrated=${result.migrated} skipped=${result.skipped} failed=${result.failed}`
  )
  logger.info(`Product id map: ${result.productMapPath}`)
}
