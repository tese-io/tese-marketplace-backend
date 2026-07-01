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
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
  updateTaxRegionsWorkflow,
  createUserAccountWorkflow
} from '@medusajs/medusa/core-flows'

import { SELLER_MODULE } from '@mercurjs/b2c-core/modules/seller'
import {
  createConfigurationRuleWorkflow,
  createLocationFulfillmentSetAndAssociateWithSellerWorkflow,
  createSellerWorkflow
} from '@mercurjs/b2c-core/workflows'
import { createCommissionRuleWorkflow } from '@mercurjs/commission/workflows'
import {
  ConfigurationRuleDefaults,
  SELLER_SHIPPING_PROFILE_LINK
} from '@mercurjs/framework'

import { productsToInsert } from './seed-products'

const countries = ['be', 'de', 'dk', 'se', 'fr', 'es', 'it', 'pl', 'cz', 'nl']

export const SEED_SELLER_PROFILES = {
  euromaterials: {
    email: 'seller@mercurjs.com',
    password: 'secret',
    sellerName: 'EuroMaterials Trading',
    memberName: 'Procurement Desk',
  },
  exide: {
    email: 'exide-solar@tese.io',
    password: 'secret',
    sellerName: 'Exide Solar EU',
    memberName: 'Exide Sales Desk',
  },
  luminous: {
    email: 'luminous@tese.io',
    password: 'secret',
    sellerName: 'Luminous Energy Europe',
    memberName: 'Luminous Supply',
  },
  solaredge: {
    email: 'solaredge@tese.io',
    password: 'secret',
    sellerName: 'SolarEdge Distribution',
    memberName: 'SolarEdge EU Sales',
  },
  thinker: {
    email: 'thinker@tese.io',
    password: 'secret',
    sellerName: 'Thinker Renewables',
    memberName: 'Thinker Procurement',
  },
} as const

export type SeedSellerKey = keyof typeof SEED_SELLER_PROFILES

/** Which seller owns each product listing (defaults to euromaterials). */
export const PRODUCT_SELLER_KEY: Partial<
  Record<string, SeedSellerKey>
> = {
  'solar-kit': 'exide',
  'solar-kit-luminous': 'luminous',
  'solar-kit-solaredge': 'solaredge',
  'solar-kit-thinker': 'thinker',
}

export function groupProductHandlesBySeller(): Record<SeedSellerKey, string[]> {
  const groups = Object.keys(SEED_SELLER_PROFILES).reduce(
    (acc, key) => {
      acc[key as SeedSellerKey] = []
      return acc
    },
    {} as Record<SeedSellerKey, string[]>
  )

  for (const product of productsToInsert) {
    const sellerKey = PRODUCT_SELLER_KEY[product.handle] || 'euromaterials'
    groups[sellerKey].push(product.handle)
  }

  return groups
}

export async function createAdminUser(container: MedusaContainer) {
  const authService = container.resolve(Modules.AUTH)
  const userService = container.resolve(Modules.USER)
  
  // Check if admin user already exists
  const [existingUser] = await userService.listUsers({
    email: 'admin@mercurjs.com'
  })
  
  if (existingUser) {
    return existingUser
  }
  
  // Create auth identity with password
  const { authIdentity } = await authService.register('emailpass', {
    body: {
      email: 'admin@mercurjs.com',
      password: 'supersecret'
    }
  })
  
  if (!authIdentity?.id) {
    throw new Error('Failed to create admin auth identity')
  }
  
  // Create admin user account
  const { result: user } = await createUserAccountWorkflow(container).run({
    input: {
      userData: {
        email: 'admin@mercurjs.com',
        first_name: 'Admin',
        last_name: 'User'
      },
      authIdentityId: authIdentity.id
    }
  })
  
  return user
}

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
        default_sales_channel_id: salesChannelId,
        default_region_id: regionId
      }
    }
  })
}
export async function createRegions(container: MedusaContainer) {
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

  const { result: taxRegions } = await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code
    }))
  })

  await updateTaxRegionsWorkflow(container).run({
    input: taxRegions.map((taxRegion) => ({
      id: taxRegion.id,
      provider_id: 'tp_system'
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
  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        {
          name: 'Metals & Alloys',
          is_active: true,
          metadata: { sector_tags: ['industrial-materials'] }
        },
        {
          name: 'Recycled Materials',
          is_active: true,
          metadata: { sector_tags: ['industrial-materials'] }
        },
        {
          name: 'Polymers & Plastics',
          is_active: true,
          metadata: { sector_tags: ['industrial-materials'] }
        },
        {
          name: 'Industrial Chemicals',
          is_active: true,
          metadata: { sector_tags: ['industrial-materials'] }
        },
        {
          name: 'Construction Materials',
          is_active: true,
          metadata: { sector_tags: ['construction'] }
        },
        {
          name: 'Packaging',
          is_active: true,
          metadata: { sector_tags: ['construction', 'industrial-materials'] }
        },
        {
          name: 'Renewable Energy',
          is_active: true,
          metadata: { sector_tags: ['energy'] }
        },
        {
          name: 'Textiles & Fibres',
          is_active: true,
          metadata: { sector_tags: ['textiles'] }
        }
      ]
    }
  })

  return result
}

