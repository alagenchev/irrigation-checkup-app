import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import { generateIrrigationPdfHtml } from '@/lib/irrigation-pdf'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // Parse simple fields
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
    const zones = JSON.parse(fields.zones || '[]')
    const backflows = JSON.parse(fields.backflows || '[]')
    const zoneIssues = JSON.parse(fields.zoneIssues || '[]')
    const zoneNotes = JSON.parse(fields.zoneNotes || '[]')
    const quoteItems = JSON.parse(fields.quoteItems || '[]')

    // Build photoMap: key is like "photo_zone_2"
    const photoMap: Record<string, string[]> = {}
    for (const [key, imgs] of Object.entries(fileMap)) {
      if (key.startsWith('photo_')) {
        photoMap[key] = imgs
      }
    }

    const html = generateIrrigationPdfHtml({ formData: fields, controllers, zones, backflows, zoneIssues, zoneNotes, quoteItems, photoMap })

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
    })
    await browser.close()

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="checkup-report-${Date.now()}.pdf"`,
      },
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 })
  }
}
