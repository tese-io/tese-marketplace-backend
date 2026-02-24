import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow
} from '@medusajs/medusa/core-flows'

import { COMMISSION_MODULE, CommissionModuleService } from '@mercurjs/commission'
import {
  CONFIGURATION_MODULE,
  ConfigurationModuleService,
  ConfigurationRuleDefaults
} from '@mercurjs/configuration'
import { SELLER_MODULE } from '@mercurjs/seller'

import sellerShippingProfile from '../../links/seller-shipping-profile'
import sellerStockLocationLink from '../../links/seller-stock-location'
import { createCommissionRuleWorkflow } from '../../workflows/commission/workflows'
import { createConfigurationRuleWorkflow } from '../../workflows/configuration/workflows'
import { createLocationFulfillmentSetAndAssociateWithSellerWorkflow } from '../../workflows/fulfillment-set/workflows'
import { createSellerWorkflow } from '../../workflows/seller/workflows'
import { legacySeedHandles, productsToInsert } from './seed-products'

const countries = ['be', 'de', 'dk', 'se', 'fr', 'es', 'it', 'pl', 'cz', 'nl']

export async function createSalesChannel(container: MedusaContainer) {
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  let [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels(
    {
      name: 'Default Sales Channel'
    }
  )

  if (!defaultSalesChannel) {
    const {
      result: [salesChannelResult]
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel'
          }
        ]
      }
    })
    defaultSalesChannel = salesChannelResult
  }

  return defaultSalesChannel
}

export async function createStore(
  container: MedusaContainer,
  salesChannelId: string,
  regionId: string
) {
  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()

  if (!store) {
    return
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: 'eur',
            is_default: true
          }
        ],
        default_sales_channel_id: salesChannelId,
        default_region_id: regionId
      }
    }
  })
}
export async function createRegions(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: existingRegions } = await query.graph({
    entity: 'region',
    fields: ['id', 'name'],
    filters: {}
  })

  if (existingRegions?.length) {
    return existingRegions[0]
  }

  const {
    result: [region]
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: 'Europe',
          currency_code: 'eur',
          countries,
          payment_providers: ['pp_system_default']
        }
      ]
    }
  })

  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code
    }))
  })

  return region
}

export async function createPublishableKey(
  container: MedusaContainer,
  salesChannelId: string
) {
  const apiKeyService = container.resolve(Modules.API_KEY)

  let [key] = await apiKeyService.listApiKeys({ type: 'publishable' })

  if (!key) {
    const {
      result: [publishableApiKeyResult]
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: 'Default publishable key',
            type: 'publishable',
            created_by: ''
          }
        ]
      }
    })
    key = publishableApiKeyResult
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: key.id,
      add: [salesChannelId]
    }
  })

  return key
}

export async function createProductCategories(container: MedusaContainer) {
  const productService = container.resolve(Modules.PRODUCT)
  const existing = await productService.listProductCategories({}, { take: 1 })
  if (existing?.length) return existing

  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        { name: 'Consulting', is_active: true },
        { name: 'Training', is_active: true },
        { name: 'Audit & Assurance', is_active: true },
        { name: 'Sport', is_active: true },
        { name: 'Accessories', is_active: true },
        { name: 'Tops', is_active: true }
      ]
    }
  })

  return result
}

export async function createProductCollections(container: MedusaContainer) {
  const productService = container.resolve(Modules.PRODUCT)
  const existing = await productService.listProductCollections({}, { take: 1 })
  if (existing?.length) return existing

  const { result } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        { title: 'Carbon & GHG' },
        { title: 'ESG & Reporting' },
        { title: 'Sustainability' },
        { title: 'Training & Workshops' },
        { title: 'Streetwear' },
        { title: 'Y2K' }
      ]
    }
  })

  return result
}

const SEED_SELLER_EMAIL = 'seller@mercurjs.com'

export async function createSeller(container: MedusaContainer) {
  const sellerService = container.resolve(SELLER_MODULE)
  const existingMembers = await sellerService.listMembers({
    email: SEED_SELLER_EMAIL
  })
  if (existingMembers?.length) {
    const seller = await sellerService.retrieveSeller(
      existingMembers[0].seller_id
    )
    return seller
  }

  const authService = container.resolve(Modules.AUTH)
  const { authIdentity } = await authService.register('emailpass', {
    body: {
      email: SEED_SELLER_EMAIL,
      password: 'secret'
    }
  })

  if (!authIdentity?.id) {
    throw new Error(
      'Seed seller: auth identity was not created (email may already be registered). Delete the auth identity or use a fresh database.'
    )
  }

  const { result: seller } = await createSellerWorkflow.run({
    container,
    input: {
      auth_identity_id: authIdentity.id,
      member: {
        name: 'John Doe',
        email: SEED_SELLER_EMAIL
      },
      seller: {
        name: 'Tese Store'
      }
    }
  })

  return seller
}

