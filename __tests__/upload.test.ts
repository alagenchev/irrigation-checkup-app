jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/db', () => ({
  db: {
    query: {
      companySettings: { findFirst: jest.fn() },
    },
  },
}))
jest.mock('@/lib/r2', () => ({
  uploadToR2: jest.fn(),
  r2PublicUrl: jest.fn(),
}))

import { uploadRepairPhoto } from '@/actions/upload'
import { db } from '@/lib/db'
import { uploadToR2, r2PublicUrl } from '@/lib/r2'

const mockFindFirst = (db as any).query.companySettings.findFirst as jest.Mock
const mockUploadToR2 = uploadToR2 as jest.MockedFunction<typeof uploadToR2>
const mockR2PublicUrl = r2PublicUrl as jest.MockedFunction<typeof r2PublicUrl>

function makeFormData(file?: File, itemIdx?: string): FormData {
  const fd = new FormData()
  if (file) fd.append('file', file)
  if (itemIdx !== undefined) fd.append('itemIdx', itemIdx)
  return fd
}

beforeEach(() => jest.clearAllMocks())

describe('uploadRepairPhoto', () => {
  test('returns error when no file provided', async () => {
    const result = await uploadRepairPhoto(makeFormData(undefined, '0'))
    expect(result).toEqual({ ok: false, error: 'No file provided' })
  })

  test('returns error when no itemIdx provided', async () => {
    const result = await uploadRepairPhoto(makeFormData(new File(['x'], 'p.jpg')))
    expect(result).toEqual({ ok: false, error: 'No item index provided' })
  })

  test('returns error when R2 bucket ID not configured', async () => {
    mockFindFirst.mockResolvedValue({ r2CompanyBucketId: null })
    const result = await uploadRepairPhoto(makeFormData(new File(['x'], 'p.jpg', { type: 'image/jpeg' }), '0'))
    expect(result.ok).toBe(false)
    expect((result as any).error).toContain('R2 Company Bucket ID')
  })

  test('uploads to repairs/{itemIdx}/ path and returns key and publicUrl', async () => {
    mockFindFirst.mockResolvedValue({ r2CompanyBucketId: 'bucket-uuid' })
    mockUploadToR2.mockResolvedValue('bucket-uuid/repairs/0/123_p.jpg')
    mockR2PublicUrl.mockReturnValue('https://cdn.example.com/bucket-uuid/repairs/0/123_p.jpg')

    const result = await uploadRepairPhoto(makeFormData(new File(['x'], 'p.jpg', { type: 'image/jpeg' }), '0'))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.key).toBe('bucket-uuid/repairs/0/123_p.jpg')
      expect(result.data.publicUrl).toBe('https://cdn.example.com/bucket-uuid/repairs/0/123_p.jpg')
    }
    expect(mockUploadToR2).toHaveBeenCalledWith(
      'bucket-uuid',
      expect.stringMatching(/^repairs\/0\/.+p\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    )
  })

  test('returns error when uploadToR2 throws', async () => {
    mockFindFirst.mockResolvedValue({ r2CompanyBucketId: 'bucket-uuid' })
    mockUploadToR2.mockRejectedValue(new Error('S3 network failure'))

    const result = await uploadRepairPhoto(makeFormData(new File(['x'], 'p.jpg', { type: 'image/jpeg' }), '0'))

    expect(result).toEqual({ ok: false, error: 'S3 network failure' })
  })
})
