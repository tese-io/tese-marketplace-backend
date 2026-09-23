import {
  collectImportRows,
  toImportReport,
} from '../product-import-validation'

const validRow = (title: string, amount = 250) => ({
  title,
  variants: [
    {
      title: 'Default',
      prices: [{ amount, currency_code: 'usd' }],
      options: { Default: 'Default' },
    },
  ],
  options: [{ title: 'Default', values: ['Default'] }],
})

describe('collectImportRows (B-11 validation report)', () => {
  it('valid rows come back forced to proposed (D-01 review state)', () => {
    const { toCreate, errors } = collectImportRows([
      validRow('Reef Blocks'),
      validRow('Dune Grass Mats'),
    ])
    expect(errors).toEqual([])
    expect(toCreate).toHaveLength(2)
    expect(toCreate.every((p) => p.status === 'proposed')).toBe(true)
  })

  it('an uploaded status column cannot smuggle a product to published', () => {
    const { toCreate } = collectImportRows([
      { ...validRow('Sneaky'), status: 'published' },
    ])
    expect(toCreate[0].status).toBe('proposed')
  })

  it('names the row AND the field on a schema failure', () => {
    const { toCreate, errors } = collectImportRows([
      validRow('Good one'),
      { variants: [] }, // no title
    ])
    expect(toCreate).toHaveLength(1)
    expect(errors.length).toBeGreaterThan(0)
    const titleError = errors.find((e) => e.field === 'title')
    expect(titleError?.row).toBe(2)
  })

  it('rejects unpriced rows with a row+field error (D-04 coherence)', () => {
    const { toCreate, errors } = collectImportRows([
      validRow('Priced'),
      validRow('Zero priced', 0),
      { ...validRow('No variants'), variants: [] },
    ])
    expect(toCreate.map((p) => p.title)).toEqual(['Priced'])
    expect(errors).toEqual([
      expect.objectContaining({ row: 2, field: 'variants.prices' }),
      expect.objectContaining({ row: 3, field: 'variants.prices' }),
    ])
  })

  it('collects errors across many rows instead of stopping at the first', () => {
    const { errors } = collectImportRows([
      { variants: [] },
      { variants: [] },
      validRow('OK'),
    ])
    const rows = new Set(errors.map((e) => e.row))
    expect(rows.has(1)).toBe(true)
    expect(rows.has(2)).toBe(true)
    expect(rows.has(3)).toBe(false)
  })
})

describe('toImportReport', () => {
  it('caps transported errors and flags truncation', () => {
    const errors = Array.from({ length: 60 }, (_, i) => ({
      row: i + 1,
      field: 'title',
      message: 'Required',
    }))
    const report = toImportReport({ toCreate: [], errors }, 50)
    expect(report.error_count).toBe(60)
    expect(report.errors).toHaveLength(50)
    expect(report.truncated).toBe(true)
    expect(report.valid_count).toBe(0)
  })
})
