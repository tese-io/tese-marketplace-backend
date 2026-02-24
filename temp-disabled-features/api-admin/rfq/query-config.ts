export const adminRfqFields = [
  'id', 'title', 'description', 'type', 'status', 'priority',
  'customer_id', 'seller_id', 'product_id', 'service_id',
  'quantity', 'unit', 'budget_min', 'budget_max', 'currency_code',
  'specifications', 'deadline', 'expires_at',
  'created_at', 'updated_at'
]

export const adminRfqDetailFields = [
  ...adminRfqFields,
  'quotation_versions.*',
  'quotation_versions.line_items.*',
  'quotation_versions.terms.*',
  'attachments', 'metadata'
]

export const adminRfqQueryConfig = {
  list: { defaults: adminRfqFields, isList: true },
  retrieve: { defaults: adminRfqDetailFields, isList: false }
}
