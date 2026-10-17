import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = path.resolve(backendDir, "..");

// One .env file at the repository root, shared with the Vite dev server.
dotenv.config({ path: path.join(rootDir, ".env"), quiet: true });

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  DB_PATH: z.string().min(1).default("data/app.db"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(30_000),
});

export function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid configuration in .env:\n  ${problems.join("\n  ")}`);
  }
  const c = parsed.data;
  return {
    port: c.PORT,
    corsOrigin: c.CORS_ORIGIN,
    dbPath: c.DB_PATH === ":memory:" ? c.DB_PATH : path.resolve(backendDir, c.DB_PATH),
    rateLimitMax: c.RATE_LIMIT_MAX,
    cacheTtlMs: c.CACHE_TTL_MS,
    // The built frontend, served by Express in `npm start` (skipped if it doesn't exist).
    staticDir: path.join(rootDir, "frontend", "dist"),
  };
}
