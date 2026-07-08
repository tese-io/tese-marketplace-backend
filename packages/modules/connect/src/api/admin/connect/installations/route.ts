import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { resolveConnectService } from '../../../utils'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const connectService = await resolveConnectService(req.scope)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const installations = await connectService.listConnectorInstallations(
    {},
    { order: { created_at: 'DESC' } }
  )

  const sellerIds = [...new Set(installations.map((i) => i.seller_id))]
  const sellersById = new Map<string, { id: string; name?: string }>()

  if (sellerIds.length) {
    const { data: sellers } = await query.graph({
      entity: 'seller',
      fields: ['id', 'name', 'handle'],
      filters: { id: sellerIds }
    })

    for (const seller of sellers || []) {
      sellersById.set(seller.id, seller)
    }
  }

  res.json({
    installations: installations.map((installation) => ({
      ...installation,
      seller: sellersById.get(installation.seller_id) || null
    }))
  })
}
