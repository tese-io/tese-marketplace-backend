import { model } from '@medusajs/framework/utils'

export const StockLocationGeo = model.define('stock_location_geo', {
  id: model.id({ prefix: 'slgeo' }).primaryKey(),
  stock_location_id: model.text().unique(),
  latitude: model.number(),
  longitude: model.number(),
  location_precision: model.enum([
    'map_pinned',
    'geocoded',
    'country_centroid'
  ])
})
