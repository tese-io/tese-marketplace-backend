import { MedusaService } from '@medusajs/framework/utils'

import {
  CategoryMapping,
  ConnectorCredential,
  ConnectorInstallation,
  ConnectorProvider,
  ExternalEntityMap,
  SyncLog,
  SyncRun
} from './models'

class ConnectModuleService extends MedusaService({
  ConnectorProvider,
  ConnectorInstallation,
  ConnectorCredential,
  ExternalEntityMap,
  CategoryMapping,
  SyncRun,
  SyncLog
}) {
  async ensureDefaultProviders () {
    const defaults = [
      {
        provider: 'csv',
        name: 'Product Importer',
        description: 'Bulk import products via CSV files',
        enabled: true
      },
      {
        provider: 'shopify',
        name: 'Shopify Connector',
        description: 'Sync products, inventory, and pricing from Shopify',
        enabled: false
      },
      {
        provider: 'magento',
        name: 'Magento Connector',
        description: 'Sync products and inventory from Adobe Commerce / Magento',
        enabled: false
      },
      {
        provider: 'custom_api',
        name: 'Custom API Connector',
        description: 'Connect any REST API with configurable field mapping',
        enabled: false
      }
    ]

    for (const item of defaults) {
      const existing = await this.listConnectorProviders({
        provider: item.provider
      })

      if (!existing.length) {
        await this.createConnectorProviders(item)
      }
    }
  }

  async getEnabledProvider (provider: string) {
    const [record] = await this.listConnectorProviders({
      provider,
      enabled: true
    })

    return record ?? null
  }

  async getInstallationForSeller (
    installationId: string,
    sellerId: string
  ) {
    const [installation] = await this.listConnectorInstallations({
      id: installationId,
      seller_id: sellerId
    })

    return installation ?? null
  }
}

export default ConnectModuleService
