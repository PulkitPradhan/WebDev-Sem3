function notFound(req, res, next) {
  const error = new Error('Route not found: ' + req.method + ' ' + req.originalUrl);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  let status = error.statusCode || error.status || 500;
  let message = error.message || 'Internal server error';
  let details;
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid resource identifier';
  } else if (error.code === 11000) {
    status = 409;
    message = 'A record with this value already exists';
    details = error.keyValue;
  }
  if (status >= 500) {
    console.error(error);
    status = 500;
    message = 'Internal server error';
    details = undefined;
  }
  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } });
}
module.exports = { notFound, errorHandler };
