export const adminServiceFields = [
  'id', 'title', 'handle', 'description', 'type', 'status',
  'seller_id', 'category_id', 'thumbnail',
  'is_custom_quote_enabled', 'currency_code',
  'featured', 'rating', 'review_count', 'order_count',
  'created_at', 'updated_at'
]

export const adminServiceDetailFields = [
  ...adminServiceFields,
  'short_description', 'images', 'duration_days',
  'min_budget', 'max_budget', 'tags',
  'certifications_required', 'industries', 'company_size_fit',
  'metadata', 'tiers.*', 'deliverables.*'
]

export const adminServiceQueryConfig = {
  list: { defaults: adminServiceFields, isList: true },
  retrieve: { defaults: adminServiceDetailFields, isList: false }
}
