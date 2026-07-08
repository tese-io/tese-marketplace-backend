import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import {
  resolveConnectService,
  resolveVendorSeller
} from '../../../../utils'

export const GET = async (
  req: AuthenticatedMedusaRequest<{ id: string }>,
  res: MedusaResponse
) => {
  const connectService = await resolveConnectService(req.scope)
  const seller = await resolveVendorSeller(req.scope, req.auth_context)
  const installation = await connectService.getInstallationForSeller(
    req.params.id,
    seller.id
  )

  if (!installation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Installation not found'
    )
  }

  const syncRuns = await connectService.listSyncRuns(
    { installation_id: installation.id },
    { order: { created_at: 'DESC' }, take: 10 }
  )

  res.json({ installation, sync_runs: syncRuns })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest<{ id: string }>,
  res: MedusaResponse
) => {
  const connectService = await resolveConnectService(req.scope)
  const seller = await resolveVendorSeller(req.scope, req.auth_context)
  const installation = await connectService.getInstallationForSeller(
    req.params.id,
    seller.id
  )

  if (!installation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Installation not found'
    )
  }

  await connectService.deleteConnectorInstallations(installation.id)

  res.status(200).json({ id: installation.id, deleted: true })
}
