import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

import {
  SELLER_VERIFICATIONS_MODULE,
  SellerVerificationsModuleService
} from '../../../modules/seller-verifications'
import { SELLER_MODULE } from '../../../modules/seller'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import {
  deriveBusinessVerificationState,
  normalizeRegistrationNumber
} from '../../../utils/business-verification'

import { VendorSubmitBusinessVerificationType } from './validators'

const listForSeller = async (
  service: SellerVerificationsModuleService,
  sellerId: string
) =>
  service.listSellerVerifications(
    { seller_id: sellerId },
    { order: { created_at: 'DESC' }, take: 50 }
  )

/**
 * @oas [get] /vendor/business-verification
 * operationId: "VendorGetBusinessVerification"
 * summary: "Current business-verification state for the seller (B-27 states)"
 * x-authenticated: true
 * tags:
 *   - Vendor Business Verification
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const service: SellerVerificationsModuleService = req.scope.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const rows = await listForSeller(service, seller.id)
  const { state, current } = deriveBusinessVerificationState(rows)

  // The vendor never sees reviewer internals (duplicate signals, method).
  const wire = (r: (typeof rows)[number]) => ({
    id: r.id,
    status: r.status,
    document_kind: r.document_kind,
    document_filename: r.document_filename,
    legal_name: r.legal_name,
    registration_number: r.registration_number,
    country_of_registration: r.country_of_registration,
    reviewer_note: r.status === 'rejected' ? r.reviewer_note : null,
    reviewed_at: r.reviewed_at,
    created_at: r.created_at
  })

  res.status(200).json({
    state,
    current: current ? wire(current) : null,
    history: rows.filter((r) => r.status !== 'archived').map(wire)
  })
}

/**
 * @oas [post] /vendor/business-verification
 * operationId: "VendorSubmitBusinessVerification"
 * summary: "Submit a business registration document for review (B-23)"
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/VendorSubmitBusinessVerification"
 * tags:
 *   - Vendor Business Verification
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<VendorSubmitBusinessVerificationType>,
  res: MedusaResponse
) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const service: SellerVerificationsModuleService = req.scope.resolve(
    SELLER_VERIFICATIONS_MODULE
  )
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const existing = await listForSeller(service, seller.id)
  const { state } = deriveBusinessVerificationState(existing)
  if (state === 'verified') {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'This business is already verified'
    )
  }
  if (state === 'under_review') {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      'A business verification is already under review'
    )
  }

  const body = req.validatedBody
  const [row] = await service.createSellerVerifications([
    {
      seller_id: seller.id,
      document_key: body.document_key,
      document_url: body.document_url,
      document_filename: body.document_filename ?? null,
      document_kind: body.document_kind,
      legal_name: body.legal_name,
      registration_number: normalizeRegistrationNumber(body.registration_number),
      country_of_registration: body.country_of_registration,
      ocr_prefill: (body.ocr_prefill ?? null) as Record<string, unknown> | null,
      status: 'pending',
      verification_method: null,
      reviewed_by: null,
      reviewed_at: null,
      reviewer_note: null,
      duplicate_signals: null
    }
  ])

  await remoteLink.create({
    [SELLER_MODULE]: { seller_id: seller.id },
    [SELLER_VERIFICATIONS_MODULE]: { seller_verification_id: row.id }
  })

  res.status(201).json({
    state: 'under_review',
    current: {
      id: row.id,
      status: row.status,
      document_kind: row.document_kind,
      document_filename: row.document_filename,
      legal_name: row.legal_name,
      registration_number: row.registration_number,
      country_of_registration: row.country_of_registration,
      reviewer_note: null,
      reviewed_at: null,
      created_at: row.created_at
    }
  })
}
