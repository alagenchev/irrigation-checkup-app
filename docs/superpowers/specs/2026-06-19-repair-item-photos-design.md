# Repair Item Photos — Design Spec

**Date:** 2026-06-19
**Status:** Approved

---

## Summary

Add photo upload capability to each Quote / Repair Item row in the irrigation inspection form. Photos have annotations and are uploaded to Cloudflare R2. The feature is implemented by extracting a shared `<PhotoUploadSection>` component, replacing the existing inline zone photo JSX and wiring it into each repair item row.

---

## Architecture

### New shared component: `app/components/photo-upload-section.tsx`

A self-contained React component that manages its own `uploading` and `error` state. The parent keeps only the photo data array; the component handles file selection, upload, preview, and error display.

**Props:**

```ts
type Photo = { url: string; annotation: string }

type PhotoUploadSectionProps = {
  photos:             Photo[]
  maxPhotos:          number           // 30 for zones, 10 for repair items
  readonly:           boolean
  onPhotoAdded:       (url: string) => void
  onAnnotationChange: (idx: number, annotation: string) => void
  uploadAction:       (file: File) => Promise<{ ok: true; url: string } | { ok: false; error: string }>
}
```

**Internal state:** `uploading: boolean`, `error: string`
**Internal refs:** hidden upload input (multi-file), hidden capture input (camera)

The component renders:
- Photo count label: `Photos (n/max)`
- Upload and Capture buttons (hidden when readonly or at limit)
- Inline error message on failure
- Responsive photo grid with annotation input per photo

By moving state management into the component, `irrigation-form.tsx` sheds `photoUploading`, `photoErrors`, `photoThumbs`, and `photoRefs` (~100 lines removed).

---

## Server Actions

### New: `uploadRepairPhoto` in `actions/upload.ts`

Same shape as the existing `uploadZonePhoto`. Uploads to:

```
{r2CompanyBucketId}/repairs/{itemIdx}/{timestamp}_{filename}
```

Takes `FormData` with `file` (File) and `itemIdx` (string). Returns `ActionResult<{ key: string; publicUrl: string | null }>`.

---

## Data Model Changes

### `types/index.ts` — `QuoteItemFormData`

Add `photoData: { url: string; annotation: string }[]` field.

### `lib/schema.ts` — `QuoteItemData`

Add `photoData?: { url: string; annotation: string }[]` field (optional for backwards compatibility with existing saved inspections that have no photos).

---

## UI Changes

### Zone photo section in `irrigation-form.tsx`

Replace the ~80-line inline zone photo JSX block with:

```tsx
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
    return res.ok ? { ok: true, url: res.data.publicUrl || res.data.key } : { ok: false, error: res.error }
  }}
/>
```

No behavior change for zones.

### Repair item inline photo row

Below each repair item `<tr>`, add a second `<tr>` spanning all columns:

```tsx
<tr>
  <td colSpan={6} style={{ padding: '0 8px 12px', background: '#1a1a1a' }}>
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
        return res.ok ? { ok: true, url: res.data.publicUrl || res.data.key } : { ok: false, error: res.error }
      }}
    />
  </td>
</tr>
```

New handlers in `irrigation-form.tsx`:
- `addQuoteItemPhotoUrl(id, url)` — appends `{ url, annotation: '' }` to `qi.photoData`
- `updateQuoteItemPhotoAnnotation(id, idx, text)` — updates annotation at index

---

## Persistence

`actions/save-inspection.ts` already persists `quoteItems` as JSONB. Because `QuoteItemData.photoData` is optional, existing saved inspections load correctly without migration. New saves include `photoData` when present.

No schema migration is required — `quoteItems` is already a `jsonb` column and the shape change is additive.

---

## Testing

- Unit tests for `<PhotoUploadSection>`: renders count, Upload/Capture buttons trigger file inputs, onPhotoAdded called on success, error displayed on failure, readonly hides controls, maxPhotos disables buttons at limit.
- Update `irrigation-form.test.tsx`: zone photo section now renders via `<PhotoUploadSection>` — update any assertions targeting the old inline structure.
- Update `form-data-types.test.ts`: add `photoData` field to `QuoteItemFormData` shape check.
- Unit test for `uploadRepairPhoto` server action: happy path, missing file, missing itemIdx, missing bucket ID.

---

## Files Changed

| File | Change |
|---|---|
| `app/components/photo-upload-section.tsx` | **New** — shared photo upload component |
| `actions/upload.ts` | Add `uploadRepairPhoto` |
| `types/index.ts` | Add `photoData` to `QuoteItemFormData` |
| `lib/schema.ts` | Add `photoData?` to `QuoteItemData` |
| `app/irrigation-form.tsx` | Replace zone photo JSX with component; add repair item photo rows + handlers |
| `__tests__/irrigation-form.test.tsx` | Update for new component structure |
| `__tests__/form-data-types.test.ts` | Add `photoData` field check |
| `__tests__/r2.test.ts` or new `__tests__/upload.test.ts` | Unit tests for `uploadRepairPhoto` |
