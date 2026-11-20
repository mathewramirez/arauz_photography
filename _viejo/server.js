// Arauz Photography — servidor (Express)
// Variables de entorno:
//   PORT            (Railway la define sola)
//   ADMIN_PASSWORD  contraseña del panel /admin
//   SESSION_SECRET  texto largo aleatorio para firmar la sesión
//   DATA_DIR        carpeta donde se guardan fotos y datos (en Railway: ruta del Volume, ej. /data)

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arauz2026';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('arauz-' + ADMIN_PASSWORD).digest('hex');
if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  ADMIN_PASSWORD no está definida. Usando contraseña temporal "arauz2026". Cámbiala en Railway > Variables.');
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- almacenamiento simple en JSON ----------
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}
const DEFAULT_SETTINGS = {
  tagline: 'Fotografía que guarda lo que importa',
  about: 'Somos un estudio de fotografía dedicado a capturar momentos reales: bodas, retratos, familias y eventos. Cada sesión es una colaboración para que te veas y te sientas tú.',
  email: '',
  whatsapp: '',
  instagram: '',
  facebook: '',
  location: 'Costa Rica',
  categories: ['Bodas', 'Retratos', 'Familia', 'Eventos', 'Comercial']
};
const getSettings = () => ({ ...DEFAULT_SETTINGS, ...readJSON(SETTINGS_FILE, {}) });

// ---------- sesión por cookie firmada ----------
const sign = (s) => crypto.createHmac('sha256', SESSION_SECRET).update(s).digest('hex');
function makeToken() {
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  return `${exp}.${sign(String(exp))}`;
}
function validToken(tok) {
  if (!tok) return false;
  const [exp, sig] = tok.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
function getCookie(req, name) {
  const m = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
const requireAdmin = (req, res, next) =>
  validToken(getCookie(req, 'arauz_session')) ? next() : res.status(401).json({ error: 'No autorizado' });

// límite simple de intentos de login
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  attempts.set(ip, list);
  return list.length >= 8;
}

// ---------- app ----------
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// --- auth ---
app.post('/api/login', (req, res) => {
  const ip = req.ip;
  if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  const given = Buffer.from(String(req.body.password || ''));
  const real = Buffer.from(ADMIN_PASSWORD);
  const ok = given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) {
    attempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `arauz_session=${encodeURIComponent(makeToken())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 3600}${secure}`);
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'arauz_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/me', (req, res) => res.json({ admin: validToken(getCookie(req, 'arauz_session')) }));

// --- ajustes ---
app.get('/api/settings', (req, res) => res.json(getSettings()));
app.put('/api/settings', requireAdmin, (req, res) => {
  const b = req.body || {};
  const s = getSettings();
  for (const k of ['tagline', 'about', 'email', 'whatsapp', 'instagram', 'facebook', 'location']) {
    if (typeof b[k] === 'string') s[k] = b[k].slice(0, 1000).trim();
  }
  if (Array.isArray(b.categories)) {
    s.categories = [...new Set(b.categories.map(c => String(c).trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
  }
  writeJSON(SETTINGS_FILE, s);
  res.json(s);
});

// --- fotos ---
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(10).toString('hex') + ALLOWED[file.mimetype])
  }),
  limits: { fileSize: 30 * 1024 * 1024, files: 30 },
  fileFilter: (req, file, cb) => cb(ALLOWED[file.mimetype] ? null : new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF'), !!ALLOWED[file.mimetype])
});

app.get('/api/photos', (req, res) => {
  let photos = readJSON(PHOTOS_FILE, []);
  if (req.query.category) photos = photos.filter(p => p.category === req.query.category);
  res.json(photos);
});

app.post('/api/photos', requireAdmin, (req, res) => {
  upload.array('photos', 30)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const photos = readJSON(PHOTOS_FILE, []);
    const category = String(req.body.category || 'General').trim().slice(0, 40) || 'General';
    const added = (req.files || []).map(f => ({
      id: crypto.randomBytes(6).toString('hex'),
      file: f.filename,
      url: '/uploads/' + f.filename,
      title: String(req.body.title || '').trim().slice(0, 120),
      category,
      featured: false,
      createdAt: new Date().toISOString()
    }));
    photos.unshift(...added);
    writeJSON(PHOTOS_FILE, photos);
    res.json({ added });
  });
});

app.patch('/api/photos/:id', requireAdmin, (req, res) => {
  const photos = readJSON(PHOTOS_FILE, []);
  const p = photos.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  const b = req.body || {};
  if (typeof b.title === 'string') p.title = b.title.trim().slice(0, 120);
  if (typeof b.category === 'string') p.category = b.category.trim().slice(0, 40) || p.category;
  if (typeof b.featured === 'boolean') p.featured = b.featured;
  writeJSON(PHOTOS_FILE, photos);
  res.json(p);
});

app.delete('/api/photos/:id', requireAdmin, (req, res) => {
  const photos = readJSON(PHOTOS_FILE, []);
  const i = photos.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'No encontrada' });
  const [p] = photos.splice(i, 1);
  writeJSON(PHOTOS_FILE, photos);
  fs.unlink(path.join(UPLOAD_DIR, path.basename(p.file)), () => {});
  res.json({ ok: true });
});

// --- mensajes de contacto ---
app.post('/api/contact', (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 100);
  const contact = String(b.contact || '').trim().slice(0, 120);
  const message = String(b.message || '').trim().slice(0, 3000);
  if (!name || !contact || !message) return res.status(400).json({ error: 'Completa nombre, contacto y mensaje.' });
  if (b.website) return res.json({ ok: true }); // honeypot anti-spam
  const msgs = readJSON(MESSAGES_FILE, []);
  msgs.unshift({
    id: crypto.randomBytes(6).toString('hex'),
    name, contact, message,
    type: String(b.type || '').slice(0, 60),
    date: String(b.date || '').slice(0, 40),
    createdAt: new Date().toISOString(),
    read: false
  });
  writeJSON(MESSAGES_FILE, msgs.slice(0, 500));
  res.json({ ok: true });
});
app.get('/api/messages', requireAdmin, (req, res) => res.json(readJSON(MESSAGES_FILE, [])));
app.patch('/api/messages/:id', requireAdmin, (req, res) => {
  const msgs = readJSON(MESSAGES_FILE, []);
  const m = msgs.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'No encontrado' });
  m.read = !!req.body.read;
  writeJSON(MESSAGES_FILE, msgs);
  res.json(m);
});
app.delete('/api/messages/:id', requireAdmin, (req, res) => {
  writeJSON(MESSAGES_FILE, readJSON(MESSAGES_FILE, []).filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/healthz', (req, res) => res.send('ok'));

app.listen(PORT, () => console.log(`Arauz Photography escuchando en http://localhost:${PORT}  (datos en ${DATA_DIR})`));
