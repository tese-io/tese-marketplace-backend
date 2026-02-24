export const storeRfqFields = [
  'id', 'title', 'description', 'type', 'status', 'priority',
  'customer_id', 'seller_id', 'product_id', 'service_id',
  'quantity', 'unit', 'budget_min', 'budget_max', 'currency_code',
  'specifications', 'deadline', 'expires_at',
  'created_at', 'updated_at'
]

export const storeRfqDetailFields = [
  ...storeRfqFields,
  'quotation_versions.*',
  'quotation_versions.line_items.*',
  'quotation_versions.terms.*',
  'attachments', 'metadata'
]

export const storeRfqQueryConfig = {
  list: { defaults: storeRfqFields, isList: true },
  retrieve: { defaults: storeRfqDetailFields, isList: false }
}
