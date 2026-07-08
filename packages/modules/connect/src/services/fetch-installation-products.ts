import { fetchCustomApiProducts } from '../providers/custom-api'
import { fetchAllMagentoProducts } from '../providers/magento'
import { fetchAllShopifyProducts } from '../providers/shopify'
import { parseCredentialJson } from './credential-crypto'
import type { NormalizedProduct } from '../types'

export async function fetchInstallationProducts (
  provider: string,
  encryptedData: string
): Promise<NormalizedProduct[]> {
  if (provider === 'shopify') {
    const creds = parseCredentialJson<{
      shop_domain: string
      access_token: string
    }>(encryptedData)
    return fetchAllShopifyProducts(creds)
  }

  if (provider === 'magento') {
    const creds = parseCredentialJson<{
      store_host: string
      api_key: string
      api_version?: string
    }>(encryptedData)
    return fetchAllMagentoProducts(creds)
  }

  if (provider === 'custom_api') {
    const creds = parseCredentialJson<{ config: Record<string, unknown> }>(
      encryptedData
    )
    return fetchCustomApiProducts(creds as any)
  }

  return []
}
