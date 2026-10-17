import express, { Router } from "express";
import { validate } from "../middleware/validate.js";
import { backupBody } from "./schemas.js";

export function backupRouter({ services, cache }) {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(services.backup.exportAll());
  });

  // A backup can be much bigger than a normal request, so only this route
  // gets a larger body limit.
  router.post("/", express.json({ limit: "5mb" }), validate({ body: backupBody }), (req, res) => {
    const summary = services.backup.importAll(req.valid.body);
    cache.clear(); // everything may have changed
    res.json(summary);
  });

  return router;
}
