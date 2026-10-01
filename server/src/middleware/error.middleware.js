const logger = require('../utils/logger.util');
const { ApiError } = require('../utils/response.util');

/** 404 handler for unknown routes. */
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/** Central error handler — maps known error shapes to HTTP responses. */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  // Prisma known errors
  if (err.code === 'P2002') {
    status = 409;
    message = `Duplicate value for field(s): ${err.meta?.target?.join(', ')}`;
  } else if (err.code === 'P2025') {
    status = 404;
    message = 'Record not found';
  } else if (err.code === 'P2003') {
    status = 400;
    message = 'Invalid reference (foreign key constraint)';
  }

  // Multer upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = `File too large (max ${process.env.MAX_FILE_SIZE_MB || 500}MB)`;
  }

  // Stripe errors
  if (err.type === 'StripeCardError' || err.type === 'StripeInvalidRequestError') {
    status = 400;
    message = err.raw?.message || message;
  }

  if (status >= 500) logger.error(err.stack || err.message, { path: req.originalUrl });
  else logger.warn(`${status} ${message}`, { path: req.originalUrl });

  res.status(status).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: err.stack }),
  });
};

module.exports = { notFoundHandler, errorHandler };
