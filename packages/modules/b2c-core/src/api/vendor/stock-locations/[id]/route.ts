import { MedusaResponse, AuthenticatedMedusaRequest } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  deleteStockLocationsWorkflow,
  updateStockLocationsWorkflow
} from '@medusajs/medusa/core-flows'

import { IntermediateEvents } from '@mercurjs/framework'

import {
  STOCK_LOCATION_GEO_MODULE,
  StockLocationGeoModuleService
} from '../../../../modules/stock-location-geo'

import { VendorUpdateStockLocationType } from '../validators'

/**
 * @oas [get] /vendor/stock-locations/{id}
 * operationId: "VendorGetStockLocation"
 * summary: "Get Stock Location"
 * description: "Retrieves a Stock Location by id."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Stock Location
 *     schema:
 *       type: string
 *   - in: query
 *     name: fields
 *     description: The comma-separated fields to include in the response
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             stock_location:
 *               $ref: "#/components/schemas/VendorStockLocation"
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [stockLocation]
  } = await query.graph(
    {
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: {
        id: req.params.id
      }
    },
    { throwIfKeyNotFound: true }
  )

  res.status(200).json({
    stock_location: stockLocation
  })
}

/**
 * @oas [post] /vendor/stock-locations/{id}
 * operationId: "VendorUpdateStockLocation"
 * summary: "Update Stock Location"
 * description: "Updates a Stock Location."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Stock Location
 *     schema:
 *       type: string
 *   - in: query
 *     name: fields
 *     description: The comma-separated fields to include in the response
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/VendorUpdateStockLocation"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             stock_location:
 *               $ref: "#/components/schemas/VendorStockLocation"
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpdateStockLocationType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const { geo, ...locationUpdate } = req.validatedBody

  if (Object.keys(locationUpdate).length > 0) {
    await updateStockLocationsWorkflow(req.scope).run({
      input: {
        selector: {
          id: req.params.id
        },
        update: locationUpdate
      }
    })
  }

  if (geo) {
    const geoService: StockLocationGeoModuleService = req.scope.resolve(
      STOCK_LOCATION_GEO_MODULE
    )
    const existing = await geoService.listStockLocationGeoes({
      stock_location_id: req.params.id
    })
    if (existing.length > 0) {
      await geoService.updateStockLocationGeoes({
        id: existing[0].id,
        latitude: geo.latitude,
        longitude: geo.longitude,
        location_precision: geo.location_precision
      })
    } else {
      const [geoRecord] = await geoService.createStockLocationGeoes([
        {
          stock_location_id: req.params.id,
          latitude: geo.latitude,
          longitude: geo.longitude,
          location_precision: geo.location_precision
        }
      ])
      await remoteLink.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: req.params.id },
        [STOCK_LOCATION_GEO_MODULE]: { stock_location_geo_id: geoRecord.id }
      })
    }
  }

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: IntermediateEvents.STOCK_LOCATION_CHANGED,
    data: { id: req.params.id }
  })

  const {
    data: [stockLocation]
  } = await query.graph(
    {
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: {
        id: req.params.id
      }
    },
    { throwIfKeyNotFound: true }
  )

  res.status(200).json({
    stock_location: stockLocation
  })
}

/**
 * @oas [delete] /vendor/stock-locations/{id}
 * operationId: "VendorDeleteStockLocationById"
 * summary: "Delete stock location"
 * description: "Deletes stock location by id for the authenticated vendor."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the stock location.
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: The ID of the deleted resource
 *             object:
 *               type: string
 *               description: The type of the object that was deleted
 *             deleted:
 *               type: boolean
 *               description: Whether or not the items were deleted
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const geoService: StockLocationGeoModuleService = req.scope.resolve(
    STOCK_LOCATION_GEO_MODULE
  )
  const existingGeo = await geoService.listStockLocationGeoes({
    stock_location_id: req.params.id
  })
  if (existingGeo.length > 0) {
    await geoService.softDeleteStockLocationGeoes([existingGeo[0].id])
  }

  await deleteStockLocationsWorkflow(req.scope).run({
    input: {
      ids: [req.params.id]
    }
  })

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: IntermediateEvents.STOCK_LOCATION_CHANGED,
    data: { id: req.params.id }
  })

  res.status(200).json({
    id: req.params.id,
    object: 'stock_location',
    deleted: true
  })
}
