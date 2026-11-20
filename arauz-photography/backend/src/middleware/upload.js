// Subida de imágenes con multer (en memoria; luego storage decide dónde guardar)
const multer = require('multer');
const cfg = require('../config');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cfg.MAX_UPLOAD_MB * 1024 * 1024, files: cfg.MAX_FILES },
  fileFilter: (req, file, cb) =>
    cb(ALLOWED.includes(file.mimetype) ? null : new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF'), ALLOWED.includes(file.mimetype))
});

module.exports = upload.array('photos', cfg.MAX_FILES);
