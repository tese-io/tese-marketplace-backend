import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { buildMagentoStoreUrl } from '../../../../providers/magento'
import { stringifyCredentialJson } from '../../../../services/credential-crypto'
import {
  resolveConnectService,
  resolveVendorSeller
} from '../../../utils'
import type { VendorCreateMagentoInstallationType } from '../validators'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const connectService = await resolveConnectService(req.scope)
  const seller = await resolveVendorSeller(req.scope, req.auth_context)
  const provider = await connectService.getEnabledProvider('magento')

  if (!provider) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Magento connector is not enabled by marketplace admin'
    )
  }

  const body = req.validatedBody as VendorCreateMagentoInstallationType
  const storeHost = body.store_host.replace(/^https?:\/\//, '').replace(/\/$/, '')

  const existing = await connectService.listConnectorInstallations({
    seller_id: seller.id,
    provider: 'magento',
    external_store_id: storeHost
  })

  let installation = existing[0]

  if (!installation) {
    installation = await connectService.createConnectorInstallations({
      seller_id: seller.id,
      provider: 'magento',
      status: 'connected',
      external_store_id: storeHost,
      external_store_url: buildMagentoStoreUrl(storeHost),
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

  const encrypted = stringifyCredentialJson({
    store_host: storeHost,
    api_key: body.api_key,
    api_version: body.api_version || 'V1'
  })

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
      credential_type: 'token',
      encrypted_data: encrypted,
      metadata: { store_host: storeHost }
    })
  }

  res.json({ installation })
}
