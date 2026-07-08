export const CONNECT_MODULE = 'connect'

export const CONNECT_PROVIDERS = [
  'csv',
  'shopify',
  'magento',
  'custom_api'
] as const

export type ConnectProviderType = (typeof CONNECT_PROVIDERS)[number]

export const INSTALLATION_STATUSES = [
  'pending',
  'connected',
  'disconnected',
  'error'
] as const

export type InstallationStatus = (typeof INSTALLATION_STATUSES)[number]

export const SYNC_RUN_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed'
] as const

export type SyncRunStatus = (typeof SYNC_RUN_STATUSES)[number]

export const SYNC_DIRECTIONS = ['inbound', 'outbound'] as const

export const EXTERNAL_ENTITY_TYPES = [
  'product',
  'variant',
  'category',
  'order'
] as const

export type ExternalEntityType = (typeof EXTERNAL_ENTITY_TYPES)[number]

export const ConnectEvents = {
  SYNC_REQUESTED: 'connect.sync.requested',
  SYNC_COMPLETED: 'connect.sync.completed',
  SYNC_FAILED: 'connect.sync.failed'
} as const
