import { WorkflowResponse, createWorkflow } from "@medusajs/workflows-sdk"
import { setAuthAppMetadataStep } from "@medusajs/medusa/core-flows"

import { CreateMemberDTO } from "@mercurjs/framework"

import { createMemberStep } from "../steps"

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
    setAuthAppMetadataStep({
      authIdentityId: input.auth_identity_id,
      actorType: "seller",
      value: member.id,
    })
    return new WorkflowResponse(member)
  }
)

type LinkTeseSellerInput = {
  auth_identity_id: string
  member_id: string
}

/**
 * Re-points an auth identity at an existing member (idempotent re-login, or a
 * tenant/seller context switch). No new member is created.
 */
export const linkTeseSellerWorkflow = createWorkflow(
  "link-tese-seller",
  (input: LinkTeseSellerInput) => {
    setAuthAppMetadataStep({
      authIdentityId: input.auth_identity_id,
      actorType: "seller",
      value: input.member_id,
    })
    return new WorkflowResponse({ member_id: input.member_id })
  }
)
