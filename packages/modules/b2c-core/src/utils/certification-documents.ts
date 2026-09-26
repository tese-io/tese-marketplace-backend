/**
 * Seller-certification proof documents — pure helpers for the signed-read
 * endpoints (G-09/G-12: uploaded evidence is private and only ever served
 * through short-lived links; pasted registry URLs pass through unsigned).
 */

export type CertificationDocument = {
  url?: string | null
  filename?: string | null
  kind?: 'file' | 'url' | string | null
}

/**
 * The row's documents, oldest shape tolerated: multi-doc rows use
 * `documents`; pre-migration rows only have `document_url`.
 */
export const documentsOf = (row: {
  documents?: unknown
  document_url?: string | null
}): CertificationDocument[] => {
  const docs = Array.isArray(row.documents)
    ? (row.documents as CertificationDocument[]).filter(
        (d) => d && typeof d === 'object'
      )
    : []
  if (docs.length) return docs
  return row.document_url ? [{ url: row.document_url, kind: 'url' }] : []
}

/** `?index=` query → non-negative integer, defaulting to the first doc. */
export const parseDocumentIndex = (raw: unknown): number => {
  const n = Number.parseInt(String(raw ?? '0'), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}
