export const vendorServiceFields = [
  'id', 'title', 'handle', 'description', 'short_description',
  'type', 'status', 'seller_id', 'category_id',
  'thumbnail', 'duration_days', 'is_custom_quote_enabled',
  'min_budget', 'max_budget', 'currency_code',
  'tags', 'featured', 'rating', 'review_count', 'order_count',
  'created_at', 'updated_at'
]

export const vendorServiceDetailFields = [
  ...vendorServiceFields,
  'images', 'certifications_required', 'industries',
  'company_size_fit', 'metadata',
  'tiers.*', 'deliverables.*'
]

export const vendorServiceQueryConfig = {
  list: { defaults: vendorServiceFields, isList: true },
  retrieve: { defaults: vendorServiceDetailFields, isList: false }
}
