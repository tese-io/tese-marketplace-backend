import type { MedusaContainer } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import {
  createProductsWorkflow,
  updateProductsWorkflow
} from '@medusajs/medusa/core-flows'

import { createConnectRepository } from '../api/connect-repository'
import { resolveMedusaCategoryId } from './category-mapper'
import type { NormalizedProduct, SyncStats } from '../types'
import { emptySyncStats, slugifyHandle } from '../types'

export async function upsertExternalProduct (
  container: MedusaContainer,
  input: {
    installationId: string
    sellerId: string
    product: NormalizedProduct
    provider: string
    requireApproval?: boolean
  }
): Promise<{ action: 'created' | 'updated' | 'skipped'; productId?: string }> {
  const connectService = createConnectRepository(container)

  const installations = await connectService.listConnectorInstallations({
    id: input.installationId,
    seller_id: input.sellerId
  })
  const installation = installations[0]

  if (!installation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Connector installation not found'
    )
  }

  const syncConfig = (installation.sync_config || {}) as Record<string, unknown>
  const fallbackCategoryId = (syncConfig.fallback_category_id as string) || null

  const categoryId = await resolveMedusaCategoryId(
    connectService,
    input.installationId,
    input.product.category_ids?.[0] ?? null,
    fallbackCategoryId
  )

  const existingMaps = await connectService.listExternalEntityMaps({
    installation_id: input.installationId,
    external_type: 'product',
    external_id: input.product.external_id
  })

  const metadata = {
    ...(input.product.metadata || {}),
    [`${input.provider}_product_id`]: input.product.external_id,
    connect_installation_id: input.installationId,
    connect_provider: input.provider
  }

  const productPayload = {
    title: input.product.title,
    description: input.product.description,
    handle: input.product.handle || slugifyHandle(input.product.title),
    status: input.requireApproval ? 'proposed' : (input.product.status || 'published'),
    thumbnail: input.product.thumbnail,
    images: input.product.images,
    tags: input.product.tags,
    options: input.product.options,
    variants: input.product.variants,
    external_id: `${input.provider}:${input.product.external_id}`,
    metadata,
    ...(categoryId ? { categories: [{ id: categoryId }] } : {})
  }

  if (existingMaps.length) {
    const productId = existingMaps[0].medusa_id

    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: productId },
        update: productPayload,
        additional_data: { seller_id: input.sellerId }
      }
    })

    return { action: 'updated', productId }
  }

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [productPayload],
      additional_data: { seller_id: input.sellerId }
    }
  })

  const created = result[0]

  await connectService.createExternalEntityMaps({
    installation_id: input.installationId,
    external_type: 'product',
    external_id: input.product.external_id,
    medusa_id: created.id,
    metadata: { title: input.product.title }
  })

  return { action: 'created', productId: created.id }
}

export async function archiveExternalProduct (
  container: MedusaContainer,
  input: {
    installationId: string
    sellerId: string
    externalId: string
  }
): Promise<{ action: 'archived' | 'skipped'; productId?: string }> {
  const connectService = createConnectRepository(container)

  const existingMaps = await connectService.listExternalEntityMaps({
    installation_id: input.installationId,
    external_type: 'product',
    external_id: input.externalId
  })

  if (!existingMaps.length) {
    return { action: 'skipped' }
  }

  const productId = existingMaps[0].medusa_id

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: productId },
      update: { status: 'draft' },
      additional_data: { seller_id: input.sellerId }
    }
  })

  return { action: 'archived', productId }
}

export async function runInboundSync (
  container: MedusaContainer,
  input: {
    installationId: string
    sellerId: string
    provider: string
    products: NormalizedProduct[]
    requireApproval?: boolean
  }
): Promise<SyncStats> {
  const stats = emptySyncStats()

  for (const product of input.products) {
    try {
      const result = await upsertExternalProduct(container, {
        installationId: input.installationId,
        sellerId: input.sellerId,
        product,
        provider: input.provider,
        requireApproval: input.requireApproval
      })

      if (result.action === 'created') stats.created++
      else if (result.action === 'updated') stats.updated++
      else stats.skipped++
    } catch (err) {
      stats.failed++
    }
  }

  return stats
}
