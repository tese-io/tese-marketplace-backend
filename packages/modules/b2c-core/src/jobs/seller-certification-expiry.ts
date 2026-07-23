import { MedusaContainer } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

import { IntermediateEvents } from '@mercurjs/framework'

import {
  SELLER_CERTIFICATIONS_MODULE,
  SellerCertificationsModuleService
} from '../modules/seller-certifications'

/**
 * Daily job — mark verified seller certifications as expired once their
 * ``expires_at`` has passed. Runs at 03:15 UTC to give the vendor coverage
 * sweeper (03:00) a clean lane. Emits ``SELLER_CERTIFICATION_CHANGED`` for
 * every row it flips so the sync layer refreshes the marketplace card.
 *
 * Renewal-reminder emails (30 days out) are handled by a companion job we
 * add later once the notification template exists — this one only handles
 * the "hard expire" flip.
 */
export default async function sellerCertificationExpiryJob (
  container: MedusaContainer
) {
  const service: SellerCertificationsModuleService = container.resolve(
    SELLER_CERTIFICATIONS_MODULE
  )
  const eventBus = container.resolve(Modules.EVENT_BUS)

  const now = new Date()
  const PAGE = 1000
  let skip = 0
  const eligibleAll: Array<{ id: string; seller_id: string }> = []

  // Page through all verified certs — a single 1000-row slice missed
  // the tail once the marketplace grew past that many active certs.
  while (true) {
    const batch = await service.listSellerCertifications(
      { verification_status: 'verified' },
      { take: PAGE, skip }
    )
    if (!batch || batch.length === 0) break
    for (const row of batch as any[]) {
      if (!row?.expires_at) continue
      const t = new Date(row.expires_at).getTime()
      if (Number.isFinite(t) && t < now.getTime()) {
        eligibleAll.push({ id: row.id, seller_id: row.seller_id })
      }
    }
    if (batch.length < PAGE) break
    skip += PAGE
  }

  if (eligibleAll.length === 0) return

  const ids = eligibleAll.map((r) => r.id)
  await service.updateSellerCertifications({
    selector: { id: ids },
    data: {
      verification_status: 'expired'
    }
  })

  const events = eligibleAll.map((r) => ({
    name: IntermediateEvents.SELLER_CERTIFICATION_CHANGED,
    data: { id: r.id, seller_id: r.seller_id }
  }))
  await eventBus.emit(events as any)
}

export const config = {
  name: 'seller-certification-expiry',
  schedule: '15 3 * * *'
}
