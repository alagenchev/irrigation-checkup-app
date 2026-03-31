import { NextRequest, NextResponse } from 'next/server'
import { generateIrrigationPdfHtml } from '@/lib/irrigation-pdf'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const fields: Record<string, string> = {}
    const fileMap: Record<string, string[]> = {}

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer())
        const b64 = `data:${value.type};base64,${buffer.toString('base64')}`
        if (!fileMap[key]) fileMap[key] = []
        fileMap[key].push(b64)
      } else {
        fields[key] = value
      }
    }

    const controllers = JSON.parse(fields.controllers || '[]')
    const zones       = JSON.parse(fields.zones       || '[]')
    const backflows   = JSON.parse(fields.backflows   || '[]')
    const zoneIssues  = JSON.parse(fields.zoneIssues  || '[]')
    const quoteItems  = JSON.parse(fields.quoteItems  || '[]')

    const photoMap: Record<string, string[]> = {}
    for (const [key, imgs] of Object.entries(fileMap)) {
      if (key.startsWith('photo_')) photoMap[key] = imgs
    }

    const html = generateIrrigationPdfHtml({ formData: fields, controllers, zones, backflows, zoneIssues, quoteItems, photoMap })

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
