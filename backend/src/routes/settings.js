import { Router } from "express";
import { cacheKeys } from "../cache.js";
import { validate } from "../middleware/validate.js";
import { sendCached } from "./cached.js";
import { settingsBody } from "./schemas.js";

export function settingsRouter({ services, cache }) {
  const router = Router();

  router.get("/", (_req, res) =>
    sendCached(res, cache, cacheKeys.settings(), services.settings.get),
  );

  router.patch("/", validate({ body: settingsBody }), (req, res) => {
    const settings = services.settings.update(req.valid.body);
    cache.delete(cacheKeys.settings());
    res.json(settings);
  });

  return router;
}
