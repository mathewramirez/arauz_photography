// Sesión de administrador con cookie firmada (HMAC)
const crypto = require('crypto');
const cfg = require('../config');

const sign = (s) => crypto.createHmac('sha256', cfg.SESSION_SECRET).update(s).digest('hex');

function makeToken() {
  const exp = Date.now() + cfg.SESSION_DAYS * 24 * 3600 * 1000;
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

module.exports = { makeToken, validToken, getCookie, COOKIE: 'arauz_session' };
