import type { MedusaContainer } from '@medusajs/framework/types'
import { randomBytes } from 'crypto'

type ListOptions = {
  order?: Record<string, 'ASC' | 'DESC'>
  take?: number
}

function getKnex (container: MedusaContainer) {
  return container.resolve('__pg_connection__') as any
}

function generateId (prefix: string) {
  return `${prefix}_${randomBytes(16).toString('hex')}`
}

function applyListOptions (query: any, options?: ListOptions) {
  if (options?.order) {
    for (const [column, direction] of Object.entries(options.order)) {
      query = query.orderBy(column, direction === 'DESC' ? 'desc' : 'asc')
    }
  }

  if (options?.take) {
    query = query.limit(options.take)
  }

  return query
}

export function createConnectRepository (container: MedusaContainer) {
  const knex = getKnex(container)

  return {
    async getEnabledProvider (provider: string) {
      const row = await knex('connector_provider')
        .select('*')
        .where({ provider, enabled: true })
        .whereNull('deleted_at')
        .first()

      return row ?? null
    },

    async listConnectorProviders (
      filters: { provider?: string; enabled?: boolean } = {},
      options?: ListOptions
    ) {
      let query = knex('connector_provider')
        .select('*')
        .whereNull('deleted_at')

      if (filters.provider) {
        query = query.andWhere('provider', filters.provider)
      }

      if (typeof filters.enabled === 'boolean') {
        query = query.andWhere('enabled', filters.enabled)
      }

      query = applyListOptions(query.orderBy('provider', 'asc'), options)
      return await query
    },

    async listConnectorInstallations (
      filters: {
        id?: string
        seller_id?: string
        provider?: string
        external_store_id?: string
        status?: string
      } = {},
      options?: ListOptions
    ) {
      let query = knex('connector_installation')
        .select('*')
        .whereNull('deleted_at')

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.andWhere(key, value)
        }
      }

      query = applyListOptions(query, options)
      return await query
    },

    async getInstallationForSeller (installationId: string, sellerId: string) {
      const row = await knex('connector_installation')
        .select('*')
        .where({ id: installationId, seller_id: sellerId })
        .whereNull('deleted_at')
        .first()

      return row ?? null
    },

    async createConnectorInstallations (data: Record<string, unknown>) {
      const id = generateId('cni')
      const now = knex.fn.now()

      const [row] = await knex('connector_installation')
        .insert({
          id,
          status: 'pending',
          ...data,
          created_at: now,
          updated_at: now
        })
        .returning('*')

      return row
    },

    async updateConnectorInstallations (data: Record<string, unknown>) {
      const { id, ...updates } = data

      if (!id) {
        throw new Error('Installation id is required for update')
      }

      const [row] = await knex('connector_installation')
        .where({ id })
        .whereNull('deleted_at')
        .update({ ...updates, updated_at: knex.fn.now() })
        .returning('*')

      return row ?? null
    },

    async deleteConnectorInstallations (id: string) {
      await knex('connector_installation')
        .where({ id })
        .update({ deleted_at: knex.fn.now(), updated_at: knex.fn.now() })
    },

    async listConnectorCredentials (
      filters: { installation_id?: string; id?: string } = {}
    ) {
      let query = knex('connector_credential')
        .select('*')
        .whereNull('deleted_at')

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.andWhere(key, value)
        }
      }

      return await query
    },

    async createConnectorCredentials (data: Record<string, unknown>) {
      const id = generateId('cnc')
      const now = knex.fn.now()

      const [row] = await knex('connector_credential')
        .insert({
          id,
          ...data,
          created_at: now,
          updated_at: now
        })
        .returning('*')

      return row
    },

    async updateConnectorCredentials (data: Record<string, unknown>) {
      const { id, ...updates } = data

      if (!id) {
        throw new Error('Credential id is required for update')
      }

      const [row] = await knex('connector_credential')
        .where({ id })
        .whereNull('deleted_at')
        .update({ ...updates, updated_at: knex.fn.now() })
        .returning('*')

      return row ?? null
    },

    async listCategoryMappings (
      filters: {
        installation_id?: string
        external_category_id?: string
        id?: string
      } = {}
    ) {
      let query = knex('category_mapping')
        .select('*')
        .whereNull('deleted_at')

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.andWhere(key, value)
        }
      }

      return await query
    },

    async createCategoryMappings (data: Record<string, unknown>) {
      const id = generateId('ctm')
      const now = knex.fn.now()

      const [row] = await knex('category_mapping')
        .insert({
          id,
          ...data,
          created_at: now,
          updated_at: now
        })
        .returning('*')

      return row
    },

    async updateCategoryMappings (data: Record<string, unknown>) {
      const { id, ...updates } = data

      if (!id) {
        throw new Error('Category mapping id is required for update')
      }

      const [row] = await knex('category_mapping')
        .where({ id })
        .whereNull('deleted_at')
        .update({ ...updates, updated_at: knex.fn.now() })
        .returning('*')

      return row ?? null
    },

    async listExternalEntityMaps (
      filters: {
        installation_id?: string
        external_type?: string
        external_id?: string
      } = {}
    ) {
      let query = knex('external_entity_map')
        .select('*')
        .whereNull('deleted_at')

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.andWhere(key, value)
        }
      }

      return await query
    },

    async createExternalEntityMaps (data: Record<string, unknown>) {
      const id = generateId('eem')
      const now = knex.fn.now()

      const [row] = await knex('external_entity_map')
        .insert({
          id,
          ...data,
          created_at: now,
          updated_at: now
        })
        .returning('*')

      return row
    },

    async listSyncRuns (
      filters: { installation_id?: string; id?: string } = {},
      options?: ListOptions
    ) {
      let query = knex('sync_run')
        .select('*')
        .whereNull('deleted_at')

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.andWhere(key, value)
        }
      }

      query = applyListOptions(query, options)
      return await query
    },

    async createSyncRuns (data: Record<string, unknown>) {
      const id = generateId('syn')
      const now = knex.fn.now()

      const [row] = await knex('sync_run')
        .insert({
          id,
          direction: 'inbound',
          status: 'pending',
          ...data,
          created_at: now,
          updated_at: now
        })
        .returning('*')

      return row
    },

    async updateSyncRuns (data: Record<string, unknown>) {
      const { id, ...updates } = data

      if (!id) {
        throw new Error('Sync run id is required for update')
      }

      const [row] = await knex('sync_run')
        .where({ id })
        .whereNull('deleted_at')
        .update({ ...updates, updated_at: knex.fn.now() })
        .returning('*')

      return row ?? null
    },

    async saveOAuthState (input: {
      state: string
      sellerId: string
      shop: string
      expiresAt: Date
    }) {
      await knex('connector_oauth_state')
        .insert({
          state: input.state,
          seller_id: input.sellerId,
          shop: input.shop,
          expires_at: input.expiresAt,
          created_at: knex.fn.now()
        })
        .onConflict('state')
        .merge({
          seller_id: input.sellerId,
          shop: input.shop,
          expires_at: input.expiresAt
        })
    },

    async consumeOAuthState (state: string) {
      const row = await knex('connector_oauth_state')
        .select('*')
        .where({ state })
        .first()

      if (!row) {
        return null
      }

      await knex('connector_oauth_state').where({ state }).delete()

      if (new Date(row.expires_at).getTime() < Date.now()) {
        return null
      }

      return {
        sellerId: row.seller_id as string,
        shop: row.shop as string
      }
    }
  }
}

export type ConnectRepository = ReturnType<typeof createConnectRepository>
