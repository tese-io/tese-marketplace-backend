import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"

/**
 * @oas [post] /store/customers/tese
 * operationId: "StoreCreateTeseCustomer"
 * summary: "Provision a customer for a tese-SSO identity"
 * description: >
 *   Completes registration for a customer that authenticated through the
 *   `tese-sso` provider. Reads the tese profile stashed on the (claimable)
 *   auth identity and creates + links a Medusa customer. Idempotent: if the
 *   identity is already linked to a customer, that customer is returned.
 * x-authenticated: true
 * responses:
 *   "201":
 *     description: Created
 * tags:
 *   - Store Customers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const authIdentityId = req.auth_context?.auth_identity_id
  if (!authIdentityId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Missing authentication context"
    )
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  // Idempotent: identity already linked to a customer.
  if (req.auth_context?.actor_id) {
    const customer = await customerModule.retrieveCustomer(
      req.auth_context.actor_id
    )
    return res.status(200).json({ customer })
  }

  const authModule = req.scope.resolve(Modules.AUTH)
  const identity = await authModule.retrieveAuthIdentity(authIdentityId, {
    relations: ["provider_identities"],
  })
  const providerIdentity = identity?.provider_identities?.find(
    (pi) => pi.provider === "tese-sso"
  )
  const meta: Record<string, any> = providerIdentity?.user_metadata ?? {}

  if (!meta.email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "tese identity is missing an email; cannot create customer"
    )
  }

  const { result: customer } = await createCustomerAccountWorkflow(
    req.scope
  ).run({
    input: {
      authIdentityId,
      customerData: {
        email: meta.email,
        first_name: meta.first_name,
        last_name: meta.last_name,
        phone: meta.phone,
        metadata: { tese_user_id: meta.tese_user_id },
      },
    },
  })

  return res.status(201).json({ customer })
}
