// Configuración central (lee variables de entorno)
const path = require('path');
const crypto = require('crypto');

const BACKEND_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(BACKEND_DIR, 'data'));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'arauz2026';
const SESSION_SECRET = process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update('arauz-' + ADMIN_PASSWORD).digest('hex');

// Token de Vercel Blob: acepta el nombre estándar o cualquiera que termine en READ_WRITE_TOKEN
// (Vercel agrega un prefijo si lo eliges al conectar la tienda, p. ej. BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN)
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN ||
  process.env[Object.keys(process.env).find(k => k.endsWith('READ_WRITE_TOKEN') && process.env[k]) || ''] || '';

module.exports = {
  PORT: process.env.PORT || 3000,
  FRONTEND_DIR: path.resolve(BACKEND_DIR, '..', 'frontend'),
  // Si existe el token de Vercel Blob, fotos y datos se guardan en Blob (Vercel).
  // Si no, se guardan en disco (local / Railway con Volume).
  BLOB_TOKEN,
  USE_BLOB: !!BLOB_TOKEN,
  DATA_DIR,
  UPLOAD_DIR: path.join(DATA_DIR, 'uploads'),
  ADMIN_PASSWORD,
  usingDefaultPassword: !process.env.ADMIN_PASSWORD,
  SESSION_SECRET,
  SESSION_DAYS: 7,
  MAX_UPLOAD_MB: 30,
  MAX_FILES: 30
};
