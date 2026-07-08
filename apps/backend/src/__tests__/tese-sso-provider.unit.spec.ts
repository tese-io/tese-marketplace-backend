import { MedusaError } from "@medusajs/framework/utils"

import TeseSsoProviderService from "../../../../packages/modules/auth-tese-sso/src/providers/tese-sso/services/tese-sso-provider"
import TeseSsoSellerProviderService from "../../../../packages/modules/auth-tese-sso/src/providers/tese-sso-seller/service"

const OPTIONS = { teseBackendUrl: "http://tese.test:8000" }
const deps = { logger: { error: jest.fn(), info: jest.fn() } as any }

function makeProvider() {
  return new TeseSsoProviderService(deps, OPTIONS)
}

function mockFetchOnce(impl: () => any) {
  ;(global as any).fetch = jest.fn().mockImplementation(async () => impl())
}

const validTeseResponse = {
  ok: true,
  json: async () => ({
    status: true,
    data: {
      user: {
        id: "u123",
        email: "kiran@tese.io",
        first_name: "Kiran",
        last_name: "More",
        phone: "+100",
      },
    },
  }),
}

describe("TeseSsoProviderService", () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete (global as any).fetch
  })

  it("throws if teseBackendUrl option is missing", () => {
    expect(() => new TeseSsoProviderService(deps, {} as any)).toThrow(
      /teseBackendUrl/
    )
  })

  it("fails without calling tese when sso_key is absent", async () => {
    const provider = makeProvider()
    ;(global as any).fetch = jest.fn()
    const authIdentityService = { retrieve: jest.fn(), create: jest.fn() } as any

    const res = await provider.authenticate({ body: {} } as any, authIdentityService)

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Missing sso_key/)
    expect((global as any).fetch).not.toHaveBeenCalled()
  })

  it("rejects an invalid/expired key (tese status false)", async () => {
    const provider = makeProvider()
    mockFetchOnce(() => ({ ok: true, json: async () => ({ status: false, data: {} }) }))
    const authIdentityService = { retrieve: jest.fn(), create: jest.fn() } as any

    const res = await provider.authenticate(
      { body: { sso_key: "bad" } } as any,
      authIdentityService
    )

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Invalid or expired SSO key/)
    expect(authIdentityService.create).not.toHaveBeenCalled()
  })

  it("returns the existing auth identity for a known tese user", async () => {
    const provider = makeProvider()
    mockFetchOnce(() => validTeseResponse)
    const existing = { id: "authusr_1", entity_id: "u123" }
    const authIdentityService = {
      retrieve: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
    } as any

    const res = await provider.authenticate(
      { body: { sso_key: "good" } } as any,
      authIdentityService
    )

    expect(authIdentityService.retrieve).toHaveBeenCalledWith({ entity_id: "u123" })
    expect(authIdentityService.create).not.toHaveBeenCalled()
    expect(res).toEqual({ success: true, authIdentity: existing })
  })

  it("provisions a claimable identity (with profile metadata) for a new user", async () => {
    const provider = makeProvider()
    mockFetchOnce(() => validTeseResponse)
    const created = { id: "authusr_new", entity_id: "u123" }
    const notFound = new MedusaError(MedusaError.Types.NOT_FOUND, "nope")
    const authIdentityService = {
      retrieve: jest.fn().mockRejectedValue(notFound),
      create: jest.fn().mockResolvedValue(created),
    } as any

    const res = await provider.authenticate(
      { body: { sso_key: "good" } } as any,
      authIdentityService
    )

    expect(authIdentityService.create).toHaveBeenCalledTimes(1)
    const arg = authIdentityService.create.mock.calls[0][0]
    expect(arg.entity_id).toBe("u123")
    expect(arg.user_metadata).toMatchObject({
      tese_user_id: "u123",
      email: "kiran@tese.io",
      first_name: "Kiran",
      last_name: "More",
    })
    expect(res).toEqual({ success: true, authIdentity: created })
  })

  it("surfaces non-NOT_FOUND retrieve errors instead of creating", async () => {
    const provider = makeProvider()
    mockFetchOnce(() => validTeseResponse)
    const authIdentityService = {
      retrieve: jest.fn().mockRejectedValue({ type: "unexpected", message: "boom" }),
      create: jest.fn(),
    } as any

    const res = await provider.authenticate(
      { body: { sso_key: "good" } } as any,
      authIdentityService
    )

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/boom/)
    expect(authIdentityService.create).not.toHaveBeenCalled()
  })

  it("treats a network failure as an invalid key (no throw)", async () => {
    const provider = makeProvider()
    ;(global as any).fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    const authIdentityService = { retrieve: jest.fn(), create: jest.fn() } as any

    const res = await provider.authenticate(
      { body: { sso_key: "good" } } as any,
      authIdentityService
    )

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/Invalid or expired SSO key/)
  })

  it("does not support callback-based auth", async () => {
    const provider = makeProvider()
    await expect(provider.validateCallback()).rejects.toThrow(/does not support/)
  })
})

