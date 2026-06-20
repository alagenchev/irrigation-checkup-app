# Repair Item Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add photo upload (max 10, with annotations) to each Quote / Repair Item row via a shared `<PhotoUploadSection>` component that also replaces the inline zone photo JSX.

**Architecture:** Extract a `<PhotoUploadSection>` component that owns its own uploading/error state, receives photos + callbacks from the parent, and calls a caller-provided `uploadAction`. The parent form sheds all photo state management. A new `uploadRepairPhoto` server action stores files at `repairs/{itemIdx}/…` in R2.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Cloudflare R2 (@aws-sdk/client-s3), Jest + Testing Library, Drizzle ORM (JSONB — no migration needed)

---

## File Map

| File | Action |
|---|---|
| `actions/upload.ts` | Add `uploadRepairPhoto` |
| `types/index.ts` | Add `photoData` field to `QuoteItemFormData` |
| `lib/schema.ts` | Add `photoData?` to `QuoteItemData` |
| `lib/validators.ts` | Add `photoData` to `quoteItemRow` Zod schema |
| `app/components/photo-upload-section.tsx` | **New** — shared upload component |
| `app/irrigation-form.tsx` | Replace zone photo JSX; add repair item photo rows + handlers; remove `photoUploading/Errors/Thumbs/Refs` state |
| `actions/save-inspection.ts` | Include `photoData` in quoteItems mapping |
| `actions/inspections.ts` | Load `photoData` from saved quote items |
| `__tests__/upload.test.ts` | **New** — unit tests for `uploadRepairPhoto` |
| `__tests__/photo-upload-section.test.tsx` | **New** — unit tests for component |
| `__tests__/form-data-types.test.ts` | Add `photoData: []` to QuoteItemFormData test fixture |
| `__tests__/irrigation-form.test.tsx` | Add `uploadRepairPhoto` to upload mock |

---

## Task 1: Update types, schema, and validators

**Files:**
- Modify: `types/index.ts:40-42`
- Modify: `lib/schema.ts` (QuoteItemData type — the comment block, not a table)
- Modify: `lib/validators.ts:139-142`

- [ ] **Step 1: Add `photoData` to `QuoteItemFormData` in `types/index.ts`**

Replace lines 40-42:
```ts
export type QuoteItemFormData = {
  id: number; location: string; item: string; description: string; price: string; qty: string
}
```
With:
```ts
export type QuoteItemFormData = {
  id: number; location: string; item: string; description: string; price: string; qty: string
  photoData: { url: string; annotation: string }[]
}
```

- [ ] **Step 2: Add `photoData?` to `QuoteItemData` in `lib/schema.ts`**

Replace:
```ts
export type QuoteItemData = { id: number; location: string; item: string; description: string; price: string; qty: string }
```
With:
```ts
export type QuoteItemData = { id: number; location: string; item: string; description: string; price: string; qty: string; photoData?: { url: string; annotation: string }[] }
```

- [ ] **Step 3: Add `photoData` to `quoteItemRow` Zod schema in `lib/validators.ts`**

