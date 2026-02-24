export const storeAiSearchFields = [
  'id',
  'title',
  'subtitle',
  'status',
  'description',
  'handle',
  'thumbnail',
  'collection_id',
  'type_id',
  'material',
  'metadata',
  '*brand',
  '*type',
  '*collection',
  '*options',
  '*options.values',
  '*tags',
  '*images',
  '*variants',
  '*variants.prices',
  '*variants.options',
  '*categories',
  '*seller',
  '*seller.reviews'
]

export const storeAiSearchQueryConfig = {
  defaults: storeAiSearchFields,
  isList: true
}
