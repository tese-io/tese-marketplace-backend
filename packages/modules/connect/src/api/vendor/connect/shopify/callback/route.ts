import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  exchangeShopifyToken,
  registerShopifyWebhooks
} from '../../../../../providers/shopify'
import { stringifyCredentialJson } from '../../../../../services/credential-crypto'
import {
  getConnectPublicBaseUrl,
  getShopifyAppConfig,
  resolveConnectService
} from '../../../../utils'
import { consumeOAuthState } from '../auth/route'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { clientId, clientSecret } = getShopifyAppConfig()
  const code = String(req.query.code || '')
  const state = String(req.query.state || '')
  const shop = String(req.query.shop || '')

  const stateRecord = await consumeOAuthState(req.scope, state)

  if (!stateRecord) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Invalid or expired OAuth state'
    )
  }

  const connectService = await resolveConnectService(req.scope)
  const credentials = await exchangeShopifyToken({
    shop: shop || stateRecord.shop,
    clientId,
    clientSecret,
    code
  })

  const existing = await connectService.listConnectorInstallations({
    seller_id: stateRecord.sellerId,
    provider: 'shopify',
    external_store_id: credentials.shop_domain
  })

  let installation = existing[0]

  if (!installation) {
    installation = await connectService.createConnectorInstallations({
      seller_id: stateRecord.sellerId,
      provider: 'shopify',
      status: 'connected',
      external_store_id: credentials.shop_domain,
      external_store_url: `https://${credentials.shop_domain}`,
      sync_config: {
        require_approval: false,
        source_of_truth: 'external'
      }
    })
  } else {
    installation = await connectService.updateConnectorInstallations({
      id: installation.id,
      status: 'connected',
      error_message: null
    })
  }

  const credRecords = await connectService.listConnectorCredentials({
    installation_id: installation.id
  })

  const encrypted = stringifyCredentialJson(credentials)

  if (credRecords.length) {
    await connectService.updateConnectorCredentials({
      id: credRecords[0].id,
      encrypted_data: encrypted
    })
  } else {
    await connectService.createConnectorCredentials({
      installation_id: installation.id,
      credential_type: 'oauth',
      encrypted_data: encrypted,
      metadata: { shop_domain: credentials.shop_domain }
    })
  }

  await registerShopifyWebhooks(
    credentials,
    getConnectPublicBaseUrl(),
    installation.id
  )

  const vendorPanelUrl =
    process.env.VENDOR_PANEL_URL || 'http://localhost:5173'

  res.redirect(
    `${vendorPanelUrl}/mercur-connect/shopify?connected=1&installation_id=${installation.id}`
  )
}