Replace lines 139-142:
```ts
const quoteItemRow = z.object({
  id: z.number(), location: z.string(), item: z.string(),
  description: z.string(), price: z.string(), qty: z.string(),
})
```
With:
```ts
const quoteItemRow = z.object({
  id: z.number(), location: z.string(), item: z.string(),
  description: z.string(), price: z.string(), qty: z.string(),
  photoData: z.array(z.object({ url: z.string(), annotation: z.string() })).optional(),
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```
Expected: Build succeeds (the `form-data-types.test.ts` will now fail at compile time because `QuoteItemFormData` requires `photoData` but the test fixture doesn't have it — fix that in Task 7).

Actually, run:
```bash
npx tsc --noEmit
```
Expected: Errors in `__tests__/form-data-types.test.ts` (missing `photoData`) and potentially `actions/inspections.ts` (missing field in mapping). Note these — they are fixed in Tasks 5 and 7. No other errors should appear.

- [ ] **Step 5: Commit types/schema/validators**

```bash
git add types/index.ts lib/schema.ts lib/validators.ts
git commit -m "feat: add photoData field to QuoteItemFormData, QuoteItemData, and quoteItemRow schema"
```

---

## Task 2: Add `uploadRepairPhoto` server action (TDD)

**Files:**
- Create: `__tests__/upload.test.ts`
- Modify: `actions/upload.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/upload.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/upload.test.ts --no-coverage
```
Expected: FAIL — `uploadRepairPhoto` is not exported from `@/actions/upload`

- [ ] **Step 3: Implement `uploadRepairPhoto` in `actions/upload.ts`**

Append to the bottom of `actions/upload.ts`:

```ts
/**
 * Uploads a single repair item photo to Cloudflare R2.
 * The file is placed at: {companyBucketId}/repairs/{itemIdx}/{timestamp}_{filename}
 */
export async function uploadRepairPhoto(formData: FormData): Promise<ActionResult<UploadResult>> {
  const file    = formData.get('file') as File | null
  const itemIdx = formData.get('itemIdx') as string | null

  if (!file)    return { ok: false, error: 'No file provided' }
  if (!itemIdx) return { ok: false, error: 'No item index provided' }

  const settings = await db.query.companySettings.findFirst()
  if (!settings?.r2CompanyBucketId?.trim()) {
    return {
      ok: false,
      error: 'R2 Company Bucket ID is not set. Add it in Company Settings.',
    }
  }

  const buffer   = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path     = `repairs/${itemIdx}/${Date.now()}_${safeName}`

  try {
    const key = await uploadToR2(settings.r2CompanyBucketId, path, buffer, file.type || 'application/octet-stream')
    return { ok: true, data: { key, publicUrl: r2PublicUrl(key) } }
  } catch (err) {
    console.error('[uploadRepairPhoto] Failed to upload to R2', { itemIdx, path }, err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return { ok: false, error: message }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/upload.test.ts --no-coverage
```
Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add actions/upload.ts __tests__/upload.test.ts
git commit -m "feat: add uploadRepairPhoto server action"
```

---

## Task 3: Create `<PhotoUploadSection>` component (TDD)

**Files:**
- Create: `__tests__/photo-upload-section.test.tsx`
- Create: `app/components/photo-upload-section.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/photo-upload-section.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoUploadSection } from '@/app/components/photo-upload-section'

const noop = jest.fn()
const mockUploadAction = jest.fn()

beforeEach(() => jest.clearAllMocks())

function photo(url = 'https://example.com/p.jpg', annotation = '') {
  return { url, annotation }
}

