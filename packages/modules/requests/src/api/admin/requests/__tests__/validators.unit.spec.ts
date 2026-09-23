import { AdminReviewRequest } from '../validators'

describe('AdminReviewRequest — claim_seller_id (B-01)', () => {
  it('accepts an accept-with-claim body', () => {
    const out = AdminReviewRequest.safeParse({
      status: 'accepted',
      reviewer_note: 'claiming into existing store',
      claim_seller_id: 'sel_123',
    })
    expect(out.success).toBe(true)
  })

  it('claim_seller_id stays optional — plain review bodies unchanged', () => {
    expect(
      AdminReviewRequest.safeParse({ status: 'accepted', reviewer_note: '' })
        .success
    ).toBe(true)
    expect(
      AdminReviewRequest.safeParse({ status: 'rejected', reviewer_note: 'no' })
        .success
    ).toBe(true)
  })

  it('rejects a non-string claim_seller_id', () => {
    const out = AdminReviewRequest.safeParse({
      status: 'accepted',
      reviewer_note: '',
      claim_seller_id: 42,
    })
    expect(out.success).toBe(false)
  })
})
