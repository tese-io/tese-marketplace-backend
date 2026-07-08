import { AuthenticatedMedusaRequest } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

/**
 * Trusted tese user id for the authenticated request, read from the
 * `tese-sso` provider identity's user_metadata — which only the SSO
 * handshake writes. Never read this from customer.metadata: the store API
 * lets customers update their own metadata, so a `tese_user_id` there is an
 * unverified client claim that would allow minting Matrix tokens for
 * another tese user's identity.
 */
export const getTrustedTeseUserId = async (
  req: AuthenticatedMedusaRequest
): Promise<string | null> => {
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId) {
    return null
  }

  try {
    const authModule = req.scope.resolve(Modules.AUTH)
    const identity = await authModule.retrieveAuthIdentity(authIdentityId, {
      relations: ['provider_identities'],
    })
    const providerIdentity = identity?.provider_identities?.find(
      (pi) => pi.provider === 'tese-sso'
    )
    const teseUserId = providerIdentity?.user_metadata?.tese_user_id
    return typeof teseUserId === 'string' && teseUserId ? teseUserId : null
  } catch {
    return null
  }
}
