const express = require('express');
const path = require('path');
const fs = require('fs');
const cfg = require('./config');
const db = require('./lib/storage'); // inicializa el driver (local o Blob)

// Sitio compilado (React) si existe; si no, solo el panel de administración
const WEB_DIR = fs.existsSync(path.join(cfg.FRONTEND_DIR, 'dist', 'index.html'))
  ? path.join(cfg.FRONTEND_DIR, 'dist')
  : path.join(cfg.FRONTEND_DIR, 'public');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

// Archivos estáticos (en Vercel los sirve su CDN; esto es para local/Railway)
if (db.mode === 'local') app.use('/uploads', express.static(cfg.UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use(express.static(WEB_DIR, { extensions: ['html'] }));

// API
app.get('/api/health', (req, res) => res.json({ ok: true, storage: db.mode, vercel: !!process.env.VERCEL }));
app.use('/api', (req, res, next) => {
  if (process.env.VERCEL && !cfg.USE_BLOB) {
    return res.status(503).json({ error: 'Falta conectar Vercel Blob (variable BLOB_READ_WRITE_TOKEN). Crea un Blob Store en Storage y haz Redeploy.' });
  }
  next();
});
app.use('/api', require('./routes/auth'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api', require('./routes/messages'));

// Páginas
app.get('/admin', (req, res) => res.sendFile(path.join(WEB_DIR, 'admin.html')));
app.get('/healthz', (req, res) => res.send('ok'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error del servidor. Intenta de nuevo.' });
});

module.exports = app;
