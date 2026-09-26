import {
  currentSellerActor,
  planSellerActor,
  revertSellerActor,
} from '../seller-actor-metadata'

describe('currentSellerActor', () => {
  it('reads the member id, treating blanks as absent', () => {
    expect(currentSellerActor({ seller_id: 'mem_1' })).toBe('mem_1')
    expect(currentSellerActor({ seller_id: '  ' })).toBeNull()
    expect(currentSellerActor({})).toBeNull()
    expect(currentSellerActor(null)).toBeNull()
  })
})

describe('planSellerActor', () => {
  it('is a no-op when the identity already points at this member (re-login)', () => {
    expect(planSellerActor({ seller_id: 'mem_1' }, 'mem_1')).toEqual({
      changed: false,
      oldValue: 'mem_1',
    })
  })

  it('overwrites a different member (tenant switch) and keeps other keys', () => {
    expect(
      planSellerActor({ seller_id: 'mem_OLD', user_id: 'usr_1' }, 'mem_NEW')
    ).toEqual({
      changed: true,
      appMetadata: { seller_id: 'mem_NEW', user_id: 'usr_1' },
      oldValue: 'mem_OLD',
    })
  })

  it('sets a first value and never mutates the input', () => {
    const input = { user_id: 'usr_1' }
    expect(planSellerActor(input, 'mem_1')).toEqual({
      changed: true,
      appMetadata: { user_id: 'usr_1', seller_id: 'mem_1' },
      oldValue: null,
    })
    expect(input).toEqual({ user_id: 'usr_1' })
    expect(planSellerActor(null, 'mem_1').appMetadata).toEqual({ seller_id: 'mem_1' })
  })
})

describe('revertSellerActor', () => {
  it('restores a previous value and removes a key that was not there before', () => {
    expect(revertSellerActor({ seller_id: 'mem_NEW', user_id: 'u' }, 'mem_OLD')).toEqual({
      seller_id: 'mem_OLD',
      user_id: 'u',
    })
    expect(revertSellerActor({ seller_id: 'mem_NEW', user_id: 'u' }, null)).toEqual({
      user_id: 'u',
    })
  })
})
