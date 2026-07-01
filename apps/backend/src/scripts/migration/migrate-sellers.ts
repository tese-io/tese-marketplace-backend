import * as fs from 'fs'
import * as path from 'path'

import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createProductsWorkflow, createShippingProfilesWorkflow } from '@medusajs/medusa/core-flows'
import { MongoClient } from 'mongodb'

import { SELLER_MODULE, SellerModuleService } from '@mercurjs/b2c-core/modules/seller'

import {
  mapMongoStoreProductToMedusaInput,
  mongoId,
  MongoStoreProduct,
  MongoTenant
} from './mongo-medusa-mapping'
import { createSalesChannel } from '../seed/seed-functions'

const MIGRATION_LOG_DIR = path.join(process.cwd(), 'migration-logs')
const TENANT_SELLER_MAP_FILE = path.join(MIGRATION_LOG_DIR, 'tenant-seller-map.json')
const PRODUCT_MAP_FILE = path.join(MIGRATION_LOG_DIR, 'product-id-map.json')

type TenantSellerMap = Record<string, string>

function loadJsonMap<T> (filePath: string): T {
  if (!fs.existsSync(filePath)) return {} as T
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

function saveJsonMap (filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function sellerHandleForTenant (tenantId: string, vendorHandle?: string) {
  if (vendorHandle) {
    return String(vendorHandle)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
  }
  return `tenant-${tenantId}`
}

export async function resolveOrCreateSellerForTenant (
  container: MedusaContainer,
  tenant: MongoTenant,
  fallbackVendorName?: string
): Promise<string> {
  const tenantId = mongoId(tenant._id)
  const existingMap = loadJsonMap<TenantSellerMap>(TENANT_SELLER_MAP_FILE)
  if (existingMap[tenantId]) return existingMap[tenantId]

  const sellerService = container.resolve<SellerModuleService>(SELLER_MODULE)
  const handle = sellerHandleForTenant(tenantId)
  const [existing] = await sellerService.listSellers({ handle })
  if (existing?.id) {
    existingMap[tenantId] = existing.id
    saveJsonMap(TENANT_SELLER_MAP_FILE, existingMap)
    return existing.id
  }

  const name =
    (tenant.company_name && String(tenant.company_name).trim()) ||
    (fallbackVendorName && String(fallbackVendorName).trim()) ||
    `Vendor ${tenantId.slice(-6)}`

  const seller = await sellerService.createSellers({
    name,
    handle,
    email: `${handle}@migration.local`
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const { result: profiles } = await createShippingProfilesWorkflow.run({
    container,
    input: {
      data: [{ type: 'default', name: `${seller.id}:Default shipping profile` }]
    }
  })

  await link.create({
    [SELLER_MODULE]: { seller_id: seller.id },
    [Modules.FULFILLMENT]: { shipping_profile_id: profiles[0].id }
  })

  existingMap[tenantId] = seller.id
  saveJsonMap(TENANT_SELLER_MAP_FILE, existingMap)
  return seller.id
}

export async function migrateMongoStoreProducts ({
  container,
  mongoUrl,
  dryRun = false,
  limit
}: {
  container: MedusaContainer
  mongoUrl: string
  dryRun?: boolean
  limit?: number
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const salesChannel = await createSalesChannel(container)

  const client = new MongoClient(mongoUrl)
  await client.connect()
  const db = client.db()

  const query = {
    review_status: 'APPROVED',
    isArchived: { $ne: true },
    title: { $exists: true, $nin: ['', null] }
  }

  const cursor = db
    .collection<MongoStoreProduct>('store_products')
    .find(query)
    .sort({ updatedAt: -1 })

  if (limit) cursor.limit(limit)

  const productMap: Record<string, string> = loadJsonMap(PRODUCT_MAP_FILE)
  let migrated = 0
  let skipped = 0
  let failed = 0

  for await (const doc of cursor) {
    const externalId = mongoId(doc._id)
    try {
      const [existing] = await productService.listProducts(
        { external_id: externalId },
        { select: ['id', 'external_id'], take: 1 }
      )
      if (existing) {
        productMap[externalId] = existing.id
        skipped++
        continue
      }

      let sellerId: string | null = null
      if (doc.tenant_id) {
        const tenant = await db
          .collection<MongoTenant>('tenants')
          .findOne({ _id: doc.tenant_id as never })
        if (tenant) {
          sellerId = await resolveOrCreateSellerForTenant(
            container,
            tenant,
            doc.vendor
          )
        }
      }

      const productInput = mapMongoStoreProductToMedusaInput(doc, salesChannel.id)

      if (dryRun) {
        logger.info(`[dry-run] would migrate ${externalId}: ${productInput.title}`)
        migrated++
        continue
      }

      const { result } = await createProductsWorkflow.run({
        container,
        input: {
          products: [productInput],
          additional_data: sellerId ? { seller_id: sellerId } : {}
        }
      })

      const created = result?.[0]
      if (created?.id) {
        productMap[externalId] = created.id
        migrated++
        logger.info(`Migrated ${externalId} → ${created.id} (${productInput.title})`)
      }
    } catch (err) {
      failed++
      logger.error(`Failed to migrate ${externalId}: ${(err as Error).message}`)
    }
  }

  saveJsonMap(PRODUCT_MAP_FILE, productMap)
  await client.close()

  return { migrated, skipped, failed, productMapPath: PRODUCT_MAP_FILE }
}
