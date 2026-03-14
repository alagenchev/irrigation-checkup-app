// ── CONSTANTS ──────────────────────────────────────────────────────────────

const ISSUE_TYPES = [
  'Runoff',
  'Overspray',
  'Lower Head',
  'Raise Head',
  'Obstructions',
  'Adjust Nozzle',
  'Poor Coverage',
  'Replace Valve',
  'Main Line Leak',
  'Pressure Issue',
  'Misaligned Head',
  'Drip Tubing Leak',
  'Replace 4" Popup',
  'Replace 6" Popup',
  'Replace 12" Popup',
  'Replace Solenoid',
  'Zone Not Working',
  'Lateral Pipe Leak',
  'Replace Diaphragm',
  'Replace 1/2" Rotor',
  'Replace 3/4" Rotor',
  'Replace Drip Emitter',
  'Replace Spray Nozzle',
  'Replace Rotator Nozzle',
];

const LANDSCAPE_TYPES = [
  'Full-sun turf',
  'Shade turf',
  'Low demand beds',
  'High demand beds',
  'Trees',
  'Shrubs',
  'Ground cover',
  'Slope',
];

const IRRIGATION_TYPES = [
  'Rotor',
  'MPR spray',
  'Fan spray',
  'Rotator nozzle',
  'Drip',
  'Micro spray',
  'Bubbler',
];

let controllerCount = 0;
let zoneCount = 0;
let backflowCount = 0;
let quoteItemCount = 0;
let zoneNoteCount = 0;

// ── BUILD ISSUE TABLE HEADERS ──────────────────────────────────────────────

function buildIssueHeaders() {
  const headerRow = document.getElementById('issuesHeaderRow');
  ISSUE_TYPES.forEach(issue => {
    const th = document.createElement('th');
    th.className = 'issue-col';
    th.textContent = issue;
    headerRow.appendChild(th);
  });
}

// ── ISSUE TABLE ROWS ───────────────────────────────────────────────────────

