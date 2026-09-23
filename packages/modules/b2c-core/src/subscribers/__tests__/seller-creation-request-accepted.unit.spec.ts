/**
 * B-01 per-path duplicate test — vendor-panel entry path.
 *
 * The accepted-subscriber is the single claim-vs-create decision point:
 * a request carrying claim_target_seller_id must NEVER create a second
 * seller store, and one without it must create exactly as before.
 */

jest.mock('../../workflows', () => ({
  attachTeseSellerMemberWorkflow: { run: jest.fn() },
  createSellerWorkflow: { run: jest.fn() },
  linkTeseSellerWorkflow: { run: jest.fn() },
}))
jest.mock('../../utils/tese-vendor-claims', () => ({
  notifySellerLinked: jest.fn().mockResolvedValue({ ok: true }),
}))

import {
  attachTeseSellerMemberWorkflow,
  createSellerWorkflow,
  linkTeseSellerWorkflow,
} from '../../workflows'
import { notifySellerLinked } from '../../utils/tese-vendor-claims'
import handler from '../seller-creation-request-accepted'

const attachRun = attachTeseSellerMemberWorkflow.run as jest.Mock
const createRun = createSellerWorkflow.run as jest.Mock
const linkRun = linkTeseSellerWorkflow.run as jest.Mock
const notify = notifySellerLinked as jest.Mock

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

function makeContainer(overrides: Record<string, unknown> = {}) {
  const sellerService = {
    retrieveSeller: jest.fn().mockResolvedValue({
      id: 'sel_TARGET',
      handle: 'acme-marine',
      metadata: {},
    }),
    listMembers: jest.fn().mockResolvedValue([]),
    updateSellers: jest.fn().mockResolvedValue({}),
    ...overrides,
  }
  return {
    sellerService,
    container: {
      resolve: (key: string) => {
        if (key === 'seller') return sellerService
        if (key === 'logger') return logger
        return logger
      },
    },
  }
}

function requestEvent(data: Record<string, unknown>) {
  return {
    event: { data: { id: 'req_1', data } },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  createRun.mockResolvedValue({ result: { id: 'sel_NEW', handle: 'new-store' } })
})

describe('seller-creation-request-accepted (claim-vs-create)', () => {
  it('claim: attaches to the existing seller and does NOT create a store', async () => {
    const { container } = makeContainer()
    await handler({
      ...requestEvent({
        claim_target_seller_id: 'sel_TARGET',
        member: { name: 'Al', email: 'al@acmemarine.mu' },
        auth_identity_id: 'auth_1',
        duplicate_signals: { domain: 'acmemarine.mu' },
      }),
      container,
    } as never)

    expect(createRun).not.toHaveBeenCalled()
    expect(attachRun).toHaveBeenCalledTimes(1)
    const input = attachRun.mock.calls[0][0].input
    expect(input.member.seller_id).toBe('sel_TARGET')
    expect(input.member.role).toBe('member')
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ via: 'seller_claim', sellerId: 'sel_TARGET' })
    )
  })

  it('claim with an existing exact-email member links instead of attaching', async () => {
    const { container, sellerService } = makeContainer()
    sellerService.listMembers.mockResolvedValue([{ id: 'mem_9' }])

    await handler({
      ...requestEvent({
        claim_target_seller_id: 'sel_TARGET',
        member: { name: 'Al', email: 'al@acmemarine.mu' },
        auth_identity_id: 'auth_1',
      }),
      container,
    } as never)

    expect(createRun).not.toHaveBeenCalled()
    expect(attachRun).not.toHaveBeenCalled()
    expect(linkRun).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { auth_identity_id: 'auth_1', member_id: 'mem_9' },
      })
    )
  })

  it('SSO-originated claim binds the tenant key onto the claimed store', async () => {
    const { container, sellerService } = makeContainer()
    await handler({
      ...requestEvent({
        claim_target_seller_id: 'sel_TARGET',
        tese_tenant_id: 'TENANT1',
        member: { name: 'Al', email: 'al@acmemarine.mu' },
        auth_identity_id: 'auth_1',
      }),
      container,
    } as never)

    expect(sellerService.updateSellers).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sel_TARGET',
        handle: 'tese-TENANT1',
        metadata: expect.objectContaining({
          tese_tenant_id: 'TENANT1',
          previous_handle: 'acme-marine',
        }),
      })
    )
  })

  it('no claim target: creates the store exactly as before', async () => {
    const { container } = makeContainer()
    await handler({
      ...requestEvent({
        seller: { name: 'Fresh Co', email: 'x@fresh.co' },
        member: { name: 'X', email: 'x@fresh.co' },
        auth_identity_id: 'auth_2',
      }),
      container,
    } as never)

    expect(createRun).toHaveBeenCalledTimes(1)
    expect(attachRun).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ via: 'seller_create', sellerId: 'sel_NEW' })
    )
  })

  it('a notify conflict is logged, never thrown', async () => {
    notify.mockResolvedValue({ ok: false, conflict: true, error: 'sel_OTHER' })
    const { container } = makeContainer()

    await expect(
      handler({
        ...requestEvent({
          seller: { name: 'Fresh Co' },
          member: { name: 'X', email: 'x@fresh.co' },
          auth_identity_id: 'auth_2',
        }),
        container,
      } as never)
    ).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('DIFFERENT seller')
    )
  })
})
