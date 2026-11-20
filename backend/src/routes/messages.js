const router = require('express').Router();
const crypto = require('crypto');
const db = require('../lib/storage');
const wrap = require('../lib/wrap');
const requireAdmin = require('../middleware/requireAdmin');

// Público: formulario de contacto
router.post('/contact', wrap(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 100);
  const contact = String(b.contact || '').trim().slice(0, 120);
  const message = String(b.message || '').trim().slice(0, 3000);
  if (!name || !contact || !message) return res.status(400).json({ error: 'Completa nombre, contacto y mensaje.' });
  if (b.website) return res.json({ ok: true }); // honeypot anti-spam
  const msgs = await db.getMessages();
  msgs.unshift({
    id: crypto.randomBytes(6).toString('hex'),
    name, contact, message,
    type: String(b.type || '').slice(0, 60),
    date: String(b.date || '').slice(0, 40),
    createdAt: new Date().toISOString(),
    read: false
  });
  await db.saveMessages(msgs.slice(0, 500));
  res.json({ ok: true });
}));

// Admin
router.get('/messages', requireAdmin, wrap(async (req, res) => res.json(await db.getMessages())));

router.patch('/messages/:id', requireAdmin, wrap(async (req, res) => {
  const msgs = await db.getMessages();
  const m = msgs.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'No encontrado' });
  m.read = !!req.body.read;
  await db.saveMessages(msgs);
  res.json(m);
}));

router.delete('/messages/:id', requireAdmin, wrap(async (req, res) => {
  await db.saveMessages((await db.getMessages()).filter(x => x.id !== req.params.id));
  res.json({ ok: true });
}));

module.exports = router;
