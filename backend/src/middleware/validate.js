import { HttpError } from "../errors.js";

// validate({ params, query, body }) checks each part with a zod schema.
// Bad input becomes a 400; the parsed (and type-coerced) values go to req.valid.
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {};
    for (const part of ["params", "query", "body"]) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          path: [part, ...i.path].join("."),
          message: i.message,
        }));
        return next(new HttpError(400, "Invalid request", details));
      }
      req.valid[part] = result.data;
    }
    next();
  };
}
