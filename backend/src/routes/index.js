import express, { Router } from "express";
import { backupRouter } from "./backup.js";
import { rolesRouter } from "./roles.js";
import { settingsRouter } from "./settings.js";

// All JSON endpoints, mounted under /api by app.js.
export function apiRouter(deps) {
  const router = Router();

  // API responses change often and are cached on the server, so browsers shouldn't keep copies.
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  router.use("/backup", backupRouter(deps));
  router.use(express.json({ limit: "100kb" }));
  router.use("/roles", rolesRouter(deps));
  router.use("/settings", settingsRouter(deps));

  return router;
}
