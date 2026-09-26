/**
 * B-01 per-path duplicate test — tese.io-first SSO entry path.
 *
 * Two jobs here. (1) When a domain-matching orphan seller exists, the SSO
 * store-provision route must NOT create a second store: it emits a
 * human-confirmed claim request and answers 202 claim_pending; when the
 * duplicate lookup is unavailable it fails OPEN. (2) A returning user must
 * land back on their own store. That second half regressed in production:
 * the route keyed on the handle `tese-<tenantId>`, but createSellerStep
 * derives every handle from the store name, so the lookup never matched,
 * every repeat login re-entered claim-or-create, and stores that were
 * simply un-findable got proposed as claim targets to strangers.
 */

const createRun = jest.fn()
const attachRun = jest.fn()
const linkRun = jest.fn()

jest.mock('../../../../../workflows/seller/workflows', () => ({
  createSellerWorkflow: jest.fn(() => ({ run: createRun })),
  attachTeseSellerMemberWorkflow: jest.fn(() => ({ run: attachRun })),
  linkTeseSellerWorkflow: jest.fn(() => ({ run: linkRun })),
}))
jest.mock('../../../../../utils/tese-vendor-claims', () => ({
  ...jest.requireActual('../../../../../utils/tese-vendor-claims'),
  isVendorClaimsConfigured: jest.fn(() => true),
  lookupVendorDuplicates: jest.fn(),
  notifySellerLinked: jest.fn().mockResolvedValue({ ok: true }),
}))

import {
  lookupVendorDuplicates,
  notifySellerLinked,
} from '../../../../../utils/tese-vendor-claims'
import { POST } from '../route'

const lookupMock = lookupVendorDuplicates as jest.Mock
const notifyMock = notifySellerLinked as jest.Mock

type Seller = {
  id: string
  name?: string
  handle?: string
  email?: string | null
  website?: string | null
  metadata?: Record<string, unknown> | null
}

function makeReq(opts: {
  sellers?: Seller[]
  allSellers?: Seller[]
  requests?: unknown[]
  members?: Array<{ id: string; seller_id: string; email?: string }>
  appMetadata?: Record<string, unknown>
}) {
  const all = opts.allSellers ?? []
  const sellerService = {
    listSellers: jest.fn(async (filters: Record<string, unknown>) => {
      if (filters && 'handle' in filters) {
        return (opts.sellers ?? []).filter((s) => s.handle === filters.handle)
      }
      if (filters && 'id' in filters) {
        return [...all, ...(opts.sellers ?? [])].filter((s) => s.id === filters.id)
      }
      return all
    }),
    listMembers: jest.fn(async (filters: Record<string, unknown>) => {
      const members = opts.members ?? []
      if (filters && 'id' in filters) return members.filter((m) => m.id === filters.id)
      if (filters && 'seller_id' in filters) {
        return members.filter(
          (m) =>
            m.seller_id === filters.seller_id &&
            (!('email' in filters) || m.email === filters.email)
        )
      }
      return members
    }),
    updateSellers: jest.fn(async () => undefined),
  }
  const eventBus = { emit: jest.fn() }
  const query = {
    graph: jest.fn(async ({ entity }: { entity: string }) => {
      if (entity === 'provider_identity') {
        return { data: [{ id: 'pid_1', entity_id: 'user@x' }] }
      }
      if (entity === 'request') {
        return { data: opts.requests ?? [] }
      }
      return { data: [] }
    }),
  }
  const authModule = {
    retrieveAuthIdentity: jest.fn(async () => ({
      app_metadata: opts.appMetadata ?? {},
      provider_identities: [
        {
          provider: 'tese-sso-seller',
          user_metadata: {
            tese_tenant_id: 'TENANT1',
            tese_tenant_name: 'Acme Marine Ltd',
            email: 'al@acmemarine.mu',
            first_name: 'Al',
          },
        },
      ],
    })),
  }
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const req = {
    auth_context: { auth_identity_id: 'auth_1' },
    scope: {
      resolve: (key: string) => {
        if (key === 'seller') return sellerService
        if (key === 'auth') return authModule
        if (key === 'query') return query
        if (key === 'event_bus') return eventBus
        if (key === 'logger') return logger
        throw new Error(`unexpected resolve: ${key}`)
      },
    },
  }
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return { req, res, eventBus, sellerService, logger }
}

const usableLookup = {
  domain: 'acmemarine.mu',
  domain_usable: true,
  reason: null,
  candidate: null,
  tenants: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  createRun.mockResolvedValue({ result: { id: 'sel_NEW', handle: 'acme-marine-ltd' } })
})

