import { WorkflowResponse, createWorkflow } from "@medusajs/workflows-sdk"

import { CreateMemberDTO } from "@mercurjs/framework"

import { createMemberStep, setSellerActorStep } from "../steps"

type AttachTeseSellerMemberInput = {
  member: CreateMemberDTO
  auth_identity_id: string
}

/**
 * Adds a member to an already-provisioned seller (a tese tenant that already has
 * a store) and points the caller's auth identity at that member. Used by the
 * seller SSO handoff for the 2nd+ user of a tenant.
 */
export const attachTeseSellerMemberWorkflow = createWorkflow(
  "attach-tese-seller-member",
  (input: AttachTeseSellerMemberInput) => {
    const member = createMemberStep(input.member)
    setSellerActorStep({
      authIdentityId: input.auth_identity_id,
      memberId: member.id,
    })
    return new WorkflowResponse(member)
  }
)

type LinkTeseSellerInput = {
  auth_identity_id: string
  member_id: string
}

/**
 * Re-points an auth identity at an existing member (re-login, or a
 * tenant/seller context switch). No new member is created. Genuinely
 * idempotent: `setSellerActorStep` overwrites, and does nothing at all when
 * the identity already points at this member.
 */
export const linkTeseSellerWorkflow = createWorkflow(
  "link-tese-seller",
  (input: LinkTeseSellerInput) => {
    setSellerActorStep({
      authIdentityId: input.auth_identity_id,
      memberId: input.member_id,
    })
    return new WorkflowResponse({ member_id: input.member_id })
  }
)
