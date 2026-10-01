/**
 * API response helpers — standard envelope used by every controller.
 * { success, data?, meta?, message?, errors? }
 */
exports.ok = (res, data, message = undefined, meta = undefined) =>
  res.status(200).json({ success: true, message, data, meta });

exports.created = (res, data, message = 'Created successfully') =>
  res.status(201).json({ success: true, message, data });

exports.noContent = (res) => res.status(204).send();

exports.paginated = (res, items, { page, limit, total }) =>
  res.status(200).json({
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page * limit < total,
    },
  });

exports.fail = (res, status = 400, message = 'Bad request', errors = undefined) =>
  res.status(status).json({ success: false, message, errors });

class ApiError extends Error {
  constructor(status, message, errors = undefined) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

exports.ApiError = ApiError;
exports.badRequest = (msg = 'Bad request', errors) => new ApiError(400, msg, errors);
exports.unauthorized = (msg = 'Unauthorized') => new ApiError(401, msg);
exports.forbidden = (msg = 'Forbidden') => new ApiError(403, msg);
exports.notFound = (msg = 'Resource not found') => new ApiError(404, msg);
exports.conflict = (msg = 'Conflict') => new ApiError(409, msg);
exports.tooMany = (msg = 'Too many requests') => new ApiError(429, msg);
