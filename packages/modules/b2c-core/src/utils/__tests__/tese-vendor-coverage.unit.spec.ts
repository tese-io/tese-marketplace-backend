import {
  enrichCoverageRowsWithActivities,
  type ActivityHit,
  type CoverageRow,
} from '../tese-vendor-coverage'

const row = (code: string): CoverageRow => ({
  subject: { kind: 'seller', id: 'sel_1' },
  activity_code: code,
  coverage_kind: 'DIRECT',
  source: 'self_declared',
  confidence: 1,
  is_active: true,
})

describe('enrichCoverageRowsWithActivities', () => {
  const hits: ActivityHit[] = [
    {
      code: 'TOU-ADAC-01.01',
      name: 'Rainwater harvesting system',
      description: 'Capture and store rooftop runoff',
      industry_vertical: 'TOU',
      domain: 'CLIMATE',
    },
  ]

  it('attaches name, description and category to matching rows', () => {
    const out = enrichCoverageRowsWithActivities([row('TOU-ADAC-01.01')], hits)
    expect(out[0].activity_name).toBe('Rainwater harvesting system')
    expect(out[0].activity_description).toBe('Capture and store rooftop runoff')
    expect(out[0].industry_vertical).toBe('TOU')
    expect(out[0].domain).toBe('CLIMATE')
  })

  it('passes rows without a catalog hit through unchanged (code fallback)', () => {
    const out = enrichCoverageRowsWithActivities([row('GONE-99')], hits)
    expect(out[0].activity_code).toBe('GONE-99')
    expect((out[0] as Record<string, unknown>).activity_name).toBeUndefined()
  })

  it('never drops or reorders rows', () => {
    const out = enrichCoverageRowsWithActivities(
      [row('GONE-99'), row('TOU-ADAC-01.01')],
      hits
    )
    expect(out.map((r) => r.activity_code)).toEqual(['GONE-99', 'TOU-ADAC-01.01'])
  })

  it('normalizes empty hit fields to null, not empty strings', () => {
    const sparse: ActivityHit[] = [{ code: 'X-1', name: '', description: '' }]
    const out = enrichCoverageRowsWithActivities([row('X-1')], sparse)
    expect(out[0].activity_name).toBeNull()
    expect(out[0].activity_description).toBeNull()
  })
})
