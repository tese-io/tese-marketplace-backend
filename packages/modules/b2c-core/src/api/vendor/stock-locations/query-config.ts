export const vendorStockLocationFields = [
  'id',
  'metadata',
  'name',
  'address.id',
  'address.address_1',
  'address.address_2',
  'address.city',
  'address.country_code',
  'address.phone',
  'address.province',
  'address.postal_code',
  'address.metadata',
  '*fulfillment_sets',
  '*fulfillment_providers',
  'stock_location_geo.id',
  'stock_location_geo.latitude',
  'stock_location_geo.longitude',
  'stock_location_geo.location_precision'
]

export const vendorStockLocationQueryConfig = {
  list: {
    defaults: vendorStockLocationFields,
    isList: true
  },
  retrieve: {
    defaults: vendorStockLocationFields,
    isList: false
  }
}
