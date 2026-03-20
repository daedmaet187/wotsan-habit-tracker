/**
 * Centralized error handler.
 * Catches anything thrown from async route handlers (express-async-errors patches those).
 * Never leaks raw error messages in production.
 */
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  console.error('[error]', err);

  res.status(status).json({
    error: isProd && status === 500 ? 'Internal server error' : (err.message || 'Internal server error'),
  });
}
