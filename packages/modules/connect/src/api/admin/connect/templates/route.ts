import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    templates: [
      {
        id: 'generic-rest',
        name: 'Generic REST Catalog',
        description: 'List products from a REST endpoint with JSONPath field mapping',
        config: {
          base_url: 'https://example.com/api',
          auth: { type: 'bearer', token: 'YOUR_TOKEN' },
          endpoints: {
            list_products: {
              path: '/products',
              method: 'GET',
              items_path: '$.data[*]'
            }
          },
          field_map: {
            external_id: '$.id',
            title: '$.name',
            description: '$.description',
            sku: '$.sku',
            price: '$.price'
          }
        }
      }
    ]
  })
}