function refreshIssueRows() {
  const tbody = document.getElementById('issuesBody');
  tbody.innerHTML = '';

  const zones = getZones();
  zones.forEach(zone => {
    const tr = document.createElement('tr');
    const tdZone = document.createElement('td');
    tdZone.textContent = `Zone ${zone.zoneNum}`;
    tdZone.style.fontWeight = '600';
    tr.appendChild(tdZone);

    ISSUE_TYPES.forEach(issue => {
      const td = document.createElement('td');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.zone = zone.zoneNum;
      cb.dataset.issue = issue;
      td.appendChild(cb);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ── CONTROLLERS ───────────────────────────────────────────────────────────

function addController() {
  controllerCount++;
  const tbody = document.getElementById('controllersBody');
  const tr = document.createElement('tr');
  tr.dataset.ctrlId = controllerCount;
  tr.innerHTML = `
    <td>${controllerCount}</td>
    <td><input type="text" placeholder="e.g. Front of building" data-field="location"></td>
    <td><input type="text" placeholder="Hunter" data-field="manufacturer"></td>
    <td><input type="text" placeholder="Pro-HC" data-field="model"></td>
    <td><input type="text" placeholder="Rain/Freeze" data-field="sensors"></td>
    <td><input type="number" min="0" value="0" data-field="numZones" style="width:60px"></td>
    <td><input type="checkbox" data-field="masterValve"></td>
    <td><input type="text" placeholder="Internal notes" data-field="ctrlNotes"></td>
    <td><button type="button" class="btn btn-danger" onclick="removeRow(this)">✕</button></td>
  `;
  tbody.appendChild(tr);
}

// ── ZONES ─────────────────────────────────────────────────────────────────

function addZone() {
  zoneCount++;
  const num = zoneCount;
  const tbody = document.getElementById('zonesBody');
  const tr = document.createElement('tr');
  tr.dataset.zoneId = num;

  const landscapeOptions = LANDSCAPE_TYPES.map(t => `<option>${t}</option>`).join('');
  const irrigationOptions = IRRIGATION_TYPES.map(t => `<option>${t}</option>`).join('');

  tr.innerHTML = `
    <td><input type="number" value="${num}" min="1" data-field="zoneNum" style="width:55px" onchange="refreshIssueRows()"></td>
    <td>
      <select data-field="controller">
        ${getControllerOptions()}
      </select>
    </td>
    <td><input type="text" placeholder="Description" data-field="description"></td>
    <td>
      <select data-field="landscapeType" multiple style="min-width:130px;height:60px">
        ${landscapeOptions}
      </select>
    </td>
    <td>
      <select data-field="irrigationType" multiple style="min-width:130px;height:60px">
        ${irrigationOptions}
      </select>
    </td>
    <td>
      <input type="file" name="photo_zone_${num}" accept="image/*" multiple data-field="photos" style="font-size:11px;max-width:140px">
    </td>
    <td><button type="button" class="btn btn-danger" onclick="removeZoneRow(this)">✕</button></td>
  `;
  tbody.appendChild(tr);
  refreshIssueRows();
}

function removeZoneRow(btn) {
  btn.closest('tr').remove();
  refreshIssueRows();
}

function getControllerOptions() {
  const rows = document.querySelectorAll('#controllersBody tr');
  if (rows.length === 0) return '<option value="">No controllers</option>';
  let opts = '<option value="">—</option>';
  rows.forEach(r => {
    const locInput = r.querySelector('[data-field="location"]');
    const mfg = r.querySelector('[data-field="manufacturer"]')?.value || '';
    const model = r.querySelector('[data-field="model"]')?.value || '';
    const id = r.dataset.ctrlId;
    const loc = locInput?.value || `Controller ${id}`;
    opts += `<option value="${id}">#${id} - ${mfg} ${model} - ${loc}</option>`;
  });
  return opts;
}

// ── BACKFLOWS ─────────────────────────────────────────────────────────────

function addBackflow() {
  backflowCount++;
  const container = document.getElementById('backflowsContainer');
  const div = document.createElement('div');
  div.className = 'backflow-row';
  div.dataset.bfId = backflowCount;
  div.innerHTML = `
    <span style="font-weight:700;font-size:12px">#${backflowCount}</span>
    <div class="field"><label>Manufacturer</label><input type="text" data-field="bfManufacturer" placeholder="Manufacturer"></div>
    <div class="field"><label>Type</label><input type="text" data-field="bfType" placeholder="Type"></div>
    <div class="field"><label>Model</label><input type="text" data-field="bfModel" placeholder="Model"></div>
    <div class="field"><label>Size (inches)</label><input type="number" data-field="bfSize" step="0.25" placeholder='e.g. 1'></div>
    <button type="button" class="btn btn-danger" onclick="this.closest('.backflow-row').remove()">✕</button>
  `;
  container.appendChild(div);
}

// ── ZONE NOTES ────────────────────────────────────────────────────────────

function addZoneNote() {
  zoneNoteCount++;
  const container = document.getElementById('zoneNotesContainer');
  const div = document.createElement('div');
  div.className = 'zone-note-row';
  div.innerHTML = `
    <div class="field"><label>Zone #</label><input type="number" data-field="noteZone" min="1" placeholder="Zone"></div>
    <div class="field"><label>Zone Description</label><input type="text" data-field="noteZoneDesc" placeholder="Zone description"></div>
    <div class="field"><label>Note</label><textarea data-field="noteText" rows="2" placeholder="Describe the issue..."></textarea></div>
    <button type="button" class="btn btn-danger" style="align-self:end" onclick="this.closest('.zone-note-row').remove()">✕</button>
  `;
  container.appendChild(div);
}

// ── QUOTE ITEMS ───────────────────────────────────────────────────────────

function addQuoteItem() {
  quoteItemCount++;
  const tbody = document.getElementById('quoteBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${tbody.children.length + 1}</td>
    <td><input type="text" placeholder="C1-Z3" data-field="qLocation" style="width:70px"></td>
    <td>
      <input type="text" placeholder="Item name" data-field="qItem">
      <input type="text" placeholder="Description" data-field="qDesc" style="margin-top:2px;font-size:11px;color:#71717a">
    </td>
    <td><input type="number" step="0.01" placeholder="0.00" data-field="qPrice" oninput="updateQuoteTotal()" style="width:80px"></td>
    <td><input type="number" value="1" min="1" data-field="qQty" oninput="updateQuoteTotal()" style="width:55px"></td>
    <td class="qItemTotal">$0.00</td>
    <td><button type="button" class="btn btn-danger" onclick="removeQuoteRow(this)">✕</button></td>
  `;
  tbody.appendChild(tr);
  updateQuoteTotal();
}

function removeQuoteRow(btn) {
  btn.closest('tr').remove();
  // Renumber
  document.querySelectorAll('#quoteBody tr').forEach((tr, i) => {
    tr.cells[0].textContent = i + 1;
  });
  updateQuoteTotal();
}

function updateQuoteTotal() {
  let total = 0;
  document.querySelectorAll('#quoteBody tr').forEach(tr => {
    const price = parseFloat(tr.querySelector('[data-field="qPrice"]')?.value) || 0;
    const qty = parseInt(tr.querySelector('[data-field="qQty"]')?.value) || 1;
    const lineTotal = price * qty;
    total += lineTotal;
    const cell = tr.querySelector('.qItemTotal');
    if (cell) cell.textContent = '$' + lineTotal.toFixed(2);
  });
  document.getElementById('quoteTotal').textContent = '$' + total.toFixed(2);
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function removeRow(btn) {
  btn.closest('tr').remove();
}

function getZones() {
  const rows = document.querySelectorAll('#zonesBody tr');
  return Array.from(rows).map(r => ({
    zoneNum: parseInt(r.querySelector('[data-field="zoneNum"]')?.value) || 0,
  }));
}

function collectControllers() {
  return Array.from(document.querySelectorAll('#controllersBody tr')).map(tr => ({
    id: tr.dataset.ctrlId,
    location: tr.querySelector('[data-field="location"]')?.value || '',
    manufacturer: tr.querySelector('[data-field="manufacturer"]')?.value || '',
    model: tr.querySelector('[data-field="model"]')?.value || '',
    sensors: tr.querySelector('[data-field="sensors"]')?.value || '',
    numZones: tr.querySelector('[data-field="numZones"]')?.value || '0',
    masterValve: tr.querySelector('[data-field="masterValve"]')?.checked || false,
    notes: tr.querySelector('[data-field="ctrlNotes"]')?.value || '',
  }));
}

function collectZones() {
  return Array.from(document.querySelectorAll('#zonesBody tr')).map(tr => {
    const landscapeSel = tr.querySelector('[data-field="landscapeType"]');
    const irrigationSel = tr.querySelector('[data-field="irrigationType"]');
    return {
      zoneNum: tr.querySelector('[data-field="zoneNum"]')?.value || '',
      controller: tr.querySelector('[data-field="controller"]')?.value || '',
      description: tr.querySelector('[data-field="description"]')?.value || '',
      landscapeTypes: Array.from(landscapeSel?.selectedOptions || []).map(o => o.value),
      irrigationTypes: Array.from(irrigationSel?.selectedOptions || []).map(o => o.value),
    };
  });
}

function collectBackflows() {
  return Array.from(document.querySelectorAll('.backflow-row')).map(div => ({
    id: div.dataset.bfId,
    manufacturer: div.querySelector('[data-field="bfManufacturer"]')?.value || '',
    type: div.querySelector('[data-field="bfType"]')?.value || '',
    model: div.querySelector('[data-field="bfModel"]')?.value || '',
    size: div.querySelector('[data-field="bfSize"]')?.value || '0',
  }));
}

function collectZoneIssues() {
  const issues = [];
  document.querySelectorAll('#issuesBody tr').forEach(tr => {
    const zoneNum = tr.cells[0]?.textContent.replace('Zone ', '');
    const checked = [];
    tr.querySelectorAll('input[type=checkbox]:checked').forEach(cb => {
      checked.push(cb.dataset.issue);
    });
    issues.push({ zoneNum, issues: checked });
  });
  return issues;
}

function collectZoneNotes() {
  return Array.from(document.querySelectorAll('.zone-note-row')).map(div => ({
    zoneNum: div.querySelector('[data-field="noteZone"]')?.value || '',
    zoneDesc: div.querySelector('[data-field="noteZoneDesc"]')?.value || '',
    note: div.querySelector('[data-field="noteText"]')?.value || '',
  }));
}

function collectQuoteItems() {
  return Array.from(document.querySelectorAll('#quoteBody tr')).map((tr, i) => ({
    num: i + 1,
    location: tr.querySelector('[data-field="qLocation"]')?.value || '',
    item: tr.querySelector('[data-field="qItem"]')?.value || '',
    description: tr.querySelector('[data-field="qDesc"]')?.value || '',
    price: parseFloat(tr.querySelector('[data-field="qPrice"]')?.value) || 0,
    qty: parseInt(tr.querySelector('[data-field="qQty"]')?.value) || 1,
  }));
}

// ── PDF GENERATION ────────────────────────────────────────────────────────

async function generatePDF() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.add('active');

  try {
    const form = document.getElementById('checkupForm');
    const formData = new FormData(form);

    // Append JSON data
    formData.set('controllers', JSON.stringify(collectControllers()));
    formData.set('zones', JSON.stringify(collectZones()));
    formData.set('backflows', JSON.stringify(collectBackflows()));
    formData.set('zoneIssues', JSON.stringify(collectZoneIssues()));
    formData.set('zoneNotes', JSON.stringify(collectZoneNotes()));
    formData.set('quoteItems', JSON.stringify(collectQuoteItems()));

    const response = await fetch('/generate-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'PDF generation failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkup-report-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error generating PDF: ' + err.message);
  } finally {
    overlay.classList.remove('active');
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  buildIssueHeaders();

  // Wire up PDF buttons
  document.getElementById('createPdfBtn').addEventListener('click', generatePDF);
  document.getElementById('createPdfBtn2').addEventListener('click', generatePDF);

  // Add loading overlay to DOM
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner"></div><span>Generating PDF…</span>';
  document.body.appendChild(overlay);

  // Seed with one controller, two zones, one quote item so the page isn't empty
  addController();
  addZone();
  addZone();
  addQuoteItem();
});
