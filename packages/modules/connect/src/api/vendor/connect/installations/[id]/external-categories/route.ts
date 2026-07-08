import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { fetchCustomApiCategories } from '../../../../../../providers/custom-api'
import { fetchMagentoCategories } from '../../../../../../providers/magento'
import { fetchShopifyCollections } from '../../../../../../providers/shopify'
import { parseCredentialJson } from '../../../../../../services/credential-crypto'
import {
  getInstallationCredentials,
  resolveConnectService,
  resolveVendorSeller
} from '../../../../../utils'

export const GET = async (
  req: AuthenticatedMedusaRequest<{ id: string }>,
  res: MedusaResponse
) => {
  const connectService = await resolveConnectService(req.scope)
  const seller = await resolveVendorSeller(req.scope, req.auth_context)
  const installation = await connectService.getInstallationForSeller(
    req.params.id,
    seller.id
  )

  if (!installation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Installation not found'
    )
  }

  const credential = await getInstallationCredentials(
    connectService,
    installation.id
  )

  if (!credential) {
    res.json({ categories: [] })
    return
  }

  let categories: Array<{ id: string; name: string; path?: string }> = []

  if (installation.provider === 'shopify') {
    const creds = parseCredentialJson<{ shop_domain: string; access_token: string }>(
      credential.encrypted_data
    )
    categories = await fetchShopifyCollections(creds)
  } else if (installation.provider === 'magento') {
    const creds = parseCredentialJson<{
      store_host: string
      api_key: string
      api_version?: string
    }>(credential.encrypted_data)
    categories = await fetchMagentoCategories(creds)
  } else if (installation.provider === 'custom_api') {
    const creds = parseCredentialJson<{ config: any }>(credential.encrypted_data)
    categories = await fetchCustomApiCategories(creds)
  }

  res.json({ categories })
}
