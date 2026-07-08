import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'

import { listConnectorInstallationsFromDb } from '../../../connect-db'
import { resolveVendorSeller } from '../../../utils'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const seller = await resolveVendorSeller(req.scope, req.auth_context)

  const installations = await listConnectorInstallationsFromDb(req.scope, {
    seller_id: seller.id
  })

  res.json({ installations })
}
