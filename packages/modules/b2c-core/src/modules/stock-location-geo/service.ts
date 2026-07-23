import { MedusaService } from '@medusajs/framework/utils'

import { StockLocationGeo } from './models/stock-location-geo'

class StockLocationGeoModuleService extends MedusaService({
  StockLocationGeo
}) {}

export default StockLocationGeoModuleService
