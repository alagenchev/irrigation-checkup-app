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
  // Optional ref callbacks — allow parent to access the underlying file inputs (e.g. for PDF generation)
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
