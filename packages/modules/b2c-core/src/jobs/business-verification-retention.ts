import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  SELLER_VERIFICATIONS_MODULE,
  SellerVerificationsModuleService
} from '../modules/seller-verifications'
import { deletePrivateObject } from '../shared/utils/r2-upload'
import { runBusinessVerificationRetention } from '../utils/business-verification-retention'

/**
 * Nightly job (03:30 UTC, after the certification expiry lane) — B-29 / K-02.
 * Deletes the uploaded business document from the private bucket
 * `KYB_DOCUMENT_RETENTION_DAYS` (default 90) after a decline or archive; the
 * decision record stays. All logic lives in utils/business-verification-
 * retention.ts so it is unit-tested; this file only wires the container.
 */
export default async function businessVerificationRetentionJob(
  container: MedusaContainer
) {
  const service: SellerVerificationsModuleService = container.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const result = await runBusinessVerificationRetention({
    service: service as any,
    deleteObject: deletePrivateObject,
    log: logger
  })

  if (result.due > 0 || result.failed > 0) {
    logger.info(
      `[kyb-retention] window=${result.days}d scanned=${result.scanned} due=${result.due} purged=${result.purged} failed=${result.failed}`
    )
  }
}

export const config = {
  name: 'business-verification-retention',
  schedule: '30 3 * * *'
}
