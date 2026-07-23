import { defineLink } from '@medusajs/framework/utils'
import StockLocationModule from '@medusajs/medusa/stock-location'

import StockLocationGeoModule from '../modules/stock-location-geo'

export default defineLink(StockLocationModule.linkable.stockLocation, {
  linkable: StockLocationGeoModule.linkable.stockLocationGeo,
  isList: false
})
