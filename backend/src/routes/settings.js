const router = require('express').Router();
const db = require('../lib/storage');
const wrap = require('../lib/wrap');
const requireAdmin = require('../middleware/requireAdmin');
const cache = require('../lib/cache');

router.get('/', wrap(async (req, res) => { cache(req, res); res.json(await db.getSettings()); }));

router.put('/', requireAdmin, wrap(async (req, res) => {
  const b = req.body || {};
  const s = await db.getSettings();
  for (const k of ['tagline', 'about', 'email', 'whatsapp', 'instagram', 'facebook', 'location']) {
    if (typeof b[k] === 'string') s[k] = b[k].slice(0, 1000).trim();
  }
  if (Array.isArray(b.categories)) {
    s.categories = [...new Set(b.categories.map(c => String(c).trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
  }
  // Enlaces a álbumes completos (Drive u otro) por categoría: solo http/https
  if (b.albums && typeof b.albums === 'object') {
    const out = {};
    for (const c of s.categories) {
      try {
        const u = new URL(String(b.albums[c] || '').trim().slice(0, 300));
        if (u.protocol === 'https:' || u.protocol === 'http:') out[c] = u.href;
      } catch { /* vacío o inválido: se ignora */ }
    }
    s.albums = out;
  }
  await db.saveSettings(s);
  res.json(s);
}));

module.exports = router;
