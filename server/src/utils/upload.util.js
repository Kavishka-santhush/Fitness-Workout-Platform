/**
 * Multer local file uploads — no cloud storage.
 * Files land in /uploads/<bucket>/ with unique names and are served
 * statically by app.js at /uploads/* (with HLS-friendly range support).
 */
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { nanoid } = require('nanoid');
const { badRequest } = require('./response.util');

const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
const MAX_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10)) * 1024 * 1024;

const BUCKETS = {
  avatars: { exts: ['jpg', 'jpeg', 'png', 'webp'], imageOnly: true },
  progressPhotos: { exts: ['jpg', 'jpeg', 'png', 'webp'], imageOnly: true },
  exerciseVideos: { exts: ['mp4', 'webm', 'mov'], maxBytes: MAX_BYTES },
  exerciseImages: { exts: ['jpg', 'jpeg', 'png', 'webp'] },
  workoutThumbnails: { exts: ['jpg', 'jpeg', 'png', 'webp'] },
  programCovers: { exts: ['jpg', 'jpeg', 'png', 'webp'] },
  programTrailers: { exts: ['mp4', 'webm', 'mov'], maxBytes: MAX_BYTES },
  classRecordings: { exts: ['mp4', 'webm', 'ts', 'm3u8'], maxBytes: MAX_BYTES },
  certificates: { exts: ['pdf'] },
  certifications: { exts: ['pdf', 'jpg', 'jpeg', 'png'] },
  wearableCsv: { exts: ['csv'] },
  messages: { exts: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'pdf'] },
};

for (const bucket of Object.keys(BUCKETS)) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, bucket), { recursive: true });
}

const makeStorage = (bucket) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, bucket)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      cb(null, `${Date.now()}-${nanoid(10)}.${ext}`);
    },
  });

const fileFilterFor = (bucket) => (req, file, cb) => {
  const cfg = BUCKETS[bucket];
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (!cfg.exts.includes(ext)) {
    return cb(badRequest(`File type .${ext} not allowed for ${bucket}. Allowed: ${cfg.exts.join(', ')}`));
  }
  cb(null, true);
};

/** uploadSingle('avatars', 'photo') → req.file */
const uploadSingle = (bucket, field = 'file') =>
  multer({
    storage: makeStorage(bucket),
    fileFilter: fileFilterFor(bucket),
    limits: { fileSize: BUCKETS[bucket].maxBytes || 20 * 1024 * 1024 },
  }).single(field);

/** uploadMultiple('exerciseImages', 'images', 8) → req.files */
const uploadMultiple = (bucket, field = 'files', max = 10) =>
  multer({
    storage: makeStorage(bucket),
    fileFilter: fileFilterFor(bucket),
    limits: { fileSize: BUCKETS[bucket].maxBytes || 20 * 1024 * 1024, files: max },
  }).array(field, max);

/** Public URL for a stored file. */
const publicUrl = (bucket, filename) => `/uploads/${bucket}/${filename}`;

/**
 * uploadFields([{ name:'video', bucket:'exerciseVideos', max:1 },
 *                 { name:'images', bucket:'exerciseImages', max:8 }])
 * → req.files = { video: [File], images: [File...] } with per-field bucket storage.
 */
const uploadFields = (specs) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, specs.find((s) => s.name === file.fieldname).bucket)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      cb(null, `${Date.now()}-${nanoid(10)}.${ext}`);
    },
  });
  const limits = { fileSize: MAX_BYTES, files: specs.reduce((n, s) => n + (s.max || 1), 0) };
  const handler = multer({
    storage,
    limits,
    fileFilter: (req, file, cb) => {
      const spec = specs.find((s) => s.name === file.fieldname);
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      if (!spec || !BUCKETS[spec.bucket].exts.includes(ext)) {
        return cb(badRequest(`File type .${ext} not allowed for field ${file.fieldname}`));
      }
      cb(null, true);
    },
  }).fields(specs.map((s) => ({ name: s.name, maxCount: s.max || 1 })));
  return handler;
};

module.exports = { uploadSingle, uploadMultiple, uploadFields, publicUrl, UPLOAD_ROOT, BUCKETS };
