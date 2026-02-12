/**
 * TESE: Ensures each seller has a "digital" fulfillment set and a zero-price
 * "Service – no delivery" shipping option for service-only carts.
 * Used at seed and when vendor creates their first (shipping) fulfillment set.
 */

import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow
} from '@medusajs/medusa/core-flows'

import { SELLER_MODULE } from '@mercurjs/seller'

import sellerShippingProfile from '../../links/seller-shipping-profile'
import { createLocationFulfillmentSetAndAssociateWithSellerWorkflow } from './workflows'

const SERVICE_FULFILLMENT_SET_TYPE = 'digital'
const SERVICE_SHIPPING_OPTION_NAME = 'Service – no delivery'
const SERVICE_SHIPPING_OPTION_CODE = 'service_no_delivery'
const COUNTRIES = [
  'be',
  'de',
  'dk',
  'se',
  'fr',
  'es',
  'it',
  'pl',
  'cz',
  'nl'
]

export type EnsureServiceFulfillmentSetInput = {
  sellerId: string
  sellerName: string
  regionId: string
  locationId: string
}

/**
 * Creates a digital fulfillment set and "Service – no delivery" (zero-price)
 * shipping option for the seller. Idempotent: skips if seller already has
 * a digital fulfillment set for this location.
 */
export async function ensureServiceFulfillmentSetForSeller(
  container: MedusaContainer,
  input: EnsureServiceFulfillmentSetInput
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [stockLocation]
  } = await query.graph({
    entity: 'stock_location',
    fields: ['id', 'fulfillment_sets.id', 'fulfillment_sets.type'],
    filters: { id: input.locationId }
  })

  if (!stockLocation?.fulfillment_sets) {
    return
  }

  const hasDigital = stockLocation.fulfillment_sets.some(
    (fs: { type?: string }) => fs.type === SERVICE_FULFILLMENT_SET_TYPE
  )
  if (hasDigital) {
    return
  }

  await createLocationFulfillmentSetAndAssociateWithSellerWorkflow(container).run(
    {
      input: {
        location_id: input.locationId,
        fulfillment_set_data: {
          name: `${input.sellerId} service fulfillment set`,
          type: SERVICE_FULFILLMENT_SET_TYPE
        },
        seller_id: input.sellerId
      }
    }
  )

  const {
    data: [locationWithNewSet]
  } = await query.graph({
    entity: 'stock_location',
    fields: ['fulfillment_sets.id', 'fulfillment_sets.type'],
    filters: { id: input.locationId }
  })

  const digitalSet = locationWithNewSet?.fulfillment_sets?.find(
    (fs: { type?: string }) => fs.type === SERVICE_FULFILLMENT_SET_TYPE
  )
  if (!digitalSet?.id) {
    return
  }

  await createServiceZonesWorkflow.run({
    container,
    input: {
      data: [
        {
          fulfillment_set_id: digitalSet.id,
          name: 'Europe',
          geo_zones: COUNTRIES.map((c) => ({
            type: 'country',
            country_code: c
          }))
        }
      ]
    }
  })

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const [serviceZone] = await fulfillmentService.listServiceZones({
    fulfillment_set: {
      id: digitalSet.id
    }
  })

  if (!serviceZone?.id) {
    return
  }

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: input.sellerId
    },
    [Modules.FULFILLMENT]: {
      service_zone_id: serviceZone.id
    }
  })

  const {
    data: [shippingProfile]
  } = await query.graph({
    entity: sellerShippingProfile.entryPoint,
    fields: ['shipping_profile_id'],
    filters: {
      seller_id: input.sellerId
    }
  })

  if (!shippingProfile?.shipping_profile_id) {
    return
  }

  const {
    result: [shippingOption]
  } = await createShippingOptionsWorkflow.run({
    container,
    input: [
      {
        name: SERVICE_SHIPPING_OPTION_NAME,
        shipping_profile_id: shippingProfile.shipping_profile_id,
        service_zone_id: serviceZone.id,
        provider_id: 'manual_manual',
        type: {
          label: SERVICE_SHIPPING_OPTION_NAME,
          code: SERVICE_SHIPPING_OPTION_CODE,
          description: 'No delivery – service or digital product'
        },
        rules: [
          { value: 'true', attribute: 'enabled_in_store', operator: 'eq' },
          { attribute: 'is_return', value: 'false', operator: 'eq' }
        ],
        prices: [
          { currency_code: 'eur', amount: 0 },
          { amount: 0, region_id: input.regionId }
        ],
        price_type: 'flat',
        data: { id: 'manual-fulfillment', service: true }
      }
    ]
  })

  await link.create({
    [SELLER_MODULE]: {
      seller_id: input.sellerId
    },
    [Modules.FULFILLMENT]: {
      shipping_option_id: shippingOption.id
    }
  })
}

/** Code used in shipping option type so storefront can identify service option */
export const SERVICE_SHIPPING_OPTION_TYPE_CODE = SERVICE_SHIPPING_OPTION_CODE
