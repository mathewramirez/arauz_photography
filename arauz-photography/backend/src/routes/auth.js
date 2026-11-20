const router = require('express').Router();
const crypto = require('crypto');
const cfg = require('../config');
const { makeToken, validToken, getCookie, COOKIE } = require('../lib/session');

// límite simple de intentos por IP (8 cada 15 min)
const attempts = new Map();
const blocked = (ip) => {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
  attempts.set(ip, list);
  return list.length >= 8;
};

router.post('/login', (req, res) => {
  if (blocked(req.ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  const given = Buffer.from(String(req.body.password || ''));
  const real = Buffer.from(cfg.ADMIN_PASSWORD);
  if (!(given.length === real.length && crypto.timingSafeEqual(given, real))) {
    attempts.get(req.ip).push(Date.now());
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(makeToken())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${cfg.SESSION_DAYS * 86400}${secure}`);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

router.get('/me', (req, res) => res.json({ admin: validToken(getCookie(req, COOKIE)) }));

module.exports = router;