describe('POST /vendor/sellers/tese — resolving this tenant’s store', () => {
  it('returning user: membership resolves the store even though the handle is a name slug', async () => {
    lookupMock.mockResolvedValue(usableLookup)
    const { req, res, eventBus, sellerService } = makeReq({
      appMetadata: { seller_id: 'mem_1' },
      members: [{ id: 'mem_1', seller_id: 'sel_MINE', email: 'al@acmemarine.mu' }],
      allSellers: [
        { id: 'sel_MINE', name: 'Acme Marine Ltd', handle: 'acme-marine-ltd', metadata: null },
      ],
    })

    await POST(req as never, res as never)

    expect(createRun).not.toHaveBeenCalled()
    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    // healed so the next login resolves on the canonical key
    expect(sellerService.updateSellers).toHaveBeenCalledWith({
      id: 'sel_MINE',
      metadata: { tese_tenant_id: 'TENANT1' },
    })
  })

  it('second employee of the tenant: found by metadata, attached as a member', async () => {
    lookupMock.mockResolvedValue(usableLookup)
    const { req, res, eventBus } = makeReq({
      allSellers: [
        { id: 'sel_OTHER', name: 'Someone else', handle: 'someone-else', metadata: null },
        {
          id: 'sel_MINE',
          name: 'Acme Marine Ltd',
          handle: 'acme-marine-ltd',
          metadata: { tese_tenant_id: 'TENANT1' },
        },
      ],
    })

    await POST(req as never, res as never)

    expect(createRun).not.toHaveBeenCalled()
    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(attachRun).toHaveBeenCalledTimes(1)
    expect(attachRun.mock.calls[0][0].input.member.seller_id).toBe('sel_MINE')
    expect(res.statusCode).toBe(201)
  })

  it('tenant switch: a membership bound to another tenant is not adopted', async () => {
    lookupMock.mockResolvedValue({ ...usableLookup, domain_usable: false })
    const { req, res, sellerService } = makeReq({
      appMetadata: { seller_id: 'mem_1' },
      members: [{ id: 'mem_1', seller_id: 'sel_OTHERTENANT' }],
      allSellers: [
        { id: 'sel_OTHERTENANT', name: 'Other', handle: 'other', metadata: { tese_tenant_id: 'TENANT2' } },
      ],
    })

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(201)
    expect(createRun).toHaveBeenCalledTimes(1)
    expect(sellerService.updateSellers).not.toHaveBeenCalled()
  })

  it('legacy tenant-keyed handle still resolves', async () => {
    lookupMock.mockResolvedValue(usableLookup)
    const { req, res } = makeReq({
      sellers: [{ id: 'sel_LEGACY', name: 'Acme', handle: 'tese-TENANT1' }],
    })

    await POST(req as never, res as never)

    expect(createRun).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(201)
    expect(attachRun).toHaveBeenCalledTimes(1)
  })
})

describe('POST /vendor/sellers/tese — claim-or-create', () => {
  it('orphan seller for the same domain → 202 claim_pending, no store created', async () => {
    lookupMock.mockResolvedValue(usableLookup)
    const { req, res, eventBus } = makeReq({
      sellers: [],
      allSellers: [
        { id: 'sel_ORPHAN', name: 'Acme', handle: 'acme', email: 'x@acmemarine.mu' },
      ],
    })

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(202)
    expect((res.body as { claim_pending: boolean }).claim_pending).toBe(true)
    expect(createRun).not.toHaveBeenCalled()
    expect(eventBus.emit).toHaveBeenCalledTimes(1)
    const emitted = eventBus.emit.mock.calls[0][0]
    expect(emitted.name).toBe('requests.seller.to_create')
    expect(emitted.data.data.claim_target_seller_id).toBe('sel_ORPHAN')
    expect(emitted.data.data.tese_tenant_id).toBe('TENANT1')
  })

  it('a store already bound to another tese tenant is never proposed as a claim target', async () => {
    lookupMock.mockResolvedValue(usableLookup)
    const { req, res, eventBus } = makeReq({
      sellers: [],
      allSellers: [
        {
          id: 'sel_THEIRS',
          name: 'Acme',
          handle: 'acme',
          email: 'x@acmemarine.mu',
          metadata: { tese_tenant_id: 'TENANT2' },
        },
      ],
    })

    await POST(req as never, res as never)

    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(201)
    expect(createRun).toHaveBeenCalledTimes(1)
  })

  it('re-login while claim pending → same 202, no duplicate request', async () => {
    lookupMock.mockResolvedValue(usableLookup)
    const { req, res, eventBus } = makeReq({
      sellers: [],
      allSellers: [
        { id: 'sel_ORPHAN', name: 'Acme', handle: 'acme', email: 'x@acmemarine.mu' },
      ],
      requests: [{ id: 'req_EXISTING', status: 'pending' }],
    })

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(202)
    expect((res.body as { request_id: string }).request_id).toBe('req_EXISTING')
    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(createRun).not.toHaveBeenCalled()
  })

  it('no orphan, candidate present → creates with real discovered prefill', async () => {
    lookupMock.mockResolvedValue({
      ...usableLookup,
      candidate: {
        domain: 'acmemarine.mu',
        name: 'Acme Marine',
        country: 'MU',
        website_url: 'https://acmemarine.mu',
        logo_url: 'https://cdn/logo.png',
      },
    })
    const { req, res } = makeReq({ sellers: [], allSellers: [] })

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(201)
    expect(createRun).toHaveBeenCalledTimes(1)
    const seller = createRun.mock.calls[0][0].input.seller
    // The handle is NOT passed: createSellerStep derives it from the name.
    // The tenant link lives in metadata, which is what the lookup reads.
    expect(seller.handle).toBeUndefined()
    expect(seller.metadata).toEqual({ tese_tenant_id: 'TENANT1' })
    expect(seller.photo).toBe('https://cdn/logo.png')
    expect(seller.website).toBe('https://acmemarine.mu')
    expect(seller.country_code).toBe('MU')
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        via: 'seller_create',
        teseTenantId: 'TENANT1',
        sellerHandle: 'acme-marine-ltd',
      })
    )
  })

  it('lookup unavailable → fails OPEN and creates as today', async () => {
    lookupMock.mockRejectedValue(new Error('tese-backend down'))
    const { req, res } = makeReq({ sellers: [], allSellers: [] })

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(201)
    expect(createRun).toHaveBeenCalledTimes(1)
    const seller = createRun.mock.calls[0][0].input.seller
    expect(seller.photo).toBeUndefined()
  })
})