export async function createProductCollections(container: MedusaContainer) {
  const { result } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        { title: 'ISO Certified' },
        { title: 'Recycled & Circular' },
        { title: 'Bulk & Wholesale' },
        { title: 'Low-Carbon' }
      ]
    }
  })

  return result
}

export async function createNamedSeller(
  container: MedusaContainer,
  {
    email,
    password,
    sellerName,
    memberName,
  }: {
    email: string
    password: string
    sellerName: string
    memberName: string
  }
) {
  const sellerService = container.resolve(SELLER_MODULE)
  const [existing] = await sellerService.listSellers({ email })
  if (existing) {
    return existing
  }

  const authService = container.resolve(Modules.AUTH)

  const { authIdentity } = await authService.register('emailpass', {
    body: { email, password },
  })

  const { result: seller } = await createSellerWorkflow.run({
    container,
    input: {
      auth_identity_id: authIdentity?.id,
      member: {
        name: memberName,
        email,
      },
      seller: {
        name: sellerName,
      },
    },
  })

  return seller
}

/** @deprecated Use createNamedSeller */
export async function createSeller(container: MedusaContainer) {
  return createNamedSeller(container, {
    email: 'seller@mercurjs.com',
    password: 'secret',
    sellerName: 'EuroMaterials Trading',
    memberName: 'Procurement Desk',
  })
}

export async function createSellerStockLocation(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
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

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

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

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)

  const [zone] = await fulfillmentService.listServiceZones({
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
      service_zone_id: zone.id
    }
  })

  return zone
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
    entity: SELLER_SHIPPING_PROFILE_LINK,
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

export async function provisionMarketplaceSeller(
  container: MedusaContainer,
  salesChannelId: string,
  regionId: string,
  profile: (typeof SEED_SELLER_PROFILES)[SeedSellerKey]
) {
  const seller = await createNamedSeller(container, profile)
  const stockLocation = await createSellerStockLocation(
    container,
    seller.id,
    salesChannelId
  )
  const serviceZone = await createServiceZoneForFulfillmentSet(
    container,
    seller.id,
    stockLocation.fulfillment_sets[0].id
  )
  await createSellerShippingOption(
    container,
    seller.id,
    profile.sellerName,
    regionId,
    serviceZone.id
  )

  return { seller, stockLocation, serviceZone }
}