export async function createSellerStockLocation(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: existingSellerLocations
  } = await query.graph({
    entity: sellerStockLocationLink.entryPoint,
    fields: ['stock_location.*', 'stock_location.fulfillment_sets.*'],
    filters: { seller_id: sellerId },
    pagination: { take: 1 }
  })
  if (existingSellerLocations?.length) {
    return existingSellerLocations[0].stock_location
  }

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const {
    result: [stock]
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: `Stock Location for seller ${sellerId}`,
          address: {
            address_1: 'Random Strasse',
            city: 'Berlin',
            country_code: 'de'
          }
        }
      ]
    }
  })

  await link.create([
    {
      [SELLER_MODULE]: {
        seller_id: sellerId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    },
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: 'manual_manual'
      }
    },
    {
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: salesChannelId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    }
  ])

  await createLocationFulfillmentSetAndAssociateWithSellerWorkflow.run({
    container,
    input: {
      fulfillment_set_data: {
        name: `${sellerId} fulfillment set`,
        type: 'shipping'
      },
      location_id: stock.id,
      seller_id: sellerId
    }
  })

  const {
    data: [stockLocation]
  } = await query.graph({
    entity: 'stock_location',
    fields: ['*', 'fulfillment_sets.*'],
    filters: {
      id: stock.id
    }
  })

  return stockLocation
}

export async function createServiceZoneForFulfillmentSet(
  container: MedusaContainer,
  sellerId: string,
  fulfillmentSetId: string
) {
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const existingZones = await fulfillmentService.listServiceZones({
    fulfillment_set: {
      id: fulfillmentSetId
    }
  })
  const [zone] = existingZones
  if (zone) {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    try {
      await link.create({
        [SELLER_MODULE]: { seller_id: sellerId },
        [Modules.FULFILLMENT]: { service_zone_id: zone.id }
      })
    } catch (err: any) {
      if (err?.message?.includes?.('already exists') === false) throw err
    }
    return zone
  }

  await createServiceZonesWorkflow.run({
    container,
    input: {
      data: [
        {
          fulfillment_set_id: fulfillmentSetId,
          name: `Europe`,
          geo_zones: countries.map((c) => ({
            type: 'country',
            country_code: c
          }))
        }
      ]
    }
  })

  const [newZone] = await fulfillmentService.listServiceZones({
    fulfillment_set: {
      id: fulfillmentSetId
    }
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      service_zone_id: newZone.id
    }
  })

  return newZone
}

export async function createSellerShippingOption(
  container: MedusaContainer,
  sellerId: string,
  sellerName: string,
  regionId: string,
  serviceZoneId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [shippingProfile]
  } = await query.graph({
    entity: sellerShippingProfile.entryPoint,
    fields: ['shipping_profile_id'],
    filters: {
      seller_id: sellerId
    }
  })

  const {
    result: [shippingOption]
  } = await createShippingOptionsWorkflow.run({
    container,
    input: [
      {
        name: `${sellerName} shipping`,
        shipping_profile_id: shippingProfile.shipping_profile_id,
        service_zone_id: serviceZoneId,
        provider_id: 'manual_manual',
        type: {
          label: `${sellerName} shipping`,
          code: sellerName,
          description: 'Europe shipping'
        },
        rules: [
          { value: 'true', attribute: 'enabled_in_store', operator: 'eq' },
          { attribute: 'is_return', value: 'false', operator: 'eq' }
        ],
        prices: [
          { currency_code: 'eur', amount: 10 },
          { amount: 10, region_id: regionId }
        ],
        price_type: 'flat',
        data: { id: 'manual-fulfillment' }
      }
    ]
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      shipping_option_id: shippingOption.id
    }
  })

  return shippingOption
}

/**
 * Removes legacy seed products (e.g. old sneakers) so only TESE-relevant seed products remain.
 */
