const { validToken, getCookie, COOKIE } = require('../lib/session');

module.exports = (req, res, next) =>
  validToken(getCookie(req, COOKIE)) ? next() : res.status(401).json({ error: 'No autorizado' });