export async function createProductsForSeller(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string,
  handles: string[]
) {
  if (!handles.length) return []

  const productService = container.resolve(Modules.PRODUCT)
  const collections = await productService.listProductCollections(
    {},
    { select: ['id', 'title'] }
  )
  const categories = await productService.listProductCategories(
    {},
    { select: ['id', 'name'] }
  )

  const categoryByHandle: Record<string, string> = {
    'hot-rolled-steel-coil': 'Metals & Alloys',
    'stainless-steel-sheet': 'Metals & Alloys',
    'copper-cathode-grade-a': 'Metals & Alloys',
    'recycled-aluminium-ingots': 'Recycled Materials',
    'recycled-pet-flakes': 'Recycled Materials',
    'recycled-cotton-yarn': 'Textiles & Fibres',
    'hdpe-resin-pellets': 'Polymers & Plastics',
    'caustic-soda-flakes': 'Industrial Chemicals',
    'portland-cement-cem-i': 'Construction Materials',
    'recycled-kraft-linerboard': 'Packaging',
    'polypropylene-woven-bags': 'Packaging',
    'monocrystalline-solar-cells': 'Renewable Energy',
    'solar-kit': 'Renewable Energy',
    'solar-kit-luminous': 'Renewable Energy',
    'solar-kit-solaredge': 'Renewable Energy',
    'solar-kit-thinker': 'Renewable Energy',
    'chain-of-custody-verification': 'Recycled Materials',
  }
  const extraCategoriesByHandle: Record<string, string[]> = {
    'recycled-kraft-linerboard': ['Construction Materials'],
    'polypropylene-woven-bags': ['Construction Materials'],
    'hot-rolled-steel-coil': ['Construction Materials'],
  }
  const sectorTagsByHandle: Record<string, string[]> = {
    'chain-of-custody-verification': ['energy', 'construction', 'textiles'],
    'recycled-kraft-linerboard': ['construction'],
  }
  const collectionByHandle: Record<string, string> = {
    'recycled-aluminium-ingots': 'Low-Carbon',
    'recycled-pet-flakes': 'Recycled & Circular',
    'recycled-cotton-yarn': 'Recycled & Circular',
    'recycled-kraft-linerboard': 'Recycled & Circular',
    'monocrystalline-solar-cells': 'Low-Carbon',
    'solar-kit': 'Low-Carbon',
    'solar-kit-luminous': 'Low-Carbon',
    'solar-kit-solaredge': 'Low-Carbon',
    'solar-kit-thinker': 'Low-Carbon',
  }

  const findCategory = (name?: string) =>
    categories.find((c) => c.name === name) || categories[0]
  const findCollection = (title?: string) =>
    collections.find((c) => c.title === title) || collections[0]

  const handleSet = new Set(handles)
  const products = productsToInsert
    .filter((p) => handleSet.has(p.handle))
    .map((p) => {
      const primaryCategory = findCategory(categoryByHandle[p.handle])
      const extraNames = extraCategoriesByHandle[p.handle] || []
      const extraCategories = extraNames
        .map((name) => findCategory(name))
        .filter((c) => c.id !== primaryCategory.id)
      const categoryIds = [
        { id: primaryCategory.id },
        ...extraCategories.map((c) => ({ id: c.id })),
      ]
      const sectorTags = sectorTagsByHandle[p.handle]
      const metadata = sectorTags
        ? { ...(p.metadata || {}), sector_tags: sectorTags }
        : p.metadata

      return {
        ...p,
        metadata,
        categories: categoryIds,
        collection_id: findCollection(
          collectionByHandle[p.handle] || 'ISO Certified'
        ).id,
        sales_channels: [{ id: salesChannelId }],
      }
    })

  const { result } = await createProductsWorkflow.run({
    container,
    input: {
      products,
      additional_data: {
        seller_id: sellerId,
      },
    },
  })

  return result
}

/** @deprecated Use createProductsForSeller per seller batch */
export async function createSellerProducts(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const handles = productsToInsert.map((p) => p.handle)
  return createProductsForSeller(container, sellerId, salesChannelId, handles)
}

export async function createSellerInventoryLevels(
  container: MedusaContainer,
  sellerId: string,
  stockLocationId: string
) {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const productIds: string[] = await knex('seller_seller_product_product')
    .where({ seller_id: sellerId })
    .whereNull('deleted_at')
    .pluck('product_id')

  if (!productIds.length) return []

  const variantIds: string[] = await knex('product_variant')
    .whereIn('product_id', productIds)
    .whereNull('deleted_at')
    .pluck('id')

  if (!variantIds.length) return []

  const inventoryItemIds: string[] = await knex('product_variant_inventory_item')
    .whereIn('variant_id', variantIds)
    .pluck('inventory_item_id')

  if (!inventoryItemIds.length) return []

  const toCreate = inventoryItemIds.map((inventory_item_id) => ({
    inventory_item_id,
    location_id: stockLocationId,
    stocked_quantity: Math.floor(Math.random() * 50) + 1,
  }))

  const { result } = await createInventoryLevelsWorkflow.run({
    container,
    input: { inventory_levels: toCreate },
  })

  return result
}

/** @deprecated Use createSellerInventoryLevels per seller */
export async function createInventoryItemStockLevels(
  container: MedusaContainer,
  stockLocationId: string
) {
  const inventoryService = container.resolve(Modules.INVENTORY)
  const items = await inventoryService.listInventoryItems(
    {},
    { select: ['id'] }
  )

  const toCreate = items.map((i) => ({
    inventory_item_id: i.id,
    location_id: stockLocationId,
    stocked_quantity: Math.floor(Math.random() * 50) + 1
  }))

  const { result } = await createInventoryLevelsWorkflow.run({
    container,
    input: {
      inventory_levels: toCreate
    }
  })
  return result
}

export async function createDefaultCommissionLevel(container: MedusaContainer) {
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
  for (const [ruleType, isEnabled] of ConfigurationRuleDefaults) {
    await createConfigurationRuleWorkflow.run({
      container,
      input: {
        rule_type: ruleType,
        is_enabled: isEnabled
      }
    })
  }
}
