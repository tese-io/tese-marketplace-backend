import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'

import { listConnectorProvidersFromDb } from '../../../connect-db'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const providers = await listConnectorProvidersFromDb(req.scope, {
    enabled: true
  })

  res.json({ providers })
}
