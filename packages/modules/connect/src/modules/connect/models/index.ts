import { model } from '@medusajs/framework/utils'

export const ConnectorProvider = model.define('connector_provider', {
  id: model.id({ prefix: 'cnp' }).primaryKey(),
  provider: model.text(),
  name: model.text(),
  description: model.text().nullable(),
  enabled: model.boolean().default(false),
  config: model.json().nullable()
})

export const ConnectorInstallation = model.define('connector_installation', {
  id: model.id({ prefix: 'cni' }).primaryKey(),
  seller_id: model.text(),
  provider: model.text(),
  status: model
    .enum(['pending', 'connected', 'disconnected', 'error'])
    .default('pending'),
  external_store_id: model.text().nullable(),
  external_store_url: model.text().nullable(),
  sync_config: model.json().nullable(),
  last_sync_at: model.dateTime().nullable(),
  last_sync_status: model.text().nullable(),
  error_message: model.text().nullable()
})

export const ConnectorCredential = model.define('connector_credential', {
  id: model.id({ prefix: 'cnc' }).primaryKey(),
  installation_id: model.text(),
  credential_type: model.text(),
  encrypted_data: model.text(),
  metadata: model.json().nullable()
})

export const ExternalEntityMap = model.define('external_entity_map', {
  id: model.id({ prefix: 'eem' }).primaryKey(),
  installation_id: model.text(),
  external_type: model.text(),
  external_id: model.text(),
  medusa_id: model.text(),
  metadata: model.json().nullable()
})

export const CategoryMapping = model.define('category_mapping', {
  id: model.id({ prefix: 'ctm' }).primaryKey(),
  installation_id: model.text(),
  external_category_id: model.text(),
  external_category_path: model.text().nullable(),
  medusa_category_id: model.text()
})

export const SyncRun = model.define('sync_run', {
  id: model.id({ prefix: 'syn' }).primaryKey(),
  installation_id: model.text(),
  direction: model.enum(['inbound', 'outbound']).default('inbound'),
  status: model
    .enum(['pending', 'running', 'completed', 'failed'])
    .default('pending'),
  started_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),
  stats: model.json().nullable(),
  error_message: model.text().nullable()
})

export const SyncLog = model.define('sync_log', {
  id: model.id({ prefix: 'syl' }).primaryKey(),
  sync_run_id: model.text(),
  level: model.enum(['info', 'warn', 'error']).default('info'),
  message: model.text(),
  context: model.json().nullable()
})
