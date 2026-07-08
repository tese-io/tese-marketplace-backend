import { z } from 'zod'

export const VendorCreateMagentoInstallation = z.object({
  store_host: z.string().min(1),
  api_key: z.string().min(1),
  api_version: z.string().optional(),
  sync_config: z.record(z.unknown()).optional()
})

export const VendorCreateCustomApiInstallation = z.object({
  config: z.object({
    base_url: z.string().url(),
    auth: z.union([
      z.object({ type: z.literal('bearer'), token: z.string() }),
      z.object({
        type: z.literal('api_key'),
        header: z.string(),
        value: z.string()
      }),
      z.object({
        type: z.literal('basic'),
        username: z.string(),
        password: z.string()
      })
    ]),
    endpoints: z.object({
      list_products: z.object({
        path: z.string(),
        method: z.string().optional(),
        pagination: z
          .object({
            type: z.enum(['cursor', 'offset']),
            cursor_path: z.string().optional(),
            next_param: z.string().optional(),
            limit_param: z.string().optional(),
            page_size: z.number().optional()
          })
          .optional(),
        items_path: z.string().optional()
      }),
      list_categories: z
        .object({
          path: z.string(),
          method: z.string().optional(),
          items_path: z.string().optional()
        })
        .optional()
    }),
    field_map: z.record(z.string())
  }),
  sync_config: z.record(z.unknown()).optional()
})

export const VendorCategoryMappings = z.object({
  mappings: z.array(
    z.object({
      external_category_id: z.string(),
      external_category_path: z.string().optional(),
      medusa_category_id: z.string()
    })
  )
})

export const VendorShopifyAuthQuery = z.object({
  shop: z.string().min(1)
})

export type VendorCreateMagentoInstallationType = z.infer<
  typeof VendorCreateMagentoInstallation
>
export type VendorCreateCustomApiInstallationType = z.infer<
  typeof VendorCreateCustomApiInstallation
>
export type VendorCategoryMappingsType = z.infer<typeof VendorCategoryMappings>
