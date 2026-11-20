// Almacenamiento con dos "drivers":
//   - local: archivos en disco (tu PC, o Railway con Volume)
//   - blob : Vercel Blob (Vercel, donde el disco no es persistente)
// El resto del código usa solo esta interfaz (todo async).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cfg = require('../config');

const DEFAULT_SETTINGS = {
  tagline: 'Fotografía que guarda lo que importa',
  about: 'Somos un estudio de fotografía dedicado a capturar momentos reales: bodas, retratos, familias y eventos. Cada sesión es una colaboración para que te veas y te sientas tú.',
  email: '', whatsapp: '', instagram: '', facebook: '',
  location: 'Costa Rica',
  categories: ['Bodas', 'Retratos', 'Familia', 'Eventos', 'Comercial']
};

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const rand = (n) => crypto.randomBytes(n).toString('hex');

// ---------------- driver local ----------------
function localDriver() {
  fs.mkdirSync(cfg.UPLOAD_DIR, { recursive: true });
  const file = (name) => path.join(cfg.DATA_DIR, name + '.json');
  return {
    async readJSON(name, fallback) {
      try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; }
    },
    async writeJSON(name, data) {
      const tmp = file(name) + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, file(name));
    },
    async saveImage(buffer, mimetype) {
      const filename = rand(10) + EXT[mimetype];
      fs.writeFileSync(path.join(cfg.UPLOAD_DIR, filename), buffer);
      return { file: filename, url: '/uploads/' + filename };
    },
    async deleteImage(photo) {
      fs.unlink(path.join(cfg.UPLOAD_DIR, path.basename(photo.file)), () => {});
    }
  };
}

// ---------------- driver Vercel Blob ----------------
function blobDriver() {
  const { put, get, del } = require('@vercel/blob');
  // El archivo de mensajes lleva un nombre difícil de adivinar (contiene datos de clientes)
  const secretName = (name) => name === 'messages'
    ? `messages-${crypto.createHmac('sha256', cfg.SESSION_SECRET).update('messages').digest('hex').slice(0, 24)}`
    : name;
  return {
    async readJSON(name, fallback) {
      try {
        const r = await get(`data/${secretName(name)}.json`, { access: 'public', useCache: false });
        if (!r || !r.stream) return fallback;
        return JSON.parse(await new Response(r.stream).text());
      } catch { return fallback; }
    },
    async writeJSON(name, data) {
      await put(`data/${secretName(name)}.json`, JSON.stringify(data), {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        contentType: 'application/json', cacheControlMaxAge: 60
      });
    },
    async saveImage(buffer, mimetype) {
      const blob = await put(`photos/${rand(8)}${EXT[mimetype]}`, buffer, {
        access: 'public', addRandomSuffix: true, contentType: mimetype
      });
      return { file: blob.pathname, url: blob.url };
    },
    async deleteImage(photo) {
      try { await del(photo.url); } catch { /* ya no existe */ }
    }
  };
}

const driver = cfg.USE_BLOB ? blobDriver() : localDriver();

module.exports = {
  mode: cfg.USE_BLOB ? 'blob' : 'local',
  getPhotos: () => driver.readJSON('photos', []),
  savePhotos: (d) => driver.writeJSON('photos', d),
  getMessages: () => driver.readJSON('messages', []),
  saveMessages: (d) => driver.writeJSON('messages', d),
  getSettings: async () => ({ ...DEFAULT_SETTINGS, ...(await driver.readJSON('settings', {})) }),
  saveSettings: (d) => driver.writeJSON('settings', d),
  saveImage: (buffer, mimetype) => driver.saveImage(buffer, mimetype),
  deleteImage: (photo) => driver.deleteImage(photo)
};
