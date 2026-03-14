const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

const app = express();
const PORT = 3000;

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Serve the main form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'form.html'));
});

// Generate PDF
app.post('/generate-pdf', upload.array('zonePhotos'), async (req, res) => {
  try {
    const formData = req.body;
    const uploadedFiles = req.files || [];

    // Parse JSON fields
    const zones = JSON.parse(formData.zones || '[]');
    const zoneIssues = JSON.parse(formData.zoneIssues || '[]');
    const zoneNotes = JSON.parse(formData.zoneNotes || '[]');
    const quoteItems = JSON.parse(formData.quoteItems || '[]');
    const controllers = JSON.parse(formData.controllers || '[]');
    const backflows = JSON.parse(formData.backflows || '[]');

    // Convert uploaded photos to base64
    const photoMap = {};
    for (const file of uploadedFiles) {
      const data = fs.readFileSync(file.path);
      const b64 = `data:${file.mimetype};base64,${data.toString('base64')}`;
      const fieldname = file.fieldname; // e.g. "photo_zone_2_0"
      if (!photoMap[fieldname]) photoMap[fieldname] = [];
      photoMap[fieldname].push(b64);
      // Clean up temp file
      fs.unlinkSync(file.path);
    }

    // Read logo as base64
    const logoPath = path.join(__dirname, 'public', 'logo.png');
    const logoB64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
      : '';

    // Render the PDF HTML template
    const templatePath = path.join(__dirname, 'views', 'pdf-template.ejs');
    const html = await ejs.renderFile(templatePath, {
      formData,
      zones,
      zoneIssues,
      zoneNotes,
      quoteItems,
      controllers,
      backflows,
      photoMap,
      logoB64,
    });

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
    });

    await browser.close();

    // Send PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="checkup-report-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Irrigation Checkup app running at http://localhost:${PORT}`);
});
