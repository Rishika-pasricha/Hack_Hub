const crypto = require('crypto');

function generateRequestId() {
  try {
    return crypto.randomUUID();
  } catch (_err) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function attachRequestContext(req, res, next) {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('x-request-id', req.requestId);

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    const shouldAttachRequestId =
      res.statusCode >= 400 &&
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      !Object.prototype.hasOwnProperty.call(payload, 'requestId');

    if (!shouldAttachRequestId) {
      return originalJson(payload);
    }

    return originalJson({ ...payload, requestId: req.requestId });
  };

  next();
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  const status = Number(err?.status || err?.statusCode || 500);
  const safeStatus = Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
  const publicMessage = safeStatus >= 500 ? 'Internal server error' : String(err?.message || 'Request failed');

  const debug = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status: safeStatus,
    message: err?.message,
    stack: err?.stack
  };
  console.error('[api-error]', debug);

  res.status(safeStatus).json({ error: publicMessage });
}

module.exports = {
  attachRequestContext,
  notFoundHandler,
  errorHandler
};
