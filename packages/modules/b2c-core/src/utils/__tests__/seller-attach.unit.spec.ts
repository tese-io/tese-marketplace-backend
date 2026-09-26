import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { SELLER_MODULE } from '../../modules/seller'
import { SELLER_VERIFICATIONS_MODULE } from '../../modules/seller-verifications'
import { attachSellerAndArchiveShell } from '../seller-attach'

const makeScope = (overrides: Partial<Record<string, jest.Mock>> = {}) => {
  const sellerService = {
    listSellers: jest.fn(async ({ id }: { id: string }) =>
      id === 'sel_target' ? [{ id: 'sel_target', metadata: { foo: 1 } }] : []
    ),
    listMembers: jest.fn(async () => [{ id: 'mem_a' }, { id: 'mem_b' }]),
    updateMembers: jest.fn(async () => undefined),
    softDeleteSellers: jest.fn(async () => undefined),
    updateSellers: jest.fn(async () => undefined),
    ...overrides
  }
  const remoteLink = { dismiss: jest.fn(async () => undefined), create: jest.fn(async () => undefined) }
  const scope = {
    resolve: (key: string) => {
      if (key === SELLER_MODULE) return sellerService
      if (key === ContainerRegistrationKeys.REMOTE_LINK) return remoteLink
      throw new Error(`unexpected resolve ${key}`)
    }
  }
  return { scope, sellerService, remoteLink }
}

const input = {
  sourceSellerId: 'sel_shell',
  targetSellerId: 'sel_target',
  verificationId: 'sverif_1',
  reviewer: 'user_admin'
}

describe('attachSellerAndArchiveShell (B-26)', () => {
  it('moves members as MEMBER, archives the shell after, stamps the target, returns a record', async () => {
    const { scope, sellerService, remoteLink } = makeScope()
    const order: string[] = []
    sellerService.updateMembers.mockImplementation(async () => { order.push('move') })
    sellerService.softDeleteSellers.mockImplementation(async () => { order.push('archive') })

    const record = await attachSellerAndArchiveShell(scope, input)

    expect(sellerService.updateMembers).toHaveBeenCalledTimes(2)
    expect(sellerService.updateMembers).toHaveBeenCalledWith({
      id: 'mem_a', seller_id: 'sel_target', role: 'member'
    })
    expect(order).toEqual(['move', 'move', 'archive'])
    expect(sellerService.softDeleteSellers).toHaveBeenCalledWith(['sel_shell'])
    expect(sellerService.updateSellers).toHaveBeenCalledWith({
      id: 'sel_target',
      metadata: { foo: 1, merged_from_seller_ids: ['sel_shell'] }
    })
    expect(remoteLink.dismiss).toHaveBeenCalledWith({
      [SELLER_MODULE]: { seller_id: 'sel_shell' },
      [SELLER_VERIFICATIONS_MODULE]: { seller_verification_id: 'sverif_1' }
    })
    expect(remoteLink.create).toHaveBeenCalledWith({
      [SELLER_MODULE]: { seller_id: 'sel_target' },
      [SELLER_VERIFICATIONS_MODULE]: { seller_verification_id: 'sverif_1' }
    })
    expect(record).toMatchObject({
      source_seller_id: 'sel_shell',
      target_seller_id: 'sel_target',
      moved_member_ids: ['mem_a', 'mem_b'],
      reviewer: 'user_admin'
    })
    expect(new Date(record.at).getTime()).toBeGreaterThan(0)
  })

  it('refuses self-attach and unknown targets before touching anything', async () => {
    const { scope, sellerService } = makeScope()
    await expect(
      attachSellerAndArchiveShell(scope, { ...input, targetSellerId: 'sel_shell' })
    ).rejects.toThrow(/itself/)
    await expect(
      attachSellerAndArchiveShell(scope, { ...input, targetSellerId: 'sel_nope' })
    ).rejects.toThrow(/does not exist/)
    expect(sellerService.updateMembers).not.toHaveBeenCalled()
    expect(sellerService.softDeleteSellers).not.toHaveBeenCalled()
  })

  it('does not duplicate merged_from ids and survives link failures', async () => {
    const { scope, sellerService, remoteLink } = makeScope({
      listSellers: jest.fn(async () => [
        { id: 'sel_target', metadata: { merged_from_seller_ids: ['sel_shell'] } }
      ]),
      listMembers: jest.fn(async () => [])
    })
    remoteLink.dismiss.mockRejectedValue(new Error('no link'))
    remoteLink.create.mockRejectedValue(new Error('no link'))

    const record = await attachSellerAndArchiveShell(scope, input)

    expect(sellerService.updateSellers).toHaveBeenCalledWith({
      id: 'sel_target',
      metadata: { merged_from_seller_ids: ['sel_shell'] }
    })
    expect(record.moved_member_ids).toEqual([])
  })
})
