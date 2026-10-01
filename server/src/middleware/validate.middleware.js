const { z } = require('zod');
const { badRequest } = require('../utils/response.util');

/**
 * Validate request parts against zod schemas.
 * Usage: router.post('/', validate({ body: schema }), controller.create)
 * Parsed values replace the originals (so coerced numbers/dates are used).
 */
const validate = ({ body, query, params } = {}) => (req, res, next) => {
  try {
    if (params) req.params = params.parse(req.params);
    if (query) req.query = query.parse(req.query);
    if (body) req.body = body.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(badRequest('Validation failed', err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }))));
    }
    next(err);
  }
};

/* ---------- Shared schema fragments ---------- */

const uuid = z.string().min(1);
const idParam = z.object({ id: uuid });
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const dateISO = z.string().datetime({ offset: true }).or(z.string());

module.exports = { validate, uuid, idParam, pagination, dateStr, dateISO };
