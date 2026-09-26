import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

import { MemberRole } from '@mercurjs/framework'

import { SELLER_MODULE } from '../modules/seller'
import { SELLER_VERIFICATIONS_MODULE } from '../modules/seller-verifications'

/**
 * B-26: a reviewer confirmed the applicant is an existing store. Its people
 * move over as MEMBERs (never owner on a claim — the existing owner stays
 * in charge) and the shell store is archived, not deleted, so a wrong
 * merge can be unwound by hand. Recorded on the verification row.
 */
export type MergeRecord = {
  source_seller_id: string
  target_seller_id: string
  moved_member_ids: string[]
  reviewer: string
  at: string
}

export type AttachInput = {
  sourceSellerId: string
  targetSellerId: string
  verificationId: string
  reviewer: string
}

type Scope = { resolve: (key: string) => any }

/**
 * Members carry the seller FK, and auth identities point at member ids —
 * so re-pointing `seller_id` moves the login with it. The shell is
 * soft-deleted AFTER its members left so no cascade touches them. The
 * seller↔verification link is re-pointed best-effort; every read path
 * keys on the row's own `seller_id`, which the caller updates.
 */
export async function attachSellerAndArchiveShell(
  scope: Scope,
  input: AttachInput
): Promise<MergeRecord> {
  if (input.sourceSellerId === input.targetSellerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'A store cannot be attached to itself'
    )
  }

  const sellerService: any = scope.resolve(SELLER_MODULE)
  const remoteLink: any = scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const [target] = await sellerService.listSellers(
    { id: input.targetSellerId },
    { select: ['id', 'metadata'] }
  )
  if (!target) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Target seller ${input.targetSellerId} does not exist`
    )
  }

  const members: Array<{ id: string }> =
    (await sellerService.listMembers(
      { seller_id: input.sourceSellerId },
      { select: ['id'] }
    )) || []
  const moved: string[] = []
  for (const member of members) {
    await sellerService.updateMembers({
      id: member.id,
      seller_id: input.targetSellerId,
      role: MemberRole.MEMBER
    })
    moved.push(member.id)
  }

  await sellerService.softDeleteSellers([input.sourceSellerId])

  // Breadcrumb on the target; the verification row's merge_record is the
  // record of truth, so this never blocks a merge whose members already moved.
  try {
    const previous: string[] = Array.isArray(target.metadata?.merged_from_seller_ids)
      ? target.metadata.merged_from_seller_ids
      : []
    await sellerService.updateSellers({
      id: target.id,
      metadata: {
        ...(target.metadata || {}),
        merged_from_seller_ids: previous.includes(input.sourceSellerId)
          ? previous
          : [...previous, input.sourceSellerId]
      }
    })
  } catch (e) {
    console.error(
      `[seller-attach] ${input.targetSellerId}: could not stamp merged_from_seller_ids — ${(e as Error)?.message || e}`
    )
  }

  const linkPair = (sellerId: string) => ({
    [SELLER_MODULE]: { seller_id: sellerId },
    [SELLER_VERIFICATIONS_MODULE]: { seller_verification_id: input.verificationId }
  })
  try {
    await remoteLink.dismiss(linkPair(input.sourceSellerId))
  } catch {
    /* best-effort */
  }
  try {
    await remoteLink.create(linkPair(input.targetSellerId))
  } catch {
    /* best-effort */
  }

  return {
    source_seller_id: input.sourceSellerId,
    target_seller_id: input.targetSellerId,
    moved_member_ids: moved,
    reviewer: input.reviewer,
    at: new Date().toISOString()
  }
}
