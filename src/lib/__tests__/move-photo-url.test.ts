import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { movePhotoUrl } from '../move-photo-url'

describe('movePhotoUrl', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1')
    vi.stubEnv('NEXT_PUBLIC_APPWRITE_PROJECT_ID', 'proj')
    vi.stubEnv('NEXT_PUBLIC_BUCKET_MOVE_PHOTOS', 'move-photos')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('turns a bare file id into the bucket view URL', () => {
    expect(movePhotoUrl('6ac4255e000b055b3009')).toBe(
      'https://cloud.appwrite.io/v1/storage/buckets/move-photos/files/6ac4255e000b055b3009/view?project=proj'
    )
  })

  it('passes through values that are already URLs or absolute paths', () => {
    const url = 'https://cloud.appwrite.io/v1/storage/buckets/b/files/f/view?project=p'
    expect(movePhotoUrl(url)).toBe(url)
    expect(movePhotoUrl('http://example.com/a.jpg')).toBe('http://example.com/a.jpg')
    expect(movePhotoUrl('/images/placeholder.png')).toBe('/images/placeholder.png')
    expect(movePhotoUrl('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA')
  })

  it('is null for empty values', () => {
    expect(movePhotoUrl('')).toBeNull()
    expect(movePhotoUrl('   ')).toBeNull()
    expect(movePhotoUrl(null)).toBeNull()
    expect(movePhotoUrl(undefined)).toBeNull()
  })

  it('is null for a file id when the bucket is not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_BUCKET_MOVE_PHOTOS', '')
    expect(movePhotoUrl('6ac4255e000b055b3009')).toBeNull()
  })
})
