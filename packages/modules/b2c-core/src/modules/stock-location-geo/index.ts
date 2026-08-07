import { Module } from '@medusajs/framework/utils'

import StockLocationGeoModuleService from './service'

export const STOCK_LOCATION_GEO_MODULE = 'stockLocationGeo'
export { StockLocationGeoModuleService }

export default Module(STOCK_LOCATION_GEO_MODULE, {
  service: StockLocationGeoModuleService
})
