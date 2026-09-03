import {
  UploadRejectedError,
  allowedExtensions,
  allowedMimeTypes,
  assertBytesMatchExtension,
  assertUploadAllowed,
  extensionOf,
  maxUploadBytes,
  maxUploadFiles,
  normaliseMimeType,
  sanitiseFileName,
  visibilityForUpload,
  prefixForVisibility
} from '../upload-policy'

/** Byte fixtures that are genuinely valid headers for each allowed type. */
const bytes = {
  png: () =>
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(16)
    ]),
  jpg: () =>
    Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]),
  gif: () => Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(16)]),
  webp: () =>
    Buffer.concat([
      Buffer.from('RIFF', 'latin1'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP', 'latin1'),
      Buffer.alloc(16)
    ]),
  heic: () =>
    Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x18]),
      Buffer.from('ftyp', 'latin1'),
      Buffer.from('heic', 'latin1'),
      Buffer.alloc(16)
    ]),
  pdf: () => Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'latin1'),
  doc: () =>
    Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(16)
    ]),
  docx: () =>
    Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16)]),
  svg: () =>
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>')
}

/** The payload actually found in the shared bucket, in spirit. */
const PHP_WEBSHELL = Buffer.from(
  "<?php\nset_time_limit(0);\n$sock = fsockopen($ip, $port);\n// php-reverse-shell\n"
)

/** Assert the candidate is refused, and hand back the error to inspect. */
const reject = (
  candidate: Parameters<typeof assertUploadAllowed>[0]
): UploadRejectedError => {
  try {
    assertUploadAllowed(candidate)
  } catch (error) {
    if (error instanceof UploadRejectedError) return error
    throw error
  }
  throw new Error('expected the upload to be rejected, but it was accepted')
}

