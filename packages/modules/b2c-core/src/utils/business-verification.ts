/**
 * Business verification (KYB) — pure helpers shared by the vendor and admin
 * routes. No I/O here; everything is unit-tested.
 */

export const DOCUMENT_KINDS = [
  'certificate_of_incorporation',
  'registration_extract',
  'trade_licence',
  'tax_registration'
] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export const VERIFICATION_METHODS = ['document_only', 'registry_checked'] as const
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number]

export type VerificationRow = {
  id: string
  status: 'pending' | 'verified' | 'rejected' | 'archived'
  created_at?: string | Date | null
  reviewer_note?: string | null
}

export type BusinessVerificationState =
  | 'needed'
  | 'under_review'
  | 'declined'
  | 'verified'

/** Uploads via /vendor/uploads?purpose=private land under this prefix. */
export const PRIVATE_UPLOAD_PREFIX = 'marketplace/uploads/private/'

/**
 * A verification document must be a private-bucket object we minted. Any
 * other key (public prefix, path tricks, absolute URL) is refused — this
 * is what keeps a signed-read endpoint from becoming a bucket browser.
 */
export function isPrivateUploadKey(key: unknown): key is string {
  if (typeof key !== 'string') return false
  if (!key.startsWith(PRIVATE_UPLOAD_PREFIX)) return false
  const rest = key.slice(PRIVATE_UPLOAD_PREFIX.length)
  if (!rest || rest.includes('/') || rest.includes('..')) return false
  return /^[A-Za-z0-9._-]+$/.test(rest)
}

const ts = (value: string | Date | null | undefined): number => {
  if (!value) return 0
  const n = new Date(value).getTime()
  return Number.isFinite(n) ? n : 0
}

const newest = <T extends VerificationRow>(rows: T[]): T | null =>
  rows.length
    ? rows.reduce((a, b) => (ts(b.created_at) > ts(a.created_at) ? b : a))
    : null

/**
 * The seller's effective state from its rows. A verified row always wins
 * (re-uploads after verification are not a thing); otherwise a pending
 * review; otherwise the newest decline (whose note the vendor sees);
 * otherwise nothing has been submitted. Archived rows never count.
 */
export function deriveBusinessVerificationState<T extends VerificationRow>(
  rows: T[] | null | undefined
): { state: BusinessVerificationState; current: T | null } {
  const live = (rows || []).filter((r) => r && r.status !== 'archived')
  const verified = newest(live.filter((r) => r.status === 'verified'))
  if (verified) return { state: 'verified', current: verified }
  const pending = newest(live.filter((r) => r.status === 'pending'))
  if (pending) return { state: 'under_review', current: pending }
  const rejected = newest(live.filter((r) => r.status === 'rejected'))
  if (rejected) return { state: 'declined', current: rejected }
  return { state: 'needed', current: null }
}

/** Gate input (B-24): only a verified row unlocks commercial actions. */
export function isBusinessVerified(rows: VerificationRow[] | null | undefined): boolean {
  return deriveBusinessVerificationState(rows).state === 'verified'
}

const LEGAL_SUFFIXES = new Set([
  'ltd', 'limited', 'ltee', 'ltée', 'llc', 'inc', 'incorporated', 'plc',
  'sa', 'sarl', 'sas', 'gmbh', 'bv', 'pty', 'co', 'company', 'corp',
  'corporation', 'holdings', 'group'
])

/**
 * Comparison key for "same legal entity?" — lowercase, punctuation and
 * common corporate suffixes stripped, whitespace collapsed. Used only to
 * SURFACE a duplicate signal to a human; never to auto-merge.
 */
export function normalizeLegalName(name: unknown): string {
  if (typeof name !== 'string') return ''
  const words = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) {
    words.pop()
  }
  return words.join(' ')
}

export function normalizeRegistrationNumber(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** ISO 3166-1 alpha-2, lowercase; anything else is rejected. */
export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  return /^[a-z]{2}$/.test(v) ? v : null
}

export type OcrPrefill = {
  legal_name: string | null
  registration_number: string | null
  country_of_registration: string | null
  document_kind: DocumentKind | null
  confidence: number | null
}

/**
 * Map the tese-backend business-document OCR response into the three
 * typed fields. Tolerant of partial results: anything missing stays null
 * and the vendor types it. Pre-fill only — never a verification.
 */
export function toOcrPrefill(raw: unknown): OcrPrefill | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null
  const kind = str(r.document_kind)
  const confidence =
    typeof r.confidence === 'number' && Number.isFinite(r.confidence)
      ? Math.max(0, Math.min(1, r.confidence))
      : null
  const prefill: OcrPrefill = {
    legal_name: str(r.legal_name),
    registration_number: str(r.registration_number)
      ? normalizeRegistrationNumber(r.registration_number)
      : null,
    country_of_registration: normalizeCountryCode(r.country_of_registration),
    document_kind: (DOCUMENT_KINDS as readonly string[]).includes(kind || '')
      ? (kind as DocumentKind)
      : null,
    confidence
  }
  const anyValue =
    prefill.legal_name ||
    prefill.registration_number ||
    prefill.country_of_registration ||
    prefill.document_kind
  return anyValue ? prefill : null
}
