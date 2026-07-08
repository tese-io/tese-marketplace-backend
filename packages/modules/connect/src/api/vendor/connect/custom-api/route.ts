import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { stringifyCredentialJson } from '../../../../services/credential-crypto'
import {
  resolveConnectService,
  resolveVendorSeller
} from '../../../utils'
import type { VendorCreateCustomApiInstallationType } from '../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const connectService = await resolveConnectService(req.scope)
  const seller = await resolveVendorSeller(req.scope, req.auth_context)
  const provider = await connectService.getEnabledProvider('custom_api')

  if (!provider) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Custom API connector is not enabled by marketplace admin'
    )
  }

  const body = req.validatedBody as VendorCreateCustomApiInstallationType
  const baseUrl = body.config.base_url.replace(/\/$/, '')

  const existing = await connectService.listConnectorInstallations({
    seller_id: seller.id,
    provider: 'custom_api',
    external_store_id: baseUrl
  })

  let installation = existing[0]

  if (!installation) {
    installation = await connectService.createConnectorInstallations({
      seller_id: seller.id,
      provider: 'custom_api',
      status: 'connected',
      external_store_id: baseUrl,
      external_store_url: baseUrl,
      sync_config: body.sync_config || {
        require_approval: false,
        source_of_truth: 'external'
      }
    })
  } else {
    installation = await connectService.updateConnectorInstallations({
      id: installation.id,
      status: 'connected',
      sync_config: body.sync_config || installation.sync_config,
      error_message: null
    })
  }

  const encrypted = stringifyCredentialJson({ config: body.config })

  const credRecords = await connectService.listConnectorCredentials({
    installation_id: installation.id
  })

  if (credRecords.length) {
    await connectService.updateConnectorCredentials({
      id: credRecords[0].id,
      encrypted_data: encrypted
    })
  } else {
    await connectService.createConnectorCredentials({
      installation_id: installation.id,
      credential_type: 'custom_api',
      encrypted_data: encrypted,
      metadata: { base_url: baseUrl }
    })
  }

  res.json({ installation })
}
