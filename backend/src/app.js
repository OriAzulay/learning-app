import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createCache } from "./cache.js";
import { createErrorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";
import { createServices } from "./services/index.js";

// Builds the Express app without starting it, so tests can drive it with supertest.
export function createApp({ db, config, now, rng, logger = console }) {
  const app = express();
  const services = createServices(db, { now, rng });
  const cache = createCache({ ttl: config.cacheTtlMs });

  // Security headers. The page loads the Heebo font from Google Fonts and uses an
  // inline SVG (data:) favicon, so those two sources are allowed.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "style-src": ["'self'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:"],
          // The app is served over plain HTTP (no TLS here), e.g. to a phone on the
          // same network, so don't tell browsers to rewrite requests to https.
          "upgrade-insecure-requests": null,
        },
      },
    }),
  );

  app.use(
    "/api",
    cors({ origin: config.corsOrigin }),
    rateLimit({
      windowMs: 60_000,
      limit: config.rateLimitMax,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests, slow down a little" },
    }),
    apiRouter({ services, cache }),
  );
  app.use("/api", notFoundHandler);

  // In `npm start`, Express also serves the built frontend.
  if (config.staticDir && fs.existsSync(config.staticDir)) {
    app.use(
      express.static(config.staticDir, {
        setHeaders(res, file) {
          // Vite puts a content hash in every file name under assets/, so those
          // can be cached "forever". index.html must always be revalidated.
          if (file.includes(`${path.sep}assets${path.sep}`)) {
            res.set("Cache-Control", "public, max-age=31536000, immutable");
          } else {
            res.set("Cache-Control", "no-cache");
          }
        },
      }),
    );
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));
  return app;
}
