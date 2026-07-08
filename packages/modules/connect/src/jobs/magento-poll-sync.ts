import type { MedusaContainer } from '@medusajs/framework/types'

import { createConnectRepository } from '../api/connect-repository'
import { fetchInstallationProducts } from '../services/fetch-installation-products'
import { runInboundSync } from '../services/sync-orchestrator'

export default async function magentoPollSyncJob (container: MedusaContainer) {
  const connectService = createConnectRepository(container)

  const installations = await connectService.listConnectorInstallations({
    provider: 'magento',
    status: 'connected'
  })

  for (const installation of installations) {
    const credentials = await connectService.listConnectorCredentials({
      installation_id: installation.id
    })

    if (!credentials.length) continue

    const syncRun = await connectService.createSyncRuns({
      installation_id: installation.id,
      direction: 'inbound',
      status: 'running',
      started_at: new Date()
    })

    try {
      const products = await fetchInstallationProducts(
        'magento',
        credentials[0].encrypted_data
      )
      const syncConfig = (installation.sync_config || {}) as Record<
        string,
        unknown
      >

      const stats = await runInboundSync(container, {
        installationId: installation.id,
        sellerId: installation.seller_id,
        provider: 'magento',
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
        last_sync_status: 'completed'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Magento sync failed'

      await connectService.updateSyncRuns({
        id: syncRun.id,
        status: 'failed',
        completed_at: new Date(),
        error_message: message
      })

      await connectService.updateConnectorInstallations({
        id: installation.id,
        last_sync_status: 'failed',
        error_message: message
      })
    }
  }
}

export const config = {
  name: 'magento-connect-poll-sync',
  schedule: '*/15 * * * *'
}
