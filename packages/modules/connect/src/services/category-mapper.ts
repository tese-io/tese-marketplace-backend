import type { ConnectRepository } from '../api/connect-repository'

export async function resolveMedusaCategoryId (
  connectService: ConnectRepository,
  installationId: string,
  externalCategoryId: string | null | undefined,
  fallbackCategoryId?: string | null
): Promise<string | null> {
  if (!externalCategoryId) {
    return fallbackCategoryId ?? null
  }

  const mappings = await connectService.listCategoryMappings({
    installation_id: installationId,
    external_category_id: externalCategoryId
  })

  if (mappings.length) {
    return mappings[0].medusa_category_id
  }

  return fallbackCategoryId ?? null
}

export async function upsertCategoryMappings (
  connectService: ConnectRepository,
  installationId: string,
  mappings: Array<{
    external_category_id: string
    external_category_path?: string
    medusa_category_id: string
  }>
) {
  const results: Record<string, unknown>[] = []

  for (const mapping of mappings) {
    const existing = await connectService.listCategoryMappings({
      installation_id: installationId,
      external_category_id: mapping.external_category_id
    })

    if (existing.length) {
      const updated = await connectService.updateCategoryMappings({
        id: existing[0].id,
        external_category_path: mapping.external_category_path ?? null,
        medusa_category_id: mapping.medusa_category_id
      })
      results.push(updated as Record<string, unknown>)
    } else {
      const created = await connectService.createCategoryMappings({
        installation_id: installationId,
        external_category_id: mapping.external_category_id,
        external_category_path: mapping.external_category_path ?? null,
        medusa_category_id: mapping.medusa_category_id
      })
      results.push(created as Record<string, unknown>)
    }
  }

  return results
}
