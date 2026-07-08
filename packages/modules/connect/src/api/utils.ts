import type { MedusaContainer } from '@medusajs/framework/types'

import { fetchSellerByAuthActorId } from '@mercurjs/framework'

import {
  createConnectRepository,
  type ConnectRepository
} from './connect-repository'

export async function resolveConnectService (
  container: MedusaContainer
): Promise<ConnectRepository> {
  return createConnectRepository(container)
}

export async function resolveVendorSeller (
  container: MedusaContainer,
  authContext: { actor_id: string }
) {
  return fetchSellerByAuthActorId(authContext.actor_id, container)
}

export async function getInstallationCredentials (
  connectService: ConnectRepository,
  installationId: string
) {
  const credentials = await connectService.listConnectorCredentials({
    installation_id: installationId
  })

  return credentials[0] ?? null
}

export function getConnectPublicBaseUrl (): string {
  return (
    process.env.CONNECT_WEBHOOK_BASE_URL ||
    process.env.MEDUSA_BACKEND_URL ||
    'http://localhost:9000'
  ).replace(/\/$/, '')
}

export function getShopifyAppConfig () {
  return {
    clientId: process.env.SHOPIFY_CONNECT_CLIENT_ID || '',
    clientSecret: process.env.SHOPIFY_CONNECT_CLIENT_SECRET || '',
    redirectUri:
      process.env.SHOPIFY_CONNECT_REDIRECT_URI ||
      `${getConnectPublicBaseUrl()}/vendor/connect/shopify/callback`
  }
}