const sellerTeseResponse = {
  ok: true,
  json: async () => ({
    status: true,
    data: {
      user: { id: "u123", email: "v@tese.io", first_name: "V", last_name: "Dor" },
      tenant: {
        id: "ten_1",
        name: "Acme",
        handle: "acme",
        role: "Owner",
        organization_admin: true,
      },
    },
  }),
}

describe("TeseSsoSellerProviderService", () => {
  const makeSeller = () => new TeseSsoSellerProviderService(deps, OPTIONS)

  afterEach(() => {
    jest.restoreAllMocks()
    delete (global as any).fetch
  })

  it("exchanges against the SELLER validate endpoint", async () => {
    const provider = makeSeller()
    const fetchMock = jest.fn().mockResolvedValue(sellerTeseResponse)
    ;(global as any).fetch = fetchMock
    const authIdentityService = {
      retrieve: jest.fn().mockResolvedValue({ id: "authusr_1" }),
      update: jest.fn().mockResolvedValue({ id: "authusr_1" }),
      create: jest.fn(),
    } as any

    await provider.authenticate({ body: { sso_key: "k" } } as any, authIdentityService)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/sso/seller/validate-sso")
  })

  it("provisions a new seller identity pinned to the tenant + role", async () => {
    const provider = makeSeller()
    ;(global as any).fetch = jest.fn().mockResolvedValue(sellerTeseResponse)
    const notFound = new MedusaError(MedusaError.Types.NOT_FOUND, "nope")
    const authIdentityService = {
      retrieve: jest.fn().mockRejectedValue(notFound),
      create: jest.fn().mockResolvedValue({ id: "authusr_new" }),
      update: jest.fn(),
    } as any

    const res = await provider.authenticate(
      { body: { sso_key: "k" } } as any,
      authIdentityService
    )

    const arg = authIdentityService.create.mock.calls[0][0]
    expect(arg.entity_id).toBe("u123")
    expect(arg.user_metadata).toMatchObject({
      tese_user_id: "u123",
      tese_tenant_id: "ten_1",
      tese_tenant_name: "Acme",
      tese_role: "Owner",
      tese_org_admin: true,
    })
    expect(res.success).toBe(true)
  })

  it("refreshes tenant/role on every login for an existing identity", async () => {
    const provider = makeSeller()
    ;(global as any).fetch = jest.fn().mockResolvedValue(sellerTeseResponse)
    const updated = { id: "authusr_1", refreshed: true }
    const authIdentityService = {
      retrieve: jest.fn().mockResolvedValue({ id: "authusr_1" }),
      update: jest.fn().mockResolvedValue(updated),
      create: jest.fn(),
    } as any

    const res = await provider.authenticate(
      { body: { sso_key: "k" } } as any,
      authIdentityService
    )

    expect(authIdentityService.update).toHaveBeenCalledTimes(1)
    const [entityId, payload] = authIdentityService.update.mock.calls[0]
    expect(entityId).toBe("u123")
    expect(payload.user_metadata).toMatchObject({ tese_tenant_id: "ten_1", tese_org_admin: true })
    expect(res).toEqual({ success: true, authIdentity: updated })
  })
})
