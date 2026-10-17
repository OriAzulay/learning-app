// An error that is safe to show to the client: a status code and a short message.
// Anything else that is thrown becomes a generic 500 (see middleware/errorHandler.js).
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what) => new HttpError(404, `${what} not found`);