export async function cleanupLegacySeedProducts(container: MedusaContainer) {
  if (legacySeedHandles.length === 0) return
  const productService = container.resolve(Modules.PRODUCT)
  const existing = await productService.listProducts(
    { handle: legacySeedHandles },
    { take: legacySeedHandles.length }
  )
  if (existing.length === 0) return
  await deleteProductsWorkflow(container).run({
    input: { ids: existing.map((p) => p.id) }
  })
}

export async function createSellerProducts(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const productService = container.resolve(Modules.PRODUCT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const handles = productsToInsert.map((p) => p.handle)
  const existingProducts = await productService.listProducts(
    { handle: handles },
    { take: handles.length }
  )
  const existingByHandle = new Map(
    existingProducts.map((p) => [p.handle, p])
  )

  const toCreate = productsToInsert.filter(
    (p) => !existingByHandle.has(p.handle)
  )
  const linkSellerProduct = async (productId: string) => {
    try {
      await link.create({
        [SELLER_MODULE]: { seller_id: sellerId },
        [Modules.PRODUCT]: { product_id: productId }
      })
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (
        msg.includes('already exists') ||
        msg.includes('Cannot create multiple links')
      ) {
        return
      }
      throw err
    }
  }

  if (toCreate.length === 0) {
    for (const product of existingProducts) {
      await linkSellerProduct(product.id)
    }
    return existingProducts
  }

  const collections = await productService.listProductCollections(
    {},
    { select: ['id', 'title'] }
  )
  const categories = await productService.listProductCategories(
    {},
    { select: ['id', 'name'] }
  )
  const randomCategory = () =>
    categories[Math.floor(Math.random() * categories.length)]
  const randomCollection = () =>
    collections[Math.floor(Math.random() * collections.length)]

  const toInsert = toCreate.map((p) => ({
    ...p,
    categories: [{ id: randomCategory().id }],
    collection_id: randomCollection().id,
    sales_channels: [{ id: salesChannelId }]
  }))

  const { result: newProducts } = await createProductsWorkflow.run({
    container,
    input: {
      products: toInsert,
      additional_data: { seller_id: sellerId }
    }
  })

  for (const product of existingProducts) {
    await linkSellerProduct(product.id)
  }

  return [...existingProducts, ...newProducts]
}

export async function createInventoryItemStockLevels(
  container: MedusaContainer,
  stockLocationId: string
) {
  const inventoryService = container.resolve(Modules.INVENTORY)
  const [items, existingLevels] = await Promise.all([
    inventoryService.listInventoryItems({}, { select: ['id'] }),
    inventoryService.listInventoryLevels(
      { location_id: stockLocationId },
      { select: ['inventory_item_id'] }
    )
  ])
  const existingItemIds = new Set(
    existingLevels.map((l) => l.inventory_item_id)
  )
  const toCreate = items
    .filter((i) => !existingItemIds.has(i.id))
    .map((i) => ({
      inventory_item_id: i.id,
      location_id: stockLocationId,
      stocked_quantity: Math.floor(Math.random() * 50) + 1
    }))
  if (toCreate.length === 0) return existingLevels

  const { result } = await createInventoryLevelsWorkflow.run({
    container,
    input: { inventory_levels: toCreate }
  })
  return [...existingLevels, ...result]
}

export async function createDefaultCommissionLevel(container: MedusaContainer) {
  const commissionService =
    container.resolve<CommissionModuleService>(COMMISSION_MODULE)
  const existing = await commissionService.listCommissionRules({
    reference: 'site',
    reference_id: '',
    deleted_at: null
  })
  if (existing.length > 0) return

  await createCommissionRuleWorkflow.run({
    container,
    input: {
      name: 'default',
      is_active: true,
      reference: 'site',
      reference_id: '',
      rate: {
        include_tax: true,
        type: 'percentage',
        percentage_rate: 2
      }
    }
  })
}

export async function createConfigurationRules(container: MedusaContainer) {
  const configurationService =
    container.resolve<ConfigurationModuleService>(CONFIGURATION_MODULE)

  for (const [ruleType, isEnabled] of ConfigurationRuleDefaults) {
    const [existingRule] = await configurationService.listConfigurationRules({
      rule_type: ruleType
    })

    if (!existingRule) {
      await createConfigurationRuleWorkflow.run({
        container,
        input: {
          rule_type: ruleType,
          is_enabled: isEnabled
        }
      })
    }
  }
}
