// Cabeceras de caché para las respuestas públicas (ahorra lecturas de Vercel Blob)
const cfg = require('../config');

module.exports = (req, res) => {
  if (req.query.fresh) res.set('Cache-Control', 'no-store');            // el panel pide datos frescos
  else if (cfg.USE_BLOB) res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
};
