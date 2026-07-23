import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules
} from '@medusajs/framework/utils'

import { IntermediateEvents } from '@mercurjs/framework'

import {
  SELLER_CERTIFICATIONS_MODULE,
  SellerCertificationsModuleService
} from '../../../modules/seller-certifications'
import { SELLER_MODULE } from '../../../modules/seller'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import {
  fetchCertificationsCatalogue,
  isCertificationsCatalogueConfigured
} from '../../../utils/tese-certifications'

import {
  VendorAttachSellerCertificationType,
  VendorGetSellerCertificationsParamsType
} from './validators'

/**
 * @oas [get] /vendor/seller-certifications
 * operationId: "VendorListSellerCertifications"
 * summary: "List my attached certifications"
 * x-authenticated: true
 * tags:
 *   - Vendor Seller Certifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<VendorGetSellerCertificationsParamsType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )
  const service: SellerCertificationsModuleService = req.scope.resolve(
    SELLER_CERTIFICATIONS_MODULE
  )

  const filters: Record<string, unknown> = { seller_id: seller.id }
  const requestedStatus =
    typeof req.query.verification_status === 'string'
      ? req.query.verification_status
      : undefined
  if (requestedStatus) {
    filters.verification_status = requestedStatus
  }

  const take = req.queryConfig?.pagination?.take ?? 50
  const skip = req.queryConfig?.pagination?.skip ?? 0

  const [rows, count] = await service.listAndCountSellerCertifications(
    filters,
    {
      take,
      skip,
      order: { created_at: 'DESC' }
    }
  )

  res.status(200).json({
    seller_certifications: rows,
    count,
    offset: skip,
    limit: take
  })
}

/**
 * @oas [post] /vendor/seller-certifications
 * operationId: "VendorAttachSellerCertification"
 * summary: "Attach a certification to the current seller profile"
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/VendorAttachSellerCertification"
 * x-authenticated: true
 * tags:
 *   - Vendor Seller Certifications
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<VendorAttachSellerCertificationType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )
  const service: SellerCertificationsModuleService = req.scope.resolve(
    SELLER_CERTIFICATIONS_MODULE
  )
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  const { certification_slug, document_url, expires_at } = req.validatedBody

  if (isCertificationsCatalogueConfigured()) {
    const catalogue = await fetchCertificationsCatalogue()
    const slugs = new Set(catalogue.map((c) => c.slug))
    if (!slugs.has(certification_slug)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown certification slug: ${certification_slug}`
      )
    }
  }

  const existing = await service.listSellerCertifications({
    seller_id: seller.id,
    certification_slug
  })
  if (existing.length > 0) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Certification "${certification_slug}" already attached to this seller`
    )
  }

  const [row] = await service.createSellerCertifications([
    {
      seller_id: seller.id,
      certification_slug,
      document_url: document_url ?? null,
      verification_status: 'pending',
      verified_by: null,
      verified_at: null,
      verification_notes: null,
      expires_at: expires_at ?? null
    }
  ])

  await remoteLink.create({
    [SELLER_MODULE]: { seller_id: seller.id },
    [SELLER_CERTIFICATIONS_MODULE]: { seller_certification_id: row.id }
  })

  await eventBus.emit({
    name: IntermediateEvents.SELLER_CERTIFICATION_CHANGED,
    data: { id: row.id, seller_id: seller.id }
  })

  res.status(201).json({ seller_certification: row })
}
