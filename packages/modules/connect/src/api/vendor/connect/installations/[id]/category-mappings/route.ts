import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { upsertCategoryMappings } from '../../../../../../services/category-mapper'
import {
  resolveConnectService,
  resolveVendorSeller
} from '../../../../../utils'
import type { VendorCategoryMappingsType } from '../../../validators'

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

  const mappings = await connectService.listCategoryMappings({
    installation_id: installation.id
  })

  res.json({ mappings })
}

export const PUT = async (
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

  const body = req.validatedBody as unknown as VendorCategoryMappingsType
  const mappings = await upsertCategoryMappings(
    connectService,
    installation.id,
    body.mappings
  )

  res.json({ mappings })
}
