import { documentsOf, parseDocumentIndex } from '../certification-documents'

describe('certification-documents helpers', () => {
  it('prefers the documents array and drops junk entries', () => {
    expect(
      documentsOf({
        documents: [{ url: 'https://a/x.pdf', kind: 'file' }, null, 'nope', { url: 'https://b', kind: 'url' }],
        document_url: 'https://legacy'
      })
    ).toEqual([
      { url: 'https://a/x.pdf', kind: 'file' },
      { url: 'https://b', kind: 'url' }
    ])
  })

  it('falls back to the legacy single url, else empty', () => {
    expect(documentsOf({ documents: [], document_url: 'https://legacy' })).toEqual([
      { url: 'https://legacy', kind: 'url' }
    ])
    expect(documentsOf({ documents: null, document_url: null })).toEqual([])
  })

  it('parses the index defensively', () => {
    expect(parseDocumentIndex(undefined)).toBe(0)
    expect(parseDocumentIndex('2')).toBe(2)
    expect(parseDocumentIndex('-3')).toBe(0)
    expect(parseDocumentIndex('abc')).toBe(0)
    expect(parseDocumentIndex(['1'])).toBe(1)
  })
})
