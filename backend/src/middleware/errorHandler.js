import { HttpError } from "../errors.js";

export function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, "Not found"));
}

// The one place errors turn into responses. The client only ever sees a status
// and a short message; stack traces and internal details stay in the server log.
export function createErrorHandler({ logger = console } = {}) {
  // Express recognizes an error handler by its 4 arguments, so `_next` must stay.
  return (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      const body = { error: err.message };
      if (err.details) body.details = err.details;
      return res.status(err.status).json(body);
    }
    // Errors from express.json(): malformed or too large bodies.
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "Malformed JSON" });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request body too large" });

    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  };
}
