import type { MedusaContainer } from '@medusajs/framework/types'

import {
  createConnectRepository,
  type ConnectRepository
} from './connect-repository'

export type {
  ConnectRepository
} from './connect-repository'

export async function listConnectorProvidersFromDb (
  container: MedusaContainer,
  filters: { enabled?: boolean } = {}
) {
  const repo = createConnectRepository(container)
  return repo.listConnectorProviders(filters)
}

export async function listConnectorInstallationsFromDb (
  container: MedusaContainer,
  filters: {
    seller_id?: string
    id?: string
    provider?: string
  } = {}
) {
  const repo = createConnectRepository(container)
  return repo.listConnectorInstallations(filters, {
    order: { created_at: 'DESC' }
  })
}

export async function getConnectorProviderFromDb (
  container: MedusaContainer,
  provider: string
) {
  const repo = createConnectRepository(container)
  const rows = await repo.listConnectorProviders({ provider })
  return rows[0] ?? null
}

export async function updateConnectorProviderEnabled (
  container: MedusaContainer,
  provider: string,
  enabled: boolean
) {
  const knex = container.resolve('__pg_connection__') as any
  const [row] = await knex('connector_provider')
    .where({ provider })
    .whereNull('deleted_at')
    .update({ enabled, updated_at: knex.fn.now() })
    .returning('*')

  return row ?? null
}
