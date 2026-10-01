/**
 * Multipart helpers: FormData sends every field as a string; coerce the ones
 * Prisma expects as arrays/objects before validation.
 */
const ARRAY_FIELDS = new Set([
  'primaryMuscles', 'secondaryMuscles', 'equipment', 'tips', 'commonMistakes',
  'preferredTypes', 'injuries', 'tags', 'targetMuscles', 'allergies', 'languages',
  'specializations', 'categories', 'mentions', 'hashtags',
]);
const JSON_FIELDS = new Set(['instructions', 'variations', 'musclesDiagram', 'configuration', 'criteria', 'laps', 'hrZones', 'details', 'measurements']);

function coerceMultipart(req, extraArrayFields = [], extraJsonFields = []) {
  for (const key of [...ARRAY_FIELDS, ...extraArrayFields]) {
    const v = req.body?.[key];
    if (typeof v === 'string' && !Array.isArray(v)) {
      req.body[key] = v.startsWith('[') ? JSON.parse(v) : v.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  for (const key of [...JSON_FIELDS, ...extraJsonFields]) {
    const v = req.body?.[key];
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { req.body[key] = JSON.parse(v); } catch { /* leave as-is */ }
    }
  }
}

module.exports = { coerceMultipart };
