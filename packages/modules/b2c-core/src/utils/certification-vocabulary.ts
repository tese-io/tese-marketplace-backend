/**
 * B-22 — the product-attribute certification vocabulary is DERIVED from
 * the shared tese-backend catalogue (the one source of truth, Q-04),
 * never hand-maintained. G-05: the old static 29-name list survives
 * only as an offline fallback in the setup script.
 */

export type VocabularySource = {
  name: string
  aliases?: string[] | null
}

export type CertificationVocabulary = {
  /** Canonical display names, deduped, locale-sorted. */
  vocabulary: string[]
  /** lowercase alias/name → canonical name. */
  aliasToCanonical: Record<string, string>
}

export function deriveCertificationVocabulary(
  catalogue: VocabularySource[],
  extraValues: string[] = []
): CertificationVocabulary {
  const aliasToCanonical: Record<string, string> = {}
  const names = new Set<string>()

  for (const cert of catalogue || []) {
    const name = (cert.name || '').trim()
    if (!name) continue
    names.add(name)
    aliasToCanonical[name.toLowerCase()] = name
    for (const alias of cert.aliases || []) {
      const a = (alias || '').trim()
      if (!a) continue
      // First mapping wins — a later cert may not steal an alias an
      // earlier one already claimed (deterministic given input order).
      if (!(a.toLowerCase() in aliasToCanonical)) {
        aliasToCanonical[a.toLowerCase()] = name
      }
    }
  }

  // Extra values (e.g. free-text metadata already on products) join the
  // vocabulary after canonicalisation so re-runs stay idempotent.
  for (const raw of extraValues || []) {
    const v = (raw || '').trim()
    if (!v) continue
    const canonical = aliasToCanonical[v.toLowerCase()] || v
    names.add(canonical)
    if (!(v.toLowerCase() in aliasToCanonical)) {
      aliasToCanonical[v.toLowerCase()] = canonical
    }
  }

  return {
    vocabulary: Array.from(names).sort((a, b) => a.localeCompare(b)),
    aliasToCanonical,
  }
}
