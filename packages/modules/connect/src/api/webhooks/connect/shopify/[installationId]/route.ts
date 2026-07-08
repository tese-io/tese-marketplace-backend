import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  normalizeShopifyProduct,
  verifyShopifyWebhook
} from '../../../../../providers/shopify'
import {
  archiveExternalProduct,
  runInboundSync
} from '../../../../../services/sync-orchestrator'
import {
  getInstallationCredentials,
  getShopifyAppConfig,
  resolveConnectService
} from '../../../../utils'

export const POST = async (
  req: MedusaRequest<{ installationId: string }>,
  res: MedusaResponse
) => {
  const connectService = await resolveConnectService(req.scope)
  const installationId = req.params.installationId

  const installations = await connectService.listConnectorInstallations({
    id: installationId,
    provider: 'shopify'
  })
  const installation = installations[0]

  if (!installation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Shopify installation not found'
    )
  }

  const credential = await getInstallationCredentials(
    connectService,
    installation.id
  )

  if (!credential) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Missing Shopify credentials'
    )
  }

  const { clientSecret } = getShopifyAppConfig()
  const hmac = req.headers['x-shopify-hmac-sha256'] as string | undefined
  // HMAC must be computed over Shopify's exact byte stream — preserved by the
  // preserveRawBody middleware. Never fall back to re-serializing req.body.
  const rawBody = req.rawBody

  if (!clientSecret) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Shopify webhook secret is not configured'
    )
  }
  if (!rawBody) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Raw request body unavailable — cannot verify webhook signature'
    )
  }
  if (!verifyShopifyWebhook(rawBody, hmac, clientSecret)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Invalid Shopify webhook signature'
    )
  }

  const topic = String(req.headers['x-shopify-topic'] || '')
  const body = req.body as Record<string, unknown>

  if (topic === 'products/delete') {
    const externalId = String((body as { id?: string | number }).id || '')

    if (externalId) {
      await archiveExternalProduct(req.scope, {
        installationId: installation.id,
        sellerId: installation.seller_id,
        externalId
      })
    }

    await connectService.updateConnectorInstallations({
      id: installation.id,
      last_sync_at: new Date(),
      last_sync_status: 'completed'
    })

    res.status(200).json({ received: true, action: 'archived', topic })
    return
  }

  const productPayload = (body as any).product || body

  if (!productPayload?.id) {
    res.status(200).json({ received: true, action: 'ignored' })
    return
  }

  const normalized = normalizeShopifyProduct(productPayload)
  const syncConfig = (installation.sync_config || {}) as Record<string, unknown>

  await runInboundSync(req.scope, {
    installationId: installation.id,
    sellerId: installation.seller_id,
    provider: 'shopify',
    products: [normalized],
    requireApproval: Boolean(syncConfig.require_approval)
  })

  await connectService.updateConnectorInstallations({
    id: installation.id,
    last_sync_at: new Date(),
    last_sync_status: 'completed'
  })

  res.status(200).json({ received: true, topic })
}