describe('vendor upload policy', () => {
  describe('the webshell this exists to stop', () => {
    it('refuses a .php file even when honestly labelled', () => {
      const error = reject({
        filename: 'php-reverse-shell.php',
        mimeType: 'application/x-httpd-php',
        buffer: PHP_WEBSHELL
      })
      expect(error.message).toMatch(/\.php files cannot be uploaded/)
    })

    it('refuses it when renamed to an allowed extension', () => {
      // Name and declared type both look fine here; only the bytes give it
      // away, which is why the route re-checks after buffering.
      const error = reject({
        filename: 'logo.png',
        mimeType: 'image/png',
        buffer: PHP_WEBSHELL
      })
      expect(error.message).toMatch(/contents do not match/)
    })

    it('refuses a double extension, because the real one is still .php', () => {
      reject({
        filename: 'shell.png.php',
        mimeType: 'application/octet-stream',
        buffer: PHP_WEBSHELL
      })
    })

    it('refuses it when hidden behind a trailing allowed extension', () => {
      // shell.php.png parses as extension .png, so only the bytes catch it.
      reject({
        filename: 'shell.php.png',
        mimeType: 'image/png',
        buffer: PHP_WEBSHELL
      })
    })
  })

  describe('other executable types', () => {
    it.each([
      ['page.html', 'text/html'],
      ['x.htm', 'text/html'],
      ['x.js', 'application/javascript'],
      ['x.sh', 'application/x-sh'],
      ['x.exe', 'application/x-msdownload'],
      ['x.jar', 'application/java-archive'],
      ['x.phtml', 'application/x-httpd-php']
    ])('refuses %s', (filename, mimeType) => {
      reject({ filename, mimeType })
    })

    it('refuses a dotfile with no extension of its own', () => {
      reject({ filename: '.htaccess', mimeType: 'text/plain' })
    })
  })

  describe('everything the vendor panel offers is accepted', () => {
    it.each([
      ['product.jpg', 'image/jpeg', 'jpg', bytes.jpg],
      ['product.jpeg', 'image/jpeg', 'jpeg', bytes.jpg],
      ['logo.png', 'image/png', 'png', bytes.png],
      ['hero.webp', 'image/webp', 'webp', bytes.webp],
      ['anim.gif', 'image/gif', 'gif', bytes.gif],
      ['photo.heic', 'image/heic', 'heic', bytes.heic],
      ['mark.svg', 'image/svg+xml', 'svg', bytes.svg],
      ['cert.pdf', 'application/pdf', 'pdf', bytes.pdf],
      ['old.doc', 'application/msword', 'doc', bytes.doc],
      [
        'new.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'docx',
        bytes.docx
      ],
      ['products.csv', 'text/csv', 'csv', () => Buffer.from('sku,name\n1,Shoe\n')],
      ['products.csv', 'text/csv', 'csv', () => Buffer.from('sku,name\n1,Shoe\n')]
    ])('accepts %s', (filename, mimeType, extension, fixture: any) => {
      const approved = assertUploadAllowed({
        filename,
        mimeType,
        buffer: fixture()
      })
      expect(approved.extension).toBe(extension)
      expect(approved.filename.endsWith('.' + extension)).toBe(true)
    })

    it('leaves no allowed extension without a content check', () => {
      // A new entry in the allowlist that nothing verifies would become the
      // obvious extension to rename a payload to, so assert the invariant
      // rather than trusting whoever adds the next type.
      const unverified = allowedExtensions().filter((extension) => {
        try {
          assertBytesMatchExtension(PHP_WEBSHELL, extension)
          return true
        } catch {
          return false
        }
      })
      expect(unverified).toEqual([])
    })
  })

  describe('declared type versus extension', () => {
    it('refuses a mismatch', () => {
      const error = reject({
        filename: 'invoice.pdf',
        mimeType: 'image/png',
        buffer: bytes.pdf()
      })
      expect(error.message).toBe('A .pdf file cannot be uploaded as image/png.')
    })

    it('resolves the generic type to the canonical one', () => {
      const approved = assertUploadAllowed({
        filename: 'logo.png',
        mimeType: 'application/octet-stream',
        buffer: bytes.png()
      })
      expect(approved.mimeType).toBe('image/png')
    })

    it('normalises the stored type rather than echoing a variant', () => {
      const approved = assertUploadAllowed({
        filename: 'p.jpg',
        mimeType: 'image/pjpeg',
        buffer: bytes.jpg()
      })
      expect(approved.mimeType).toBe('image/jpeg')
    })

    it('ignores casing and parameters on both sides', () => {
      const approved = assertUploadAllowed({
        filename: 'LOGO.PNG',
        mimeType: 'IMAGE/PNG; charset=binary',
        buffer: bytes.png()
      })
      expect(approved.mimeType).toBe('image/png')
      expect(approved.extension).toBe('png')
    })

    it('derives the extension when the name has none', () => {
      const approved = assertUploadAllowed({
        filename: 'scan',
        mimeType: 'application/pdf',
        buffer: bytes.pdf()
      })
      expect(approved.filename).toBe('scan.pdf')
    })

    it('refuses a file with neither a usable name nor a known type', () => {
      reject({ filename: 'mystery', mimeType: '' })
    })

    it('refuses an unknown extension rather than trusting the declared type', () => {
      // .php with image/png would otherwise be stored as a png; the point
      // is that the rejected extension never survives into the key.
      const approved = assertUploadAllowed({
        filename: 'x.php',
        mimeType: 'image/png',
        buffer: bytes.png()
      })
      expect(approved.filename).toBe('x.png')
      expect(approved.extension).toBe('png')
    })
  })

  describe('SVG, the one allowed type that can execute', () => {
    it('accepts a plain vector image', () => {
      expect(
        assertUploadAllowed({
          filename: 'mark.svg',
          mimeType: 'image/svg+xml',
          buffer: bytes.svg()
        }).extension
      ).toBe('svg')
    })

    it('accepts one with an XML declaration ahead of the root element', () => {
      const buffer = Buffer.from(
        '<?xml version="1.0"?>\n<!-- generated -->\n<svg xmlns="http://www.w3.org/2000/svg"/>'
      )
      expect(
        assertUploadAllowed({
          filename: 'mark.svg',
          mimeType: 'image/svg+xml',
          buffer
        }).extension
      ).toBe('svg')
    })

    it.each([
      ['a script element', '<svg><script>fetch("/steal")</script></svg>'],
      ['a javascript: href', '<svg><a href="javascript:alert(1)"/></svg>'],
      ['embedded HTML', '<svg><foreignObject><body/></foreignObject></svg>']
    ])('refuses one carrying %s', (_label, markup) => {
      const error = reject({
        filename: 'x.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(markup)
      })
      expect(error.message).toMatch(/scripting/)
    })

    it('finds script content past the header window', () => {
      const padding = '<!-- ' + 'x'.repeat(8000) + ' -->'
      const buffer = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg">${padding}<script>x()</script></svg>`
      )
      expect(() =>
        assertUploadAllowed({
          filename: 'x.svg',
          mimeType: 'image/svg+xml',
          buffer
        })
      ).toThrow(UploadRejectedError)
    })

    it('refuses something that is not markup at all', () => {
      const error = reject({
        filename: 'x.svg',
        mimeType: 'image/svg+xml',
        buffer: PHP_WEBSHELL
      })
      expect(error.message).toMatch(/not an SVG/)
    })
  })

  describe('container formats identified by an offset marker', () => {
    it('refuses a RIFF file that is not WEBP', () => {
      const wav = Buffer.concat([
        Buffer.from('RIFF', 'latin1'),
        Buffer.from([0x24, 0x00, 0x00, 0x00]),
        Buffer.from('WAVE', 'latin1'),
        Buffer.alloc(16)
      ])
      reject({ filename: 'x.webp', mimeType: 'image/webp', buffer: wav })
    })

    it('refuses an ISO container whose brand is not a still image', () => {
      const mp4 = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from('ftyp', 'latin1'),
        Buffer.from('mp42', 'latin1'),
        Buffer.alloc(16)
      ])
      reject({ filename: 'x.heic', mimeType: 'image/heic', buffer: mp4 })
    })

    it('refuses a truncated header rather than passing it through', () => {
      reject({
        filename: 'x.webp',
        mimeType: 'image/webp',
        buffer: Buffer.from('RIFF', 'latin1')
      })
    })
  })

  describe('the filename that ends up in the object key', () => {
    it('drops any directory the client attached', () => {
      // The provider interpolates the name straight into the key, and
      // path.parse would silently discard the directory anyway.
      expect(
        assertUploadAllowed({
          filename: '../../../etc/passwd.png',
          mimeType: 'image/png',
          buffer: bytes.png()
        }).filename
      ).toBe('passwd.png')
    })

    it('drops a Windows-style directory too', () => {
      expect(sanitiseFileName('C:\\Users\\me\\logo.png')).toBe('logo')
    })

    it('replaces spaces and punctuation that do not belong in a URL', () => {
      expect(sanitiseFileName('My Product Photo (final)!.png')).toBe(
        'My-Product-Photo-final'
      )
    })

    it('strips control characters', () => {
      expect(sanitiseFileName('logo\u0000\u001f.png')).toBe('logo')
    })

    it('never returns an empty name', () => {
      // path.parse('') would give an empty name and the key would start
      // with the ULID separator, so fall back to something readable.
      expect(sanitiseFileName('***.png')).toBe('file')
      expect(sanitiseFileName('')).toBe('file')
      expect(
        assertUploadAllowed({
          filename: '###.png',
          mimeType: 'image/png',
          buffer: bytes.png()
        }).filename
      ).toBe('file.png')
    })

    it('treats a dotfile as all stem and no extension', () => {
      // '.png' is a file *named* .png, not an extension, so the type comes
      // from the MIME header and the name survives as the stem.
      expect(
        assertUploadAllowed({
          filename: '.png',
          mimeType: 'image/png',
          buffer: bytes.png()
        }).filename
      ).toBe('png.png')
    })

    it('caps the length so keys stay manageable', () => {
      const long = 'a'.repeat(500) + '.png'
      expect(sanitiseFileName(long).length).toBe(100)
    })

    it('keeps the extension out of the sanitised stem', () => {
      expect(sanitiseFileName('report.final.pdf')).toBe('report.final')
    })
  })

  describe('bytes are optional, because the filter runs before buffering', () => {
    it('validates on name and type alone when there is no buffer', () => {
      expect(
        assertUploadAllowed({ filename: 'logo.png', mimeType: 'image/png' })
          .extension
      ).toBe('png')
    })

    it('still refuses a disallowed type with no buffer', () => {
      reject({ filename: 'x.php', mimeType: 'application/x-httpd-php' })
    })

    it('treats an empty buffer as absent rather than as a mismatch', () => {
      expect(
        assertUploadAllowed({
          filename: 'logo.png',
          mimeType: 'image/png',
          buffer: Buffer.alloc(0)
        }).extension
      ).toBe('png')
    })
  })

  describe('helpers', () => {
    it('reads the extension without the dot, lowercased', () => {
      expect(extensionOf('A.PNG')).toBe('png')
      expect(extensionOf('no-extension')).toBe('')
      expect(extensionOf('trailing.')).toBe('')
      expect(extensionOf('.hidden')).toBe('')
    })

    it('strips MIME parameters', () => {
      expect(normaliseMimeType(' IMAGE/PNG ; charset=utf-8')).toBe('image/png')
      expect(normaliseMimeType(null)).toBe('')
    })

    it('lists the allowed types for use in accept headers', () => {
      expect(allowedMimeTypes()).toContain('image/svg+xml')
      expect(allowedMimeTypes()).not.toContain('text/html')
      expect(allowedExtensions()).not.toContain('php')
    })
  })

  describe('public shop media vs private documents', () => {
    it('sends product images to the public prefix', () => {
      ;['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'heic', 'heif'].forEach(
        (extension) => {
          expect(visibilityForUpload({ extension })).toBe('public')
        }
      )
      expect(prefixForVisibility('public')).toBe('marketplace/uploads/public/')
    })

    it('sends receipts and cert proofs to the private prefix', () => {
      expect(visibilityForUpload({ extension: 'pdf' })).toBe('private')
      expect(visibilityForUpload({ extension: 'docx' })).toBe('private')
      expect(prefixForVisibility('private')).toBe('marketplace/uploads/private/')
    })

    it('lets an explicit purpose override the extension', () => {
      expect(visibilityForUpload({ extension: 'png', purpose: 'private' })).toBe(
        'private'
      )
      expect(visibilityForUpload({ extension: 'pdf', purpose: 'public' })).toBe(
        'public'
      )
    })

    it('fails closed to private for anything it does not recognise', () => {
      expect(visibilityForUpload({ extension: 'bin' })).toBe('private')
      expect(visibilityForUpload({})).toBe('private')
    })
  })

  describe('limits', () => {
    const original = { ...process.env }
    afterEach(() => {
      process.env = { ...original }
    })

    it('defaults to bounded values', () => {
      delete process.env.MARKETPLACE_UPLOAD_MAX_BYTES
      delete process.env.MARKETPLACE_UPLOAD_MAX_FILES
      expect(maxUploadBytes()).toBe(15 * 1024 * 1024)
      expect(maxUploadFiles()).toBe(20)
    })

    it('is overridable per environment', () => {
      process.env.MARKETPLACE_UPLOAD_MAX_BYTES = '1048576'
      process.env.MARKETPLACE_UPLOAD_MAX_FILES = '3'
      expect(maxUploadBytes()).toBe(1048576)
      expect(maxUploadFiles()).toBe(3)
    })

    it('ignores nonsense instead of becoming unbounded', () => {
      // A blank or zero override must not disable the limit entirely.
      for (const value of ['', '0', '-5', 'lots']) {
        process.env.MARKETPLACE_UPLOAD_MAX_BYTES = value
        expect(maxUploadBytes()).toBe(15 * 1024 * 1024)
      }
    })
  })
})
