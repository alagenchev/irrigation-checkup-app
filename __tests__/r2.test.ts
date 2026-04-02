import { buildR2Key, r2PublicUrl } from '@/lib/r2'

describe('buildR2Key', () => {
  test('combines companyBucketId and path', () => {
    expect(buildR2Key('abc-uuid', 'zones/3/photo.jpg')).toBe('abc-uuid/zones/3/photo.jpg')
  })

  test('handles nested paths', () => {
    expect(buildR2Key('uuid-123', 'zones/10/1700000000000_img.png')).toBe(
      'uuid-123/zones/10/1700000000000_img.png',
    )
  })
})

describe('r2PublicUrl', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('returns null when R2_PUBLIC_URL is not set', () => {
    delete process.env.R2_PUBLIC_URL
    expect(r2PublicUrl('abc-uuid/zones/3/photo.jpg')).toBeNull()
  })

  test('returns full URL when R2_PUBLIC_URL is set', () => {
    process.env.R2_PUBLIC_URL = 'https://files.example.com'
    expect(r2PublicUrl('abc-uuid/zones/3/photo.jpg')).toBe(
      'https://files.example.com/abc-uuid/zones/3/photo.jpg',
    )
  })
})

describe('buildClient (via uploadToR2)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('throws when R2_ENDPOINT is missing', async () => {
    delete process.env.R2_ENDPOINT
    process.env.R2_ACCESS_KEY_ID = 'key'
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    const { uploadToR2 } = await import('@/lib/r2')
    await expect(uploadToR2('bucket', 'path/file.jpg', Buffer.from(''), 'image/jpeg')).rejects.toThrow(
      'Missing R2 env vars',
    )
  })

  test('throws when R2_ACCESS_KEY_ID is missing', async () => {
    process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com'
    delete process.env.R2_ACCESS_KEY_ID
    process.env.R2_SECRET_ACCESS_KEY = 'secret'
    const { uploadToR2 } = await import('@/lib/r2')
    await expect(uploadToR2('bucket', 'path/file.jpg', Buffer.from(''), 'image/jpeg')).rejects.toThrow(
      'Missing R2 env vars',
    )
  })
})
