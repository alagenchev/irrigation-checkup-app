// Faithful port of irrigation-checkup-app/views/pdf-template.ejs

const ISSUE_TYPES = [
  'Runoff','Overspray','Lower Head','Raise Head','Obstructions','Adjust Nozzle',
  'Poor Coverage','Replace Valve','Main Line Leak','Pressure Issue','Misaligned Head',
  'Drip Tubing Leak','Replace 4" Popup','Replace 6" Popup','Replace 12" Popup',
  'Replace Solenoid','Zone Not Working','Lateral Pipe Leak','Replace Diaphragm',
  'Replace 1/2" Rotor','Replace 3/4" Rotor','Replace Drip Emitter',
  'Replace Spray Nozzle','Replace Rotator Nozzle',
]

function esc(str: unknown): string {
  return (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cbBox(checked: boolean): string {
  return checked
    ? '<span class="cb-box checked">✓</span>'
    : '<span class="cb-box"></span>'
}

interface Controller {
  id: number
  location: string
  manufacturer: string
  model: string
  sensors: string
  numZones: string
  masterValve: boolean
  notes: string
}

interface Zone {
  id: number
  zoneNum: string
  controller: string
  description: string
  landscapeTypes: string[]
  irrigationTypes: string[]
  notes: string
}

interface Backflow {
  id: number
  manufacturer: string
  type: string
  model: string
  size: string
}

interface ZoneIssueRow {
  zoneNum: string
  issues: string[]
}

interface QuoteItem {
  num: number
  location: string
  item: string
  description: string
  price: number
  qty: number
}

interface IrrigationPdfData {
  formData: Record<string, string>
  controllers: Controller[]
  zones: Zone[]
  backflows: Backflow[]
  zoneIssues: ZoneIssueRow[]
  quoteItems: QuoteItem[]
  photoMap: Record<string, string[]>
}

export function generateIrrigationPdfHtml(data: IrrigationPdfData): string {
  const { formData, controllers, zones, backflows, zoneIssues, quoteItems, photoMap } = data

  const quoteTotal = quoteItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  // ── BACKFLOWS SECTION ────────────────────────────────────────────────────
  let backflowsHtml = ''
  if (backflows && backflows.length > 0) {
    backflowsHtml = backflows.map(bf => `
      <table class="info-table">
        <tr>
          <td style="width:28px;font-weight:bold">#${esc(bf.id)}</td>
          <th>Manufacturer:</th><td>${esc(bf.manufacturer)}</td>
          <th>Type:</th><td>${esc(bf.type)}</td>
          <th>Model:</th><td>${esc(bf.model)}</td>
          <th>Size:</th><td>${esc(bf.size)}"</td>
        </tr>
      </table>
    `).join('')
  } else {
    backflowsHtml = `
      <table class="info-table">
        <tr>
          <td style="width:28px;font-weight:bold">Backflow:</td>
          <th>Manufacturer:</th><td>&nbsp;</td>
          <th>Type:</th><td>&nbsp;</td>
          <th>Model:</th><td>&nbsp;</td>
          <th>Size:</th><td>0"</td>
        </tr>
      </table>
    `
  }

  // ── CONTROLLERS SECTION ──────────────────────────────────────────────────
  let controllersHtml = ''
  for (const ctrl of controllers) {
    const ctrlZones = zones.filter(z => String(z.controller) === String(ctrl.id))

    let zoneDescHtml = ''
    let zoneIssuesHtml = ''

    if (ctrlZones.length > 0) {
      // Zone descriptions table
      const zoneRows = ctrlZones.map(z => `
        <tr>
          <td style="text-align:center">${esc(z.zoneNum)}</td>
          <td>${esc(z.description)}</td>
          <td>${esc((z.landscapeTypes || []).join(', '))}</td>
          <td>${esc((z.irrigationTypes || []).join(', '))}</td>
          <td>${esc(z.notes || '')}</td>
        </tr>
      `).join('')

      zoneDescHtml = `
        <table class="info-table">
          <thead>
            <tr>
              <th style="width:40px">Zone #</th>
              <th>Description</th>
              <th>Landscape Type(s)</th>
              <th>Irrigation Type(s)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${zoneRows}
          </tbody>
        </table>
      `

      // Zone issues table
      const issueTotals: Record<string, number> = {}
      ISSUE_TYPES.forEach(t => { issueTotals[t] = 0 })

      const issueRows = ctrlZones.map(z => {
        const zIssueObj = (zoneIssues || []).find(zi => String(zi.zoneNum) === String(z.zoneNum))
        const zIssueList = (zIssueObj && zIssueObj.issues) ? zIssueObj.issues : []

        const cells = ISSUE_TYPES.map(issue => {
          const hasIssue = zIssueList.indexOf(issue) !== -1
          if (hasIssue) issueTotals[issue]++
          return `<td>${hasIssue ? '<span class="check-mark">✓</span>' : ''}</td>`
        }).join('')

        return `<tr><td class="zone-num">${esc(z.zoneNum)}</td>${cells}</tr>`
      }).join('')

      const totalCells = ISSUE_TYPES.map(issue => `<td>${issueTotals[issue] || 0}</td>`).join('')
      const issueHeaders = ISSUE_TYPES.map(issue => `<th class="issue-col">${esc(issue)}</th>`).join('')

      zoneIssuesHtml = `
        <div class="section-heading">Zone Issues: ${esc(ctrl.location || ('Controller #' + ctrl.id))}</div>
        <div class="issues-wrapper">
          <table class="issues-table">
            <thead>
              <tr>
                <th class="zone-col">Zone #</th>
                ${issueHeaders}
              </tr>
            </thead>
            <tbody>
              ${issueRows}
              <tr class="totals-row">
                <td class="zone-num">Total</td>
                ${totalCells}
              </tr>
            </tbody>
          </table>
        </div>
      `
    }

    controllersHtml += `
      <table class="info-table">
        <tr>
          <th>Controller:</th>
          <td><strong>#${esc(ctrl.id)} - ${esc(ctrl.location)}</strong></td>
          <th>Controller Mfg:</th><td>${esc(ctrl.manufacturer)}</td>
          <th>Model:</th><td>${esc(ctrl.model)}</td>
        </tr>
        <tr>
          <th>Sensors:</th><td>${esc(ctrl.sensors)}</td>
          <th># of Zones:</th><td>${esc(ctrl.numZones)}</td>
          <th>Master Valve?</th>
          <td>${ctrl.masterValve ? 'Yes' : 'No'}</td>
        </tr>
      </table>
      ${zoneDescHtml}
      ${zoneIssuesHtml}
      <div class="page-footer">
        ${esc(formData.clientName || '')} — ${esc(formData.siteName || '')} — Page 1
      </div>
    `
  }

  // ── ZONE NOTES SECTION ───────────────────────────────────────────────────
  // ── ZONE PHOTOS SECTION ──────────────────────────────────────────────────
  const photoKeys = Object.keys(photoMap || {})
  const hasPhotos = photoKeys.length > 0
  let photosHtml = ''
  if (hasPhotos) {
    const photoGroups = photoKeys.map(key => {
      const label = key.replace('photo_', '').replace(/_/g, ' ')
      const imgs = (photoMap[key] || []).map(src => `<img src="${src}" alt="Zone photo">`).join('')
      return `
        <div class="photos-zone-label">${esc(label)}</div>
        <div class="photos-row">${imgs}</div>
      `
    }).join('')

    photosHtml = `
      <div class="section-heading">Zone Photos</div>
      <div class="zone-photos-section">
        ${photoGroups}
      </div>
    `
  }

  // ── QUOTE SECTION ────────────────────────────────────────────────────────
  const quoteRows = quoteItems.map(item => `
    <tr>
      <td style="text-align:center">${item.num}</td>
      <td>${esc(item.location)}</td>
      <td>
        <strong>${esc(item.item)}</strong>
        ${item.description ? `<div class="item-desc">${esc(item.description)}</div>` : ''}
      </td>
      <td style="text-align:right">$${item.price.toFixed(2)}</td>
      <td style="text-align:center">${item.qty}</td>
      <td style="text-align:right">$${(item.price * item.qty).toFixed(2)}</td>
    </tr>
  `).join('')

  const inspectionNotesRow = formData.inspectionNotes
    ? `<div style="font-size:8pt;margin-bottom:4px;"><strong>Note:</strong> ${esc(formData.inspectionNotes)}</div>`
    : ''

  // ── FULL HTML ────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    color: #111;
    background: #fff;
  }

  /* ── PAGE BREAKS ── */
  .page-break { page-break-after: always; break-after: page; }

  /* ── HEADER ── */
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #1a56db;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .report-header .logo img { height: 50px; }
  .report-header .title-block {
    text-align: center;
    flex: 1;
    padding: 0 12px;
  }
  .report-header .title-block .title-main {
    font-size: 16pt;
    font-weight: bold;
    color: #1a56db;
    line-height: 1.1;
  }
  .report-header .title-block .title-sub {
    font-size: 10pt;
    font-weight: bold;
    color: #333;
    margin-top: 2px;
  }
  .report-header .company-info {
    text-align: right;
    font-size: 8pt;
    line-height: 1.6;
    color: #333;
  }
  .report-header .company-info strong { font-size: 9pt; }

  /* ── CLIENT INFO TABLE ── */
  .client-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 8.5pt;
  }
  .client-table td {
    border: 1px solid #ccc;
    padding: 4px 6px;
  }
  .client-table .label { background: #f0f0f0; font-weight: bold; width: 90px; }

  /* ── SECTION HEADINGS ── */
  .section-heading {
    background: #1a56db;
    color: #fff;
    font-weight: bold;
    font-size: 9pt;
    padding: 3px 7px;
    margin: 8px 0 4px;
  }

  /* ── GENERAL TABLE ── */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 6px;
  }
  .info-table th {
    background: #dbeafe;
    font-weight: bold;
    padding: 3px 5px;
    border: 1px solid #93c5fd;
    text-align: left;
    font-size: 8pt;
  }
  .info-table td {
    padding: 3px 5px;
    border: 1px solid #d1d5db;
    vertical-align: top;
  }
  .info-table tr:nth-child(even) td { background: #f9fafb; }

  /* ── CHECKBOXES ── */
  .cb-row { display: flex; gap: 18px; flex-wrap: wrap; margin: 4px 0 6px; }
  .cb-item { display: flex; align-items: center; gap: 5px; font-size: 8.5pt; }
  .cb-box {
    display: inline-flex;
    width: 13px; height: 13px;
    border: 1.5px solid #555;
    align-items: center;
    justify-content: center;
    font-size: 10pt;
    line-height: 1;
  }
  .cb-box.checked { background: #1a56db; color: #fff; font-size: 9pt; }

  /* ── NOTES BOX ── */
  .notes-box {
    border: 1px solid #d1d5db;
    padding: 5px 7px;
    min-height: 28px;
    font-size: 8.5pt;
    margin-bottom: 6px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ── ZONE ISSUES TABLE ── */
  .issues-wrapper { overflow: hidden; margin-bottom: 8px; }
  .issues-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7pt;
  }
  .issues-table th {
    border: 1px solid #b0b0b0;
    padding: 2px;
    background: #f0f0f0;
    font-weight: bold;
  }
  .issues-table th.zone-col { width: 36px; text-align: center; }
  .issues-table th.issue-col {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    height: 80px;
    text-align: left;
    vertical-align: bottom;
    white-space: nowrap;
    padding: 3px 2px;
    width: 18px;
  }
  .issues-table td {
    border: 1px solid #d0d0d0;
    text-align: center;
    vertical-align: middle;
    padding: 2px;
    font-size: 9pt;
  }
  .issues-table td.zone-num { font-weight: bold; background: #f9fafb; }
  .check-mark { color: #1a56db; font-size: 9pt; }
  .totals-row td { background: #f0f0f0; font-weight: bold; }

  /* ── ZONE NOTES ── */
  .zone-notes-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 6px;
  }
  .zone-notes-table th {
    background: #dbeafe;
    padding: 3px 6px;
    border: 1px solid #93c5fd;
    font-weight: bold;
    text-align: left;
    font-size: 8pt;
  }
  .zone-notes-table td {
    border: 1px solid #d1d5db;
    padding: 4px 6px;
    vertical-align: top;
  }

  /* ── ZONE PHOTOS ── */
  .zone-photos-section { margin-bottom: 8px; }
  .photos-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0; }
  .photos-row img { width: 110px; height: 85px; object-fit: cover; border: 1px solid #ccc; }
  .photos-zone-label { font-weight: bold; font-size: 8pt; color: #333; margin-top: 4px; }

  /* ── QUOTE TABLE ── */
  .quote-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 10px;
  }
  .quote-table th {
    background: #1a56db;
    color: #fff;
    padding: 4px 6px;
    border: 1px solid #1e40af;
    font-weight: bold;
    font-size: 8pt;
  }
  .quote-table td {
    border: 1px solid #d1d5db;
    padding: 4px 6px;
    vertical-align: top;
  }
  .quote-table tr:nth-child(even) td { background: #f9fafb; }
  .quote-table .total-row td {
    background: #dbeafe;
    font-weight: bold;
    font-size: 9.5pt;
    text-align: right;
  }
  .quote-table .total-row .amount {
    text-align: right;
    color: #1a56db;
  }
  .item-desc { font-size: 7.5pt; color: #555; margin-top: 1px; }

  /* ── SIGNATURE ── */
  .signature-block {
    margin-top: 16px;
    border-top: 1px solid #ccc;
    padding-top: 10px;
  }
  .sig-line {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 24px;
  }
  .sig-line .sig-label { font-size: 8pt; white-space: nowrap; }
  .sig-line .sig-field {
    flex: 1;
    border-bottom: 1px solid #555;
    min-height: 20px;
  }
  .disclaimer {
    font-size: 7pt;
    color: #555;
    margin-top: 10px;
    line-height: 1.5;
    border: 1px solid #e5e7eb;
    padding: 6px;
    background: #fafafa;
  }

  /* ── PAGE FOOTER ── */
  .page-footer {
    text-align: center;
    font-size: 7pt;
    color: #888;
    margin-top: 14px;
    border-top: 1px solid #e5e7eb;
    padding-top: 4px;
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ PAGE 1 ═══ -->

<!-- REPORT HEADER -->
<div class="report-header">
  <div class="logo"></div>
  <div class="title-block">
    <div class="title-main">Irrigation System</div>
    <div class="title-sub">Inspection</div>
  </div>
  <div class="company-info">
    <strong>${esc(formData.companyName)}</strong><br>
    ${esc(formData.companyAddress)}<br>
    ${esc(formData.companyCityStateZip)}<br>
    ${esc(formData.companyPhone)}
  </div>
</div>

<!-- CLIENT INFO -->
<table class="client-table">
  <tr>
    <td class="label">Client:</td>
    <td>${esc(formData.clientName)}</td>
    <td class="label">Site Name:</td>
    <td>${esc(formData.siteName)}</td>
    <td class="label">Inspected by:</td>
    <td>${esc(formData.inspectorName || '')}</td>
  </tr>
  <tr>
    <td class="label">Address:</td>
    <td>${esc(formData.clientAddress)}</td>
    <td class="label">Site Address:</td>
    <td>${esc(formData.siteAddress)}</td>
    <td class="label">License #:</td>
    <td>${esc(formData.inspectorLicenseNum || '')}</td>
  </tr>
</table>

<!-- INSPECTION NOTES -->
<div class="section-heading">Inspection Notes:</div>
<div class="notes-box">${esc(formData.inspectionNotes || '')}</div>

<!-- IRRIGATION SYSTEM OVERVIEW -->
<div class="section-heading">Irrigation System Overview:</div>
<div class="cb-row">
  <span>Static Pressure: <strong>${esc(formData.staticPressure || '')}</strong></span>
  <span class="cb-item">
    ${cbBox(formData.backflowInstalled === 'true')} Backflow Installed?
  </span>
  <span class="cb-item">
    ${cbBox(formData.backflowServiceable === 'true')} Backflow Serviceable:
  </span>
  <span class="cb-item">
    ${cbBox(formData.isolationValve === 'true')} Isolation Valve Installed:
  </span>
</div>

<div style="font-size:8pt;margin-bottom:2px;"><strong>System Notes:</strong></div>
<div class="notes-box" style="min-height:18px">${esc(formData.systemNotes || '')}</div>

<!-- BACKFLOWS -->
${backflowsHtml}

<!-- CONTROLLERS -->
${controllersHtml}

<!-- ═══════════════════════════════════════════════════════ PAGE 2 ═══ -->
<div class="page-break"></div>

<!-- ZONE PHOTOS -->
${photosHtml}

<div class="page-footer">
  ${esc(formData.clientName || '')} — ${esc(formData.siteName || '')} — Page 2
</div>

<!-- ═══════════════════════════════════════════════════════ PAGE 3 ═══ -->
<div class="page-break"></div>

<!-- QUOTE DETAIL -->
<div class="section-heading">Quote Detail:</div>
${inspectionNotesRow}

<table class="quote-table">
  <thead>
    <tr>
      <th style="width:25px">#</th>
      <th style="width:70px">Location</th>
      <th>Item \\ Description</th>
      <th style="width:70px">Price</th>
      <th style="width:35px">QTY</th>
      <th style="width:75px">Item Total</th>
    </tr>
  </thead>
  <tbody>
    ${quoteRows}
  </tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="5" style="text-align:right;border:1px solid #93c5fd">Total:</td>
      <td class="amount" style="border:1px solid #93c5fd">$${quoteTotal.toFixed(2)}</td>
    </tr>
  </tfoot>
</table>

<!-- SIGNATURE -->
<div class="signature-block">
  <div style="font-size:8pt;font-weight:bold;margin-bottom:6px;">Authorized Client Signature:</div>
  <div class="sig-line">
    <span class="sig-label">Signature:</span>
    <div class="sig-field"></div>
    <span class="sig-label" style="margin-left:16px">Date:</span>
    <div class="sig-field" style="max-width:120px"></div>
  </div>
  <div class="disclaimer">
    <strong>Note:</strong> this is an estimate and not a final invoice. Additional and/or unforeseen repairs and
    material/labor may be needed to finish completion of project once digging/work has started. The above scope
    of work is satisfactory and accepted. You are authorized to approve the work as specified.
  </div>
</div>

<div class="page-footer">
  ${esc(formData.clientName || '')} — ${esc(formData.siteName || '')} — Page 3
</div>

</body>
</html>`
}
