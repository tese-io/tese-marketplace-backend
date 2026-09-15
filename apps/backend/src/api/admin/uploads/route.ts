import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { HttpTypes } from '@medusajs/framework/types'

import { handleMarketplaceUploads } from '@mercurjs/b2c-core/shared/utils/upload-handler'

/**
 * Override Medusa core POST /admin/uploads so operator shop media uses
 * the same public/private router as /vendor/uploads.
 */
export const POST = (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminUploadFile>,
  res: MedusaResponse
) => handleMarketplaceUploads(req, res)
