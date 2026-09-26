import { isPrivateUploadKey } from './business-verification'

/**
 * B-29 / K-02 — document retention for declined and archived business
 * verifications. N days after the decision the uploaded document is deleted
 * from the private bucket; the decision record (status, reason, reviewer,
 * timestamps, typed legal name / registration number / country) stays.
 *
 * Pending rows are never touched; verified rows live as long as the seller.
 * The window is configuration (`KYB_DOCUMENT_RETENTION_DAYS`, default 90) so
 * legal can change it without a deploy.
 */

export const DEFAULT_RETENTION_DAYS = 90
export const PURGEABLE_STATUSES = ['rejected', 'archived'] as const

export type RetentionRow = {
  id: string
  status: string
  document_key?: string | null
  document_purged_at?: string | Date | null
  reviewed_at?: string | Date | null
  updated_at?: string | Date | null
  created_at?: string | Date | null
}

export function retentionDaysFromEnv(
  env: Record<string, string | undefined> = process.env
): number {
  const n = Number.parseInt(String(env.KYB_DOCUMENT_RETENTION_DAYS ?? ''), 10)
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_RETENTION_DAYS
}

const ts = (v: string | Date | null | undefined): number | null => {
  if (!v) return null
  const n = new Date(v).getTime()
  return Number.isFinite(n) ? n : null
}

/**
 * The clock starts at the decision; for a row that somehow has none, at its
 * last change, then its creation — never "never".
 */
export function retentionAnchor(row: RetentionRow): number | null {
  return ts(row.reviewed_at) ?? ts(row.updated_at) ?? ts(row.created_at)
}

export function selectDocumentsToPurge<T extends RetentionRow>(
  rows: T[],
  now: Date,
  days: number
): T[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return rows.filter((row) => {
    if (!(PURGEABLE_STATUSES as readonly string[]).includes(row.status)) return false
    if (!row.document_key || row.document_purged_at) return false
    const anchor = retentionAnchor(row)
    return anchor !== null && anchor <= cutoff
  })
}

export type RetentionService = {
  listSellerVerifications: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<RetentionRow[]>
  updateSellerVerifications: (input: {
    selector: { id: string }
    data: Record<string, unknown>
  }) => Promise<unknown>
}

export type RetentionLogger = {
  info?: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export type RetentionResult = {
  days: number
  scanned: number
  due: number
  purged: number
  failed: number
}

/**
 * One sweep. Deletion happens BEFORE the record is cleared, and a failed
 * delete leaves the row untouched for the next run — a row is only ever
 * marked purged when the object is actually gone.
 */
export async function runBusinessVerificationRetention(deps: {
  service: RetentionService
  deleteObject: (key: string) => Promise<void>
  now?: Date
  days?: number
  log?: RetentionLogger
  pageSize?: number
}): Promise<RetentionResult> {
  const now = deps.now ?? new Date()
  const days = deps.days ?? retentionDaysFromEnv()
  const log = deps.log ?? console
  const PAGE = deps.pageSize ?? 500

  const candidates: RetentionRow[] = []
  let skip = 0
  while (true) {
    const batch = await deps.service.listSellerVerifications(
      { status: [...PURGEABLE_STATUSES] },
      { take: PAGE, skip, order: { created_at: 'ASC' } }
    )
    if (!batch || batch.length === 0) break
    candidates.push(...batch)
    if (batch.length < PAGE) break
    skip += PAGE
  }

  const due = selectDocumentsToPurge(candidates, now, days)
  let purged = 0
  let failed = 0
  for (const row of due) {
    try {
      if (isPrivateUploadKey(row.document_key)) {
        await deps.deleteObject(row.document_key)
      } else {
        log.warn(
          `[kyb-retention] ${row.id}: stored key is not a private upload key; clearing the record only`
        )
      }
      await deps.service.updateSellerVerifications({
        selector: { id: row.id },
        data: {
          document_key: null,
          document_url: null,
          document_filename: null,
          document_purged_at: now
        }
      })
      purged++
    } catch (e) {
      failed++
      log.error(`[kyb-retention] ${row.id}: ${(e as Error)?.message || e}`)
    }
  }

  return { days, scanned: candidates.length, due: due.length, purged, failed }
}
