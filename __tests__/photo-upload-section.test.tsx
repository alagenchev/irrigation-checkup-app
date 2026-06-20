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
