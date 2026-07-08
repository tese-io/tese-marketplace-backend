import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { randomBytes } from 'crypto'

import { getShopifyOAuthUrl } from '../../../../../providers/shopify'
import {
  getShopifyAppConfig,
  resolveConnectService,
  resolveVendorSeller
} from '../../../../utils'

export async function consumeOAuthState (
  container: AuthenticatedMedusaRequest['scope'] | import('@medusajs/framework/types').MedusaContainer,
  state: string
) {
  const connectService = await resolveConnectService(container)
  return connectService.consumeOAuthState(state)
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { clientId, redirectUri } = getShopifyAppConfig()
  const shop = String(req.query.shop || '')

  if (!clientId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'SHOPIFY_CONNECT_CLIENT_ID is not configured'
    )
  }

  if (!shop) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'shop query param is required'
    )
  }

  const connectService = await resolveConnectService(req.scope)
  const seller = await resolveVendorSeller(req.scope, req.auth_context)
  const provider = await connectService.getEnabledProvider('shopify')

  if (!provider) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Shopify connector is not enabled by marketplace admin'
    )
  }

  const state = randomBytes(16).toString('hex')
  await connectService.saveOAuthState({
    state,
    sellerId: seller.id,
    shop,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  })

  const url = getShopifyOAuthUrl({
    shop,
    clientId,
    redirectUri,
    state
  })

  res.json({ authorization_url: url })
}
