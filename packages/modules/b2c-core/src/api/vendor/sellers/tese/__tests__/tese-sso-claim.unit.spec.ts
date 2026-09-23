/**
 * B-01 per-path duplicate test — tese.io-first SSO entry path.
 *
 * When a domain-matching orphan seller exists, the SSO store-provision
 * route must NOT create a second store: it emits a human-confirmed claim
 * request and answers 202 claim_pending. When the duplicate lookup is
 * unavailable it fails OPEN (store creation proceeds).
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

function makeReq(opts: {
  sellers?: unknown[]
  allSellers?: unknown[]
  requests?: unknown[]
}) {
  const sellerService = {
    listSellers: jest.fn(async (filters: Record<string, unknown>) => {
      if (filters && 'handle' in filters) return opts.sellers ?? []
      return opts.allSellers ?? []
    }),
    listMembers: jest.fn(async () => []),
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
  const req = {
    auth_context: { auth_identity_id: 'auth_1' },
    scope: {
      resolve: (key: string) => {
        if (key === 'seller') return sellerService
        if (key === 'auth') return authModule
        if (key === 'query') return query
        if (key === 'event_bus') return eventBus
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
  return { req, res, eventBus, sellerService }
}

beforeEach(() => {
  jest.clearAllMocks()
  createRun.mockResolvedValue({ result: { id: 'sel_NEW' } })
})

describe('POST /vendor/sellers/tese — claim-or-create', () => {
  it('orphan seller for the same domain → 202 claim_pending, no store created', async () => {
    lookupMock.mockResolvedValue({
      domain: 'acmemarine.mu',
      domain_usable: true,
      reason: null,
      candidate: null,
      tenants: [],
    })
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

  it('re-login while claim pending → same 202, no duplicate request', async () => {
    lookupMock.mockResolvedValue({
      domain: 'acmemarine.mu',
      domain_usable: true,
      reason: null,
      candidate: null,
      tenants: [],
    })
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
      domain: 'acmemarine.mu',
      domain_usable: true,
      reason: null,
      candidate: {
        domain: 'acmemarine.mu',
        name: 'Acme Marine',
        country: 'MU',
        website_url: 'https://acmemarine.mu',
        logo_url: 'https://cdn/logo.png',
      },
      tenants: [],
    })
    const { req, res } = makeReq({ sellers: [], allSellers: [] })

    await POST(req as never, res as never)

    expect(res.statusCode).toBe(201)
    expect(createRun).toHaveBeenCalledTimes(1)
    const seller = createRun.mock.calls[0][0].input.seller
    expect(seller.handle).toBe('tese-TENANT1')
    expect(seller.photo).toBe('https://cdn/logo.png')
    expect(seller.website).toBe('https://acmemarine.mu')
    expect(seller.country_code).toBe('MU')
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ via: 'seller_create', teseTenantId: 'TENANT1' })
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
