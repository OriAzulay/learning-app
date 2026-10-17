import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ mode }) => {
  // Read PORT from the same root .env file the backend uses.
  const env = loadEnv(mode, rootDir, "");
  const apiPort = env.PORT || 3000;

  return {
    server: {
      port: 5173,
      strictPort: true,
      // The browser only talks to Vite; Vite forwards /api to Express.
      proxy: { "/api": `http://localhost:${apiPort}` },
    },
    preview: {
      port: 5173,
      proxy: { "/api": `http://localhost:${apiPort}` },
    },
    build: { outDir: "dist", emptyOutDir: true },
    test: {
      environment: "node",
      include: ["tests/**/*.test.js"],
    },
  };
});
