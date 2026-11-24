import { describe, expect, it } from 'vitest'
import { isMovePhotoProxyUrl, movePhotoUrl, toFileId } from '../move-photo-url'

/** Plan `legal/4.private-photos`: the web never builds a public Appwrite URL for a move photo. */
const LEGACY = 'https://fra.cloud.appwrite.io/v1/storage/buckets/b1/files/6ac4255e000b055b3009/view?project=p1'

describe('movePhotoUrl', () => {
  it('sends a bare file id through the photo route, naming the move', () => {
    expect(movePhotoUrl('6ac4255e000b055b3009', 'PL-1001')).toBe('/api/photos/move/6ac4255e000b055b3009?m=PL-1001')
  })

  it('reduces a legacy Appwrite URL to the same route', () => {
    expect(movePhotoUrl(LEGACY, 'move_1')).toBe('/api/photos/move/6ac4255e000b055b3009?m=move_1')
  })

  it('never returns an Appwrite storage URL', () => {
    for (const ref of ['6ac4255e000b055b3009', LEGACY]) {
      expect(movePhotoUrl(ref, 'm')).not.toContain('storage/buckets')
    }
  })

  it('passes local and foreign sources through', () => {
    expect(movePhotoUrl('http://example.com/a.jpg', 'm')).toBe('http://example.com/a.jpg')
    expect(movePhotoUrl('/images/placeholder.png', 'm')).toBe('/images/placeholder.png')
    expect(movePhotoUrl('data:image/jpeg;base64,AAAA', null)).toBe('data:image/jpeg;base64,AAAA')
    expect(movePhotoUrl('blob:abc', undefined)).toBe('blob:abc')
  })

  it('returns null for an empty value, a malformed one, or a photo with no move to name', () => {
    expect(movePhotoUrl('', 'm')).toBeNull()
    expect(movePhotoUrl('   ', 'm')).toBeNull()
    expect(movePhotoUrl(null, 'm')).toBeNull()
    expect(movePhotoUrl(undefined, 'm')).toBeNull()
    expect(movePhotoUrl('not a file id!', 'm')).toBeNull()
    expect(movePhotoUrl('6ac4255e000b055b3009', null)).toBeNull()
    expect(movePhotoUrl('6ac4255e000b055b3009', '  ')).toBeNull()
  })

  it('escapes what goes into the URL', () => {
    expect(movePhotoUrl('abc', 'a b&c')).toBe('/api/photos/move/abc?m=a%20b%26c')
  })
})

describe('helpers', () => {
  it('toFileId reads a bare id or a view URL and nothing else', () => {
    expect(toFileId('abc_1')).toBe('abc_1')
    expect(toFileId(LEGACY)).toBe('6ac4255e000b055b3009')
    expect(toFileId('https://example.com/x.jpg')).toBeNull()
    expect(toFileId(null)).toBeNull()
  })

  it('knows a photo route URL, which must skip the image optimiser', () => {
    expect(isMovePhotoProxyUrl('/api/photos/move/abc?m=x')).toBe(true)
    expect(isMovePhotoProxyUrl('/images/placeholder.png')).toBe(false)
    expect(isMovePhotoProxyUrl(LEGACY)).toBe(false)
    expect(isMovePhotoProxyUrl(undefined)).toBe(false)
  })
})
