import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Ensure uploads directory exists at project root: jarvis-os-ai/server/../uploads
const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

// Multer storage: keep original filename with a timestamp prefix
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsRoot);
  },
  filename: function (_req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const stamped = `${Date.now()}_${safe}`;
    cb(null, stamped);
  },
});

const upload = multer({ storage });

// CORS for local vite dev server
app.use(
  cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
    methods: ['POST', 'GET'],
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
  <html>
    <head><meta charset="utf-8"><title>Jarvis Upload Server</title>
    <style>body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0b0f14;color:#e6edf3;padding:32px}a{color:#61dafb}</style>
    </head>
    <body>
      <h1>Jarvis Upload Server</h1>
      <p>Server is running. POST files to <code>/api/upload</code>.</p>
      <p>Health check: <a href="/api/health">/api/health</a></p>
      <p>Browse uploads: <a href="/uploads/">/uploads/</a></p>
    </body>
  </html>`);
});

app.post('/api/upload', upload.array('files', 20), (req, res) => {
  const files = (req.files || []).map((f) => ({
    originalName: f.originalname,
    mimeType: f.mimetype,
    size: f.size,
    savedAs: path.basename(f.path),
    url: `/uploads/${path.basename(f.path)}`,
  }));
  res.json({ uploaded: files });
});

// Simple directory listing for uploads
app.get('/uploads/', (_req, res) => {
  fs.readdir(uploadsRoot, (err, items) => {
    if (err) return res.status(500).send('Error reading uploads');
    const list = items
      .filter((n) => !n.startsWith('.'))
      .map((n) => `<li><a href="/uploads/${encodeURIComponent(n)}">${n}</a></li>`) 
      .join('');
    res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Uploads</title>
      <style>body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#0b0f14;color:#e6edf3;padding:32px}a{color:#61dafb}</style>
      </head><body><h1>Uploads</h1><ul>${list || '<li><em>No files yet</em></li>'}</ul></body></html>`);
  });
});

// Serve uploaded files statically for quick testing
app.use('/uploads', express.static(uploadsRoot));

app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`);
});