describe('PhotoUploadSection', () => {
  test('renders photo count label', () => {
    render(
      <PhotoUploadSection
        photos={[]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(screen.getByText('Photos (0/10)')).toBeInTheDocument()
  })

  test('reflects current photo count', () => {
    render(
      <PhotoUploadSection
        photos={[photo(), photo()]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(screen.getByText('Photos (2/10)')).toBeInTheDocument()
  })

  test('shows Upload and Capture buttons when not readonly', () => {
    render(
      <PhotoUploadSection
        photos={[]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Capture/ })).toBeInTheDocument()
  })

  test('hides Upload and Capture buttons when readonly', () => {
    render(
      <PhotoUploadSection
        photos={[]}
        maxPhotos={10}
        readonly={true}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Capture/ })).not.toBeInTheDocument()
  })

  test('disables Upload and Capture buttons at maxPhotos', () => {
    const photos = Array.from({ length: 10 }, () => photo())
    render(
      <PhotoUploadSection
        photos={photos}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Capture/ })).toBeDisabled()
  })

  test('calls onPhotoAdded with url on successful upload', async () => {
    const onPhotoAdded = jest.fn()
    mockUploadAction.mockResolvedValue({ ok: true, url: 'https://r2.example.com/photo.jpg' })

    render(
      <PhotoUploadSection
        photos={[]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={onPhotoAdded}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )

    const uploadInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(uploadInput, { target: { files: [file] } })

    await waitFor(() => expect(onPhotoAdded).toHaveBeenCalledWith('https://r2.example.com/photo.jpg'))
  })

  test('shows error message on failed upload', async () => {
    mockUploadAction.mockResolvedValue({ ok: false, error: 'Upload failed' })

    render(
      <PhotoUploadSection
        photos={[]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )

    const uploadInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(uploadInput, { target: { files: [new File(['img'], 'p.jpg', { type: 'image/jpeg' })] } })

    await waitFor(() => expect(screen.getByText(/Upload failed/)).toBeInTheDocument())
  })

  test('shows error message when at max and another file is attempted', async () => {
    const photos = Array.from({ length: 10 }, () => photo())

    render(
      <PhotoUploadSection
        photos={photos}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )

    const uploadInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
    fireEvent.change(uploadInput, { target: { files: [new File(['img'], 'p.jpg')] } })

    await waitFor(() => expect(screen.getByText(/Maximum 10 photos reached/)).toBeInTheDocument())
    expect(mockUploadAction).not.toHaveBeenCalled()
  })

  test('renders photo grid with img and annotation input', () => {
    render(
      <PhotoUploadSection
        photos={[{ url: 'https://example.com/1.jpg', annotation: 'Broken head' }]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(screen.getByRole('img', { name: 'Photo 1' })).toHaveAttribute('src', 'https://example.com/1.jpg')
    expect(screen.getByPlaceholderText('Annotation...')).toHaveValue('Broken head')
  })

  test('calls onAnnotationChange when annotation is typed', async () => {
    const user = userEvent.setup()
    const onAnnotationChange = jest.fn()

    render(
      <PhotoUploadSection
        photos={[{ url: 'https://example.com/1.jpg', annotation: '' }]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={onAnnotationChange}
        uploadAction={mockUploadAction}
      />,
    )

    await user.type(screen.getByPlaceholderText('Annotation...'), 'a')
    expect(onAnnotationChange).toHaveBeenCalledWith(0, 'a')
  })

  test('shows annotation as static text in readonly mode', () => {
    render(
      <PhotoUploadSection
        photos={[{ url: 'https://example.com/1.jpg', annotation: 'Broken head' }]}
        maxPhotos={10}
        readonly={true}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(screen.getByText('Broken head')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Annotation...')).not.toBeInTheDocument()
  })

  test('does not render photo grid when photos is empty', () => {
    const { container } = render(
      <PhotoUploadSection
        photos={[]}
        maxPhotos={10}
        readonly={false}
        onPhotoAdded={noop}
        onAnnotationChange={noop}
        uploadAction={mockUploadAction}
      />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/photo-upload-section.test.tsx --no-coverage
```
Expected: FAIL — `Cannot find module '@/app/components/photo-upload-section'`

- [ ] **Step 3: Implement `app/components/photo-upload-section.tsx`**

Create `app/components/photo-upload-section.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'

type Photo = { url: string; annotation: string }

export type PhotoUploadSectionProps = {
  photos:             Photo[]
  maxPhotos:          number
  readonly:           boolean
  onPhotoAdded:       (url: string) => void
  onAnnotationChange: (idx: number, annotation: string) => void
  uploadAction:       (file: File) => Promise<{ ok: true; url: string } | { ok: false; error: string }>
  // Optional ref callbacks for external access (e.g. PDF generation needs the raw input files)
  uploadInputRef?:    (el: HTMLInputElement | null) => void
  captureInputRef?:   (el: HTMLInputElement | null) => void
}

export function PhotoUploadSection({
  photos,
  maxPhotos,
  readonly,
  onPhotoAdded,
  onAnnotationChange,
  uploadAction,
  uploadInputRef,
  captureInputRef,
}: PhotoUploadSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const uploadRef  = useRef<HTMLInputElement | null>(null)
  const captureRef = useRef<HTMLInputElement | null>(null)

  async function handleFiles(files: File[]) {
    for (const file of files) {
      if (photos.length >= maxPhotos) {
        setError(`Maximum ${maxPhotos} photos reached`)
        return
      }
      setUploading(true)
      setError('')
      try {
        const result = await uploadAction(file)
        if (result.ok) {
          onPhotoAdded(result.url)
        } else {
          setError(result.error)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload error')
      } finally {
        setUploading(false)
      }
    }
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#71717a', marginBottom: 3 }}>
        Photos ({photos.length}/{maxPhotos})
      </div>

      {!readonly && (
        <>
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            ref={el => {
              uploadRef.current = el
              uploadInputRef?.(el)
            }}
            onChange={async e => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              await handleFiles(files)
            }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            ref={el => {
              captureRef.current = el
              captureInputRef?.(el)
            }}
            onChange={async e => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) await handleFiles([file])
            }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => uploadRef.current?.click()}
              disabled={uploading || photos.length >= maxPhotos}
            >
              Upload
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => captureRef.current?.click()}
              disabled={uploading || photos.length >= maxPhotos}
            >
              📷 Capture
            </button>
            {uploading && <span style={{ fontSize: 12, color: '#3b82f6' }}>⏳ Uploading...</span>}
          </div>
        </>
      )}

      {error && (
        <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8, padding: 8, backgroundColor: '#fee2e2', borderRadius: 4 }}>
          ❌ {error}
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {photos.map((photo, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <img
                src={photo.url}
                alt={`Photo ${idx + 1}`}
                style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb', backgroundColor: '#f5f5f5' }}
              />
              {!readonly && (
                <input
                  type="text"
                  placeholder="Annotation..."
                  value={photo.annotation}
                  onChange={e => onAnnotationChange(idx, e.target.value)}
                  maxLength={100}
                  style={{ fontSize: 11, padding: 4, borderRadius: 3, border: '1px solid #d4d4d8', width: '100%', boxSizing: 'border-box' }}
                />
              )}
              {readonly && photo.annotation && (
                <div style={{ fontSize: 11, color: '#71717a', padding: 4 }}>{photo.annotation}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/photo-upload-section.test.tsx --no-coverage
```
Expected: PASS — 11 tests passing

- [ ] **Step 5: Commit**

```bash
git add app/components/photo-upload-section.tsx __tests__/photo-upload-section.test.tsx
git commit -m "feat: add PhotoUploadSection shared component"
```

---

## Task 4: Replace zone photo JSX in `irrigation-form.tsx`

**Files:**
- Modify: `app/irrigation-form.tsx`
- Modify: `__tests__/irrigation-form.test.tsx`

- [ ] **Step 1: Add import for `PhotoUploadSection` and `uploadRepairPhoto` in `irrigation-form.tsx`**

At the top of `app/irrigation-form.tsx`, find the existing import:
```ts
import { uploadZonePhoto } from '@/actions/upload'
```
Replace with:
```ts
import { uploadZonePhoto, uploadRepairPhoto } from '@/actions/upload'
import { PhotoUploadSection } from '@/app/components/photo-upload-section'
```

- [ ] **Step 2: Remove now-unused photo state from `irrigation-form.tsx`**

Find and remove these four lines (around line 111-114):
```ts
const [photoUploading, setPhotoUploading] = useState<Record<number, boolean>>({})
const [photoErrors,    setPhotoErrors]    = useState<Record<number, string>>({})
const [photoThumbs,    setPhotoThumbs]    = useState<Record<number, string[]>>({})
const photoRefs = useRef<Record<string, HTMLInputElement | null>>({})
```

Replace with just the photoRefs (still needed for PDF generation via `buildReportFormData`):
```ts
const photoRefs = useRef<Record<string, HTMLInputElement | null>>({})
```

- [ ] **Step 3: Replace zone photo JSX block with `<PhotoUploadSection>` in `irrigation-form.tsx`**

Find the entire `{/* PHOTOS SECTION */}` block (around line 1021-1139):
```tsx
                        {/* PHOTOS SECTION */}
                        <div>
                          <div style={{fontSize:11,color:'#71717a',marginBottom:3}}>Photos ({zn.photoData.length}/30)</div>

                          {mode !== 'readonly' && (
                            <>
                              <input type="file" accept="image/*" multiple style={{display:'none'}}
                                ref={el => { photoRefs.current[`zone_upload_${zn.id}`] = el }}
                                onChange={async e => {
                                  ...
                                }}
                              />
                              <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                                ref={el => { photoRefs.current[`zone_capture_${zn.id}`] = el }}
                                onChange={async e => {
                                  ...
                                }}
                              />
                              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                                <button ... >Upload</button>
                                <button ... >📷 Capture</button>
                                {photoUploading[zn.id] && <span ...>⏳ Uploading...</span>}
                              </div>
                            </>
                          )}

                          {photoErrors[zn.id] && (
                            <div ...>❌ {photoErrors[zn.id]}</div>
                          )}

                          {zn.photoData.length > 0 && (
                            <div style={{display:'grid',...}}>
                              {zn.photoData.map((photo, idx) => (
                                ...
                              ))}
                            </div>
                          )}
                        </div>
```

Replace the entire block with:
```tsx
                        {/* PHOTOS SECTION */}
                        <PhotoUploadSection
                          photos={zn.photoData}
                          maxPhotos={30}
                          readonly={mode === 'readonly'}
                          onPhotoAdded={url => addZonePhotoUrl(zn.id, url)}
                          onAnnotationChange={(idx, text) => updateZonePhotoAnnotation(zn.id, idx, text)}
                          uploadAction={async file => {
                            const fd = new FormData()
                            fd.append('file', file)
                            fd.append('zoneNum', zn.zoneNum)
                            const res = await uploadZonePhoto(fd)
                            return res.ok
                              ? { ok: true, url: res.data.publicUrl || res.data.key }
                              : { ok: false, error: res.error }
                          }}
                          uploadInputRef={el => { photoRefs.current[`zone_upload_${zn.id}`] = el }}
                          captureInputRef={el => { photoRefs.current[`zone_capture_${zn.id}`] = el }}
                        />
```

- [ ] **Step 4: Update `__tests__/irrigation-form.test.tsx` to mock `uploadRepairPhoto`**

Find the existing mock block:
```ts
jest.mock('@/actions/upload', () => ({
  uploadZonePhoto: jest.fn(),
}))
```
Replace with:
```ts
jest.mock('@/actions/upload', () => ({
  uploadZonePhoto: jest.fn(),
  uploadRepairPhoto: jest.fn(),
}))
```

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: All tests pass except `form-data-types.test.ts` (TypeScript compile error on `QuoteItemFormData` missing `photoData` — fixed in Task 7).

- [ ] **Step 6: Commit**

```bash
git add app/irrigation-form.tsx __tests__/irrigation-form.test.tsx
git commit -m "refactor: replace inline zone photo JSX with PhotoUploadSection component"
```

---

## Task 5: Add repair item photo handlers and UI in `irrigation-form.tsx`

**Files:**
- Modify: `app/irrigation-form.tsx`

- [ ] **Step 1: Add `photoData: []` to all quote item initializations**

Find the initial `quoteItems` state (around line 83-87):
```ts
const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() =>
  initialData?.quoteItems ?? [
    { id: uid(), location: '', item: '', description: '', price: '', qty: '1' }
  ]
)
```
Replace with:
```ts
const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(() =>
  initialData?.quoteItems ?? [
    { id: uid(), location: '', item: '', description: '', price: '', qty: '1', photoData: [] }
  ]
)
```

Find `addQuoteItem` function (around line 338-339):
```ts
function addQuoteItem() {
  setQuoteItems(q => [...q, { id: uid(), location: '', item: '', description: '', price: '', qty: '1' }])
```
Replace with:
```ts
function addQuoteItem() {
  setQuoteItems(q => [...q, { id: uid(), location: '', item: '', description: '', price: '', qty: '1', photoData: [] }])
```

- [ ] **Step 2: Add `addQuoteItemPhotoUrl` and `updateQuoteItemPhotoAnnotation` handlers**

Find the `removeQuoteItem` function (around line 344-345) and add after it:
```ts
  function addQuoteItemPhotoUrl(id: number, url: string) {
    setQuoteItems(q => q.map(qi => qi.id === id ? { ...qi, photoData: [...qi.photoData, { url, annotation: '' }] } : qi))
  }
  function updateQuoteItemPhotoAnnotation(id: number, photoIdx: number, annotation: string) {
    setQuoteItems(q => q.map(qi =>
      qi.id === id
        ? { ...qi, photoData: qi.photoData.map((p, i) => i === photoIdx ? { ...p, annotation } : p) }
        : qi,
    ))
  }
```

- [ ] **Step 3: Add inline photo row below each quote item `<tr>` in the JSX**

Find the quote items `<tbody>` map (around line 1275-1288):
```tsx
              {quoteItems.map((qi, i) => (
                <tr key={qi.id}>
                  <td>{i+1}</td>
                  ...
                  {mode !== 'readonly' && (
                    <td><button type="button" className="btn btn-danger" onClick={() => removeQuoteItem(qi.id)}>✕</button></td>
                  )}
                </tr>
              ))}
```
Replace with:
```tsx
              {quoteItems.map((qi, i) => (
                <React.Fragment key={qi.id}>
                  <tr>
                    <td>{i+1}</td>
                    <td><textarea rows={2} value={qi.location} onChange={e => updateQuoteItem(qi.id,'location',e.target.value)} placeholder="Controller1-Zone3" disabled={mode === 'readonly'} /></td>
                    <td><textarea rows={2} value={qi.item} onChange={e => updateQuoteItem(qi.id,'item',e.target.value)} placeholder="Item name" disabled={mode === 'readonly'} /></td>
                    <td><textarea rows={2} value={qi.description} onChange={e => updateQuoteItem(qi.id,'description',e.target.value)} placeholder="Description" disabled={mode === 'readonly'} /></td>
                    <td><input type="number" step="0.01" value={qi.price} onChange={e => updateQuoteItem(qi.id,'price',e.target.value)} placeholder="0.00" disabled={mode === 'readonly'} /></td>
                    <td><input type="number" value={qi.qty} onChange={e => updateQuoteItem(qi.id,'qty',e.target.value)} min="1" disabled={mode === 'readonly'} /></td>
                    <td>${((parseFloat(qi.price)||0)*(parseInt(qi.qty)||1)).toFixed(2)}</td>
                    {mode !== 'readonly' && (
                      <td><button type="button" className="btn btn-danger" onClick={() => removeQuoteItem(qi.id)}>✕</button></td>
                    )}
                  </tr>
                  <tr>
                    <td colSpan={mode !== 'readonly' ? 8 : 7} style={{padding:'0 8px 12px',background:'#1a1a1a'}}>
                      <PhotoUploadSection
                        photos={qi.photoData}
                        maxPhotos={10}
                        readonly={mode === 'readonly'}
                        onPhotoAdded={url => addQuoteItemPhotoUrl(qi.id, url)}
                        onAnnotationChange={(idx, text) => updateQuoteItemPhotoAnnotation(qi.id, idx, text)}
                        uploadAction={async file => {
                          const fd = new FormData()
                          fd.append('file', file)
                          fd.append('itemIdx', String(i))
                          const res = await uploadRepairPhoto(fd)
                          return res.ok
                            ? { ok: true, url: res.data.publicUrl || res.data.key }
                            : { ok: false, error: res.error }
                        }}
                      />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
```

Make sure `React` is imported at the top — check for `import React from 'react'`. If only `{ useState, ... }` are imported, add `React` as the default import or use `import React, { useState, ... }`.

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: All pass except `form-data-types.test.ts` (TypeScript error on QuoteItemFormData — fixed in Task 7).

- [ ] **Step 5: Commit**

```bash
git add app/irrigation-form.tsx
git commit -m "feat: add repair item photo upload UI with PhotoUploadSection"
```

---

## Task 6: Persist and load `photoData` in save/load actions

**Files:**
- Modify: `actions/save-inspection.ts:106-109`
- Modify: `actions/inspections.ts:115-124`

- [ ] **Step 1: Update `save-inspection.ts` to include `photoData` in quoteItems mapping**

Find lines 106-109 in `actions/save-inspection.ts`:
```ts
      const quoteItems: QuoteItemData[] = data.quoteItems.map(qi => ({
        id: qi.id, location: qi.location, item: qi.item,
        description: qi.description, price: qi.price, qty: qi.qty,
      }))
```
Replace with:
```ts
      const quoteItems: QuoteItemData[] = data.quoteItems.map(qi => ({
        id: qi.id, location: qi.location, item: qi.item,
        description: qi.description, price: qi.price, qty: qi.qty,
        photoData: qi.photoData ?? [],
      }))
```

- [ ] **Step 2: Update `inspections.ts` to load `photoData` when reading saved quote items**

Find lines 115-124 in `actions/inspections.ts`:
```ts
  const quoteItems: QuoteItemFormData[] = rawQuoteItems && rawQuoteItems.length > 0
    ? rawQuoteItems.map(qi => ({
        id:          eid++,
        location:    qi.location,
        item:        qi.item,
        description: qi.description,
        price:       qi.price,
        qty:         qi.qty,
      }))
    : [{ id: eid++, location: '', item: '', description: '', price: '', qty: '1' }]
```
Replace with:
```ts
  const quoteItems: QuoteItemFormData[] = rawQuoteItems && rawQuoteItems.length > 0
    ? rawQuoteItems.map(qi => ({
        id:          eid++,
        location:    qi.location,
        item:        qi.item,
        description: qi.description,
        price:       qi.price,
        qty:         qi.qty,
        photoData:   qi.photoData ?? [],
      }))
    : [{ id: eid++, location: '', item: '', description: '', price: '', qty: '1', photoData: [] }]
```

- [ ] **Step 3: Run build to check types**

```bash
npm run build
```
Expected: Build succeeds (or fails only on `form-data-types.test.ts` TypeScript error — fixed next).

- [ ] **Step 4: Commit**

```bash
git add actions/save-inspection.ts actions/inspections.ts
git commit -m "feat: persist and load photoData on repair quote items"
```

---

## Task 7: Update `form-data-types.test.ts`

**Files:**
- Modify: `__tests__/form-data-types.test.ts`

- [ ] **Step 1: Add `photoData: []` to the QuoteItemFormData test fixture**

Find the `quoteItemRow schema accepts a complete QuoteItemFormData object` test (around line 80-86):
```ts
  test('quoteItemRow schema accepts a complete QuoteItemFormData object', () => {
    const qi: QuoteItemFormData = {
      id: 4, location: 'Zone 1', item: 'Replace head', description: '4" popup', price: '25.00', qty: '2',
    }
```
Replace with:
```ts
  test('quoteItemRow schema accepts a complete QuoteItemFormData object', () => {
    const qi: QuoteItemFormData = {
      id: 4, location: 'Zone 1', item: 'Replace head', description: '4" popup', price: '25.00', qty: '2',
      photoData: [{ url: 'https://r2.example.com/photo.jpg', annotation: 'Broken head' }],
    }
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```
Expected: ALL tests pass — 0 failures.

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: Build succeeds — 0 TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add __tests__/form-data-types.test.ts
git commit -m "test: update form-data-types test to include photoData on QuoteItemFormData"
```

---

## Task 8: Final verification and push

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: All tests pass — 0 failures.

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: Build succeeds — 0 errors.

- [ ] **Step 3: Run git status to confirm no unstaged files**

```bash
git status
```
Expected: Clean working tree. If any file is untracked or modified, commit it now.

- [ ] **Step 4: Push**

```bash
git push
```
