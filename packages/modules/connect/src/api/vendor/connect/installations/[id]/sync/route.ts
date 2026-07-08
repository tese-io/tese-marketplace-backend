import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'

import { fetchInstallationProducts } from '../../../../../../services/fetch-installation-products'
import { runInboundSync } from '../../../../../../services/sync-orchestrator'
import {
  getInstallationCredentials,
  resolveConnectService,
  resolveVendorSeller
} from '../../../../../utils'

async function executeInstallationSync (
  req: AuthenticatedMedusaRequest<{ id: string }>,
  res: MedusaResponse
) {
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

  if (installation.provider === 'csv') {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'CSV imports are handled via /vendor/products/import'
    )
  }

  const credential = await getInstallationCredentials(
    connectService,
    installation.id
  )

  if (!credential) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Connector credentials not found'
    )
  }

  const syncRun = await connectService.createSyncRuns({
    installation_id: installation.id,
    direction: 'inbound',
    status: 'running',
    started_at: new Date()
  })

  try {
    const products = await fetchInstallationProducts(
      installation.provider,
      credential.encrypted_data
    )

    const syncConfig = (installation.sync_config || {}) as Record<string, unknown>
    const stats = await runInboundSync(req.scope, {
      installationId: installation.id,
      sellerId: seller.id,
      provider: installation.provider,
      products,
      requireApproval: Boolean(syncConfig.require_approval)
    })

    await connectService.updateSyncRuns({
      id: syncRun.id,
      status: 'completed',
      completed_at: new Date(),
      stats
    })

    await connectService.updateConnectorInstallations({
      id: installation.id,
      last_sync_at: new Date(),
      last_sync_status: 'completed',
      status: 'connected',
      error_message: null
    })

    res.json({ sync_run: { ...syncRun, stats, status: 'completed' }, stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'

    await connectService.updateSyncRuns({
      id: syncRun.id,
      status: 'failed',
      completed_at: new Date(),
      error_message: message
    })

    await connectService.updateConnectorInstallations({
      id: installation.id,
      last_sync_status: 'failed',
      status: 'error',
      error_message: message
    })

    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }
}

export const POST = executeInstallationSync
