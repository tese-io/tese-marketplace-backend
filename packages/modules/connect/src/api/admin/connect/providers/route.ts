import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

import { listConnectorProvidersFromDb } from '../../../connect-db'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const providers = await listConnectorProvidersFromDb(req.scope)

  res.json({ providers })
}
