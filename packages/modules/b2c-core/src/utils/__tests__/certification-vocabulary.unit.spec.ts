import { deriveCertificationVocabulary } from '../certification-vocabulary'

const catalogue = [
  { name: 'ISO 14001', aliases: ['iso14001'] },
  { name: 'Green Key', aliases: ['Green Key Eco-Label'] },
  { name: 'MSC Certified', aliases: ['Marine Stewardship Council', 'MSC Chain of Custody'] },
  { name: 'Blue Flag', aliases: [] },
]

describe('deriveCertificationVocabulary (B-22)', () => {
  it('vocabulary = catalogue names, sorted, deduped', () => {
    const { vocabulary } = deriveCertificationVocabulary(catalogue)
    expect(vocabulary).toEqual([
      'Blue Flag',
      'Green Key',
      'ISO 14001',
      'MSC Certified',
    ])
  })

  it('maps aliases and names (case-insensitive) to the canonical name', () => {
    const { aliasToCanonical } = deriveCertificationVocabulary(catalogue)
    expect(aliasToCanonical['iso14001']).toBe('ISO 14001')
    expect(aliasToCanonical['green key eco-label']).toBe('Green Key')
    expect(aliasToCanonical['marine stewardship council']).toBe('MSC Certified')
    expect(aliasToCanonical['blue flag']).toBe('Blue Flag')
  })

  it('folds free-text extras into canonical names when an alias matches', () => {
    const { vocabulary } = deriveCertificationVocabulary(catalogue, [
      'iso14001',       // alias → canonical, no new entry
      'Rainforest Alliance', // unknown → kept verbatim
      '  ',             // junk → dropped
    ])
    expect(vocabulary).toContain('ISO 14001')
    expect(vocabulary).toContain('Rainforest Alliance')
    expect(vocabulary).not.toContain('iso14001')
  })

  it('first catalogue entry keeps a contested alias', () => {
    const { aliasToCanonical } = deriveCertificationVocabulary([
      { name: 'A Cert', aliases: ['shared'] },
      { name: 'B Cert', aliases: ['shared'] },
    ])
    expect(aliasToCanonical['shared']).toBe('A Cert')
  })

  it('tolerates empty/malformed input', () => {
    expect(deriveCertificationVocabulary([]).vocabulary).toEqual([])
    expect(
      deriveCertificationVocabulary([{ name: '', aliases: null }]).vocabulary
    ).toEqual([])
  })
})
