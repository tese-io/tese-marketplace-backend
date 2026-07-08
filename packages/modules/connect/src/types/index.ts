export type NormalizedProduct = {
  external_id: string
  title: string
  description?: string
  handle?: string
  status?: 'draft' | 'proposed' | 'published' | 'rejected'
  thumbnail?: string
  images?: Array<{ url: string }>
  category_ids?: string[]
  tags?: Array<{ value: string }>
  options?: Array<{ title: string; values: string[] }>
  variants?: Array<{
    title: string
    sku?: string
    prices?: Array<{ amount: number; currency_code: string }>
    inventory_quantity?: number
    options?: Record<string, string>
  }>
  metadata?: Record<string, unknown>
}

export type SyncStats = {
  created: number
  updated: number
  skipped: number
  failed: number
}

export function emptySyncStats (): SyncStats {
  return { created: 0, updated: 0, skipped: 0, failed: 0 }
}

export function mergeSyncStats (a: SyncStats, b: SyncStats): SyncStats {
  return {
    created: a.created + b.created,
    updated: a.updated + b.updated,
    skipped: a.skipped + b.skipped,
    failed: a.failed + b.failed
  }
}

export function slugifyHandle (value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255) || 'product'
}
