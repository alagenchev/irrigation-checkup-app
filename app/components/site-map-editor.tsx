'use client'

import dynamic from 'next/dynamic'

const SiteMapEditorInner = dynamic(
  () => import('./site-map-editor-inner').then(m => ({ default: m.SiteMapEditorInner })),
  { ssr: false, loading: () => <div style={{ color: '#a1a1aa', padding: 16 }}>Loading map…</div> },
)

interface SiteMapEditorProps {
  siteId: string
  siteName: string
  onClose: () => void
}

export function SiteMapEditor(props: SiteMapEditorProps) {
  return <SiteMapEditorInner {...props} />
}
