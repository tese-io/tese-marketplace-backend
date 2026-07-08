import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  getConnectorProviderFromDb,
  updateConnectorProviderEnabled
} from '../../../../connect-db'
import type { AdminToggleProviderType } from '../../validators'

export const POST = async (
  req: MedusaRequest<{ provider: string }>,
  res: MedusaResponse
) => {
  const { enabled } = req.validatedBody as unknown as AdminToggleProviderType
  const { provider } = req.params

  const existing = await getConnectorProviderFromDb(req.scope, provider)

  if (!existing) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Provider ${provider} not found`
    )
  }

  const updated = await updateConnectorProviderEnabled(
    req.scope,
    provider,
    enabled
  )

  res.json({ provider: updated })
}
