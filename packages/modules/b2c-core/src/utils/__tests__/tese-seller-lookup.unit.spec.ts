import {
  canAdoptMembershipStore,
  findSellerByTenantMetadata,
  memberIdFromAuthIdentity,
  tenantIdOf
} from '../tese-seller-lookup'

describe('tenantIdOf', () => {
  it('prefers the metadata marker, falls back to a tenant-keyed handle', () => {
    expect(tenantIdOf({ id: 'a', metadata: { tese_tenant_id: 'T1' } })).toBe('T1')
    expect(tenantIdOf({ id: 'a', handle: 'tese-T2' })).toBe('T2')
    expect(tenantIdOf({ id: 'a', handle: 'tese-T2', metadata: { tese_tenant_id: 'T1' } })).toBe('T1')
  })

  it('is null for a plain name-slug store', () => {
    expect(tenantIdOf({ id: 'a', handle: 'lagoon-reef-supplies', metadata: null })).toBeNull()
    expect(tenantIdOf({ id: 'a', handle: 'tese-' })).toBeNull()
    expect(tenantIdOf({ id: 'a', metadata: { tese_tenant_id: '  ' } })).toBeNull()
    expect(tenantIdOf(null)).toBeNull()
  })
})

describe('memberIdFromAuthIdentity', () => {
  it('reads app_metadata.seller_id, which holds a MEMBER id', () => {
    expect(memberIdFromAuthIdentity({ app_metadata: { seller_id: 'mem_1' } })).toBe('mem_1')
    expect(memberIdFromAuthIdentity({ app_metadata: {} })).toBeNull()
    expect(memberIdFromAuthIdentity({})).toBeNull()
    expect(memberIdFromAuthIdentity(null)).toBeNull()
  })
})

describe('findSellerByTenantMetadata', () => {
  const sellers = [
    { id: 'a', handle: 'lagoon-reef-supplies', metadata: null },
    { id: 'b', handle: 'other-store', metadata: { tese_tenant_id: 'T1' } },
    { id: 'c', handle: 'tese-T2' }
  ]

  it('finds by marker or legacy handle, and never matches an unbound store', () => {
    expect(findSellerByTenantMetadata(sellers, 'T1')?.id).toBe('b')
    expect(findSellerByTenantMetadata(sellers, 'T2')?.id).toBe('c')
    expect(findSellerByTenantMetadata(sellers, 'T9')).toBeNull()
    expect(findSellerByTenantMetadata(sellers, '')).toBeNull()
    expect(findSellerByTenantMetadata([], 'T1')).toBeNull()
  })
})

describe('canAdoptMembershipStore', () => {
  it('adopts an unmarked (legacy) store and a store already on this tenant', () => {
    expect(canAdoptMembershipStore({ id: 'a', handle: 'lagoon-coastal-supplies' }, 'T1')).toBe(true)
    expect(canAdoptMembershipStore({ id: 'a', metadata: { tese_tenant_id: 'T1' } }, 'T1')).toBe(true)
  })

  it('refuses a store bound to a different tenant (context switch)', () => {
    expect(canAdoptMembershipStore({ id: 'a', metadata: { tese_tenant_id: 'T2' } }, 'T1')).toBe(false)
    expect(canAdoptMembershipStore({ id: 'a', handle: 'tese-T2' }, 'T1')).toBe(false)
    expect(canAdoptMembershipStore(null, 'T1')).toBe(false)
  })
})
