# Mongo `store_product` → Medusa Product Field Mapping

Source of truth after unification: **Medusa/Postgres**. Mongo `_id` is preserved in `product.external_id` for backward compatibility with CNI recommendations (`store_product_id`).

## Identity

| Mongo | Medusa | Weaviate MarketplaceCatalog |
|-------|--------|------------------------------|
| `_id` | `external_id` | `store_product_id` |
| `id` (Shopify numeric) | `metadata.shopify_product_id` | `shopify_product_id` |
| Medusa `id` | `metadata.medusa_product_id` | (future `catalog_product_id`) |

## Core fields

| Mongo | Medusa |
|-------|--------|
| `title` | `title` |
| `handle` | `handle` |
| `body_html` | `description` |
| `product_type` (`Product` / `Service`) | `metadata.product_type` + `type_id` when available |
| `product_category` | `metadata.product_category` |
| `tags` | `tags` (Medusa tag objects) |
| `review_status` | `status` (see below) |
| `isArchived` | excluded from index; `status: draft` when archived |
| `tenant_id` | seller link via `additional_data.seller_id` |
| `vendor` | seller `name` |
| `metafields.vendorProfileHandle` | seller `handle` |

## Review status

| Mongo `review_status` | Medusa `status` |
|-----------------------|-----------------|
| `APPROVED` | `published` |
| `PENDING`, `UNDER_REVIEW` | `proposed` |
| `REJECTED` | `rejected` |
| `isArchived: true` | `draft` |

## CNI ranking metadata (required for MarketplaceCatalog)

All nested Mongo `metafields` are copied into Medusa `metadata` using the same keys:

- `useCases`, `industryFocus`, `esgMetrics`, `serviceCapabilities`, `serviceOptions`
- `purchaseType`, `vendorProfileHandle`, `keyFeatures`, `specifications`
- `certificationsImages`, `environmentalImpactMetrics`, `faqs`, etc.

The Weaviate projector reads these from `metadata` when `data_source=medusa_product`.

## Variants / options / images

| Mongo | Medusa |
|-------|--------|
| `options[].name` + `values` | `options[].title` + `values` |
| `variants[].title`, `option1/2/3`, `price` | `variants[].title`, `options`, `prices` |
| `images[].src` | `images[].url` |
| first image / `image.src` | `thumbnail` |

## Seller mapping

Mongo `tenant_id` → Medusa seller via migration map (`tenant-seller-map.json`):

- Lookup key: Mongo tenant ObjectId string
- Seller handle: `tenant-{tenantId}` or `metafields.vendorProfileHandle`
- Seller name: tenant `company_name` or product `vendor`

## Validation checklist (CNI projector)

Fields used by `project_store_product` / `project_medusa_product` must be present:

- [x] `external_id` / `_id` → `store_product_id`
- [x] `title`
- [x] `description` / `body_html`
- [x] `metadata.useCases` → `use_cases`
- [x] `metadata.industryFocus` → `industry_focus`
- [x] `metadata.esgMetrics` → `esg_metrics`
- [x] `metadata.serviceCapabilities` → `service_capabilities`
- [x] `metadata.purchaseType` → `purchase_type`
- [x] `metadata.vendorProfileHandle` → `vendor_profile_handle`
- [x] `metadata.product_type` / `product_type` → `product_type`
- [x] variants/prices → `price_min`, `price_max`
