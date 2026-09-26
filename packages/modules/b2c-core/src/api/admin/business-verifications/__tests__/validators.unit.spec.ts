import { AdminReviewBusinessVerification } from '../validators'

const parse = (body: Record<string, unknown>) =>
  AdminReviewBusinessVerification.safeParse(body)

const paths = (r: ReturnType<typeof parse>) =>
  r.success ? [] : r.error.issues.map((i) => i.path.join('.'))

describe('AdminReviewBusinessVerification', () => {
  it('approve needs a verification method; reject needs a written note', () => {
    expect(paths(parse({ decision: 'approve' }))).toEqual(['verification_method'])
    expect(paths(parse({ decision: 'reject', reviewer_note: '  ' }))).toEqual(['reviewer_note'])
    expect(parse({ decision: 'approve', verification_method: 'document_only' }).success).toBe(true)
    expect(parse({ decision: 'reject', reviewer_note: 'Expired licence' }).success).toBe(true)
  })

  it('attach_to_seller_id is approve-only and trimmed (B-26)', () => {
    const ok = parse({
      decision: 'approve',
      verification_method: 'registry_checked',
      attach_to_seller_id: '  sel_existing  '
    })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.attach_to_seller_id).toBe('sel_existing')

    expect(
      paths(parse({ decision: 'reject', reviewer_note: 'dup', attach_to_seller_id: 'sel_x' }))
    ).toEqual(['attach_to_seller_id'])
    expect(
      paths(parse({ decision: 'approve', verification_method: 'document_only', attach_to_seller_id: '' }))
    ).toEqual(['attach_to_seller_id'])
    expect(
      parse({ decision: 'approve', verification_method: 'document_only', attach_to_seller_id: null }).success
    ).toBe(true)
  })
})
