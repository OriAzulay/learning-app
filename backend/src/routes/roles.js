import { Router } from "express";
import { cacheKeys, invalidateDay } from "../cache.js";
import { notFound } from "../errors.js";
import { validate } from "../middleware/validate.js";
import { sendCached } from "./cached.js";
import { dayParams, itemBody, itemParams, roleParams, weekQuery } from "./schemas.js";

export function rolesRouter({ services, cache }) {
  const router = Router();
  const { roles, days, stats } = services;

  router.get("/", (_req, res) => sendCached(res, cache, cacheKeys.roles(), roles.list));

  // Every /:role route checks the role exists first.
  router.use("/:role", validate({ params: roleParams }), (req, _res, next) => {
    if (!roles.exists(req.valid.params.role)) return next(notFound("Role"));
    next();
  });

  router.get("/:role/stats", (req, res) => {
    const { role } = req.params;
    sendCached(res, cache, cacheKeys.stats(role), () => stats.forRole(role));
  });

  // Week strip: GET /roles/backend/days?from=2026-10-11&to=2026-10-17
  router.get("/:role/days", validate({ query: weekQuery }), (req, res) => {
    const { role } = req.params;
    const { from, to } = req.valid.query;
    sendCached(res, cache, cacheKeys.week(role, from, to), () => ({
      today: days.today(),
      days: days.week(role, from, to),
    }));
  });

  router.get("/:role/days/:date", validate({ params: dayParams }), (req, res) => {
    const { role, date } = req.valid.params;
    sendCached(res, cache, cacheKeys.day(role, date), () => {
      const day = days.getDay(role, date);
      if (!day) throw notFound("Day"); // thrown before caching, so a 404 is never cached
      return day;
    });
  });

  // Opens a day: creates today's questions if needed (idempotent).
  router.post("/:role/days/:date", validate({ params: dayParams }), (req, res) => {
    const { role, date } = req.valid.params;
    const { created, day } = days.openDay(role, date);
    if (created) invalidateDay(cache, role, date);
    res.status(created ? 201 : 200).json(day);
  });

  router.patch(
    "/:role/days/:date/items/:pos",
    validate({ params: itemParams, body: itemBody }),
    (req, res) => {
      const { role, date, pos } = req.valid.params;
      const item = days.saveItem(role, date, pos, req.valid.body);
      invalidateDay(cache, role, date);
      res.json(item);
    },
  );

  router.post(
    "/:role/days/:date/items/:pos/toggle-result",
    validate({ params: itemParams }),
    (req, res) => {
      const { role, date, pos } = req.valid.params;
      const item = days.toggleResult(role, date, pos);
      invalidateDay(cache, role, date);
      res.json(item);
    },
  );

  router.post("/:role/days/:date/submit", validate({ params: dayParams }), (req, res) => {
    const { role, date } = req.valid.params;
    const result = days.submit(role, date);
    invalidateDay(cache, role, date);
    res.json(result);
  });

  router.post("/:role/days/:date/more", validate({ params: dayParams }), (req, res) => {
    const { role, date } = req.valid.params;
    const result = days.addMore(role, date);
    invalidateDay(cache, role, date);
    res.json(result);
  });

  return router;
}
