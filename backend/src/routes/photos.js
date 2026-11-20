const router = require('express').Router();
const crypto = require('crypto');
const db = require('../lib/storage');
const wrap = require('../lib/wrap');
const requireAdmin = require('../middleware/requireAdmin');
const upload = require('../middleware/upload');

// Público: listar fotos (?category=Bodas)
router.get('/', wrap(async (req, res) => {
  let photos = await db.getPhotos();
  if (req.query.category) photos = photos.filter(p => p.category === req.query.category);
  res.json(photos);
}));

// Admin: subir una o varias fotos
router.post('/', requireAdmin, (req, res, next) => {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    (async () => {
      const category = String(req.body.category || 'General').trim().slice(0, 40) || 'General';
      const title = String(req.body.title || '').trim().slice(0, 120);
      const added = [];
      for (const f of req.files || []) {
        const saved = await db.saveImage(f.buffer, f.mimetype);
        added.push({
          id: crypto.randomBytes(6).toString('hex'),
          file: saved.file, url: saved.url,
          title, category, featured: false,
          createdAt: new Date().toISOString()
        });
      }
      const photos = await db.getPhotos();
      photos.unshift(...added);
      await db.savePhotos(photos);
      res.json({ added });
    })().catch(next);
  });
});

// Admin: editar título / categoría / portada
router.patch('/:id', requireAdmin, wrap(async (req, res) => {
  const photos = await db.getPhotos();
  const p = photos.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrada' });
  const b = req.body || {};
  if (typeof b.title === 'string') p.title = b.title.trim().slice(0, 120);
  if (typeof b.category === 'string') p.category = b.category.trim().slice(0, 40) || p.category;
  if (typeof b.featured === 'boolean') p.featured = b.featured;
  await db.savePhotos(photos);
  res.json(p);
}));

// Admin: eliminar
router.delete('/:id', requireAdmin, wrap(async (req, res) => {
  const photos = await db.getPhotos();
  const i = photos.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'No encontrada' });
  const [p] = photos.splice(i, 1);
  await db.savePhotos(photos);
  await db.deleteImage(p);
  res.json({ ok: true });
}));

module.exports = router;
