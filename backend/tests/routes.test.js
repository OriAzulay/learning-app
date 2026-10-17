import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { makeApp } from "./helpers.js";

const TODAY = "2026-10-15";
const day = (p = "") => `/api/roles/backend/days/${TODAY}${p}`;

async function openAndAnswerAll(app, answer = "answer") {
  const res = await request(app).post(day()).expect(201);
  for (let i = 0; i < res.body.items.length; i++) {
    await request(app)
      .patch(day(`/items/${i}`))
      .send({ answer })
      .expect(200);
  }
  return res.body;
}

describe("GET /api/roles", () => {
  it("lists the roles with their topics", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/roles").expect(200);
    expect(res.body.map((r) => r.id)).toEqual(["backend", "cpp"]);
    expect(res.body[0].topics[0]).toEqual({ key: "http", label: "HTTP ו-REST API" });
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("settings", () => {
  it("reads and updates the selected role", async () => {
    const { app } = makeApp();
    await request(app).get("/api/settings").expect(200, { userName: "אורי", role: "backend" });
    await request(app).patch("/api/settings").send({ role: "cpp" }).expect(200);
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.role).toBe("cpp");
  });

  it("validates the body", async () => {
    const { app } = makeApp();
    await request(app).patch("/api/settings").send({ role: "nope" }).expect(400);
    await request(app).patch("/api/settings").send({ role: "../x" }).expect(400);
    await request(app).patch("/api/settings").send({ admin: true }).expect(400);
    await request(app).patch("/api/settings").send({}).expect(400);
  });
});

describe("days", () => {
  it("opens today (201 then 200) and refuses other days", async () => {
    const { app } = makeApp();
    const first = await request(app).post(day()).expect(201);
    expect(first.body.items).toHaveLength(20);
    expect(first.body.items[0]).not.toHaveProperty("check");
    expect(first.body.items[0].solution).toBeNull();
    await request(app).post(day()).expect(200);
    await request(app).post("/api/roles/backend/days/2026-10-16").expect(404);
    await request(app).get("/api/roles/backend/days/2026-10-14").expect(404);
  });

  it("rejects bad roles, dates and positions", async () => {
    const { app } = makeApp();
    await request(app).get("/api/roles/frontend/stats").expect(404);
    await request(app).get("/api/roles/BAD!/stats").expect(400);
    await request(app).get("/api/roles/backend/days/2026-13-01").expect(400);
    await request(app).post(day()).expect(201);
    await request(app).patch(day("/items/-1")).send({ answer: "x" }).expect(400);
    await request(app).patch(day("/items/99")).send({ answer: "x" }).expect(404);
  });

  it("validates item updates", async () => {
    const { app } = makeApp();
    await request(app).post(day()).expect(201);
    const bad = [
      {},
      { answer: 5 },
      { answer: "x".repeat(5001) },
      { answer: "ab", editFlags: "1" },
      { answer: "ab", editFlags: "12" },
      { view: "other" },
      { answer: "a", extra: 1 },
    ];
    for (const body of bad) await request(app).patch(day("/items/0")).send(body).expect(400);
    const res = await request(app).patch(day("/items/0")).send({ view: "sol" }).expect(409);
    expect(res.body.error).toMatch(/after Submit/);
  });

  it("runs the whole flow: answer, submit, view solution, re-mark, add more", async () => {
    const { app } = makeApp();
    await request(app).post(day()).expect(201);
    await request(app).post(day("/submit")).expect(409); // nothing answered yet
    for (let i = 0; i < 20; i++) {
      await request(app)
        .patch(day(`/items/${i}`))
        .send({ answer: "answer" })
        .expect(200);
    }

    const submitted = await request(app).post(day("/submit")).expect(200);
    expect(submitted.body.firstSubmitted).toBe(0);
    expect(submitted.body.day.submitted).toBe(true);
    expect(submitted.body.day.items.every((it) => it.done && it.solution)).toBe(true);

    const viewed = await request(app).patch(day("/items/1")).send({ view: "sol" }).expect(200);
    expect(viewed.body.view).toBe("sol");
    const marked = await request(app).post(day("/items/1/toggle-result")).expect(200);
    expect(marked.body.result).toBe(true);

    const more = await request(app).post(day("/more")).expect(200);
    expect(more.body).toMatchObject({ added: 20, start: 20 });
    expect(more.body.day.items).toHaveLength(40);

    const stats = await request(app).get("/api/roles/backend/stats").expect(200);
    const totals = Object.values(stats.body).reduce((n, s) => n + s.total, 0);
    expect(totals).toBe(20);
  });

  it("week summary validates its range", async () => {
    const { app } = makeApp();
    await request(app).post(day()).expect(201);
    const res = await request(app)
      .get("/api/roles/backend/days")
      .query({ from: "2026-10-11", to: "2026-10-17" })
      .expect(200);
    expect(res.body.today).toBe(TODAY);
    expect(res.body.days).toEqual([
      { date: TODAY, submitted: false, total: 20, correct: 0, answered: 0 },
    ]);
    await request(app)
      .get("/api/roles/backend/days")
      .query({ from: "2026-10-17", to: "2026-10-11" })
      .expect(400);
    await request(app).get("/api/roles/backend/days").expect(400);
  });
});

describe("cache", () => {
  it("serves repeated GETs from cache and invalidates on writes", async () => {
    const { app } = makeApp();
    await request(app).post(day()).expect(201);
    const miss = await request(app).get(day()).expect(200);
    expect(miss.headers["x-cache"]).toBe("MISS");
    const hit = await request(app).get(day()).expect(200);
    expect(hit.headers["x-cache"]).toBe("HIT");

    await request(app).patch(day("/items/0")).send({ answer: "new" }).expect(200);
    const after = await request(app).get(day()).expect(200);
    expect(after.headers["x-cache"]).toBe("MISS");
    expect(after.body.items[0].answer).toBe("new");
  });

  it("updates cached settings after a change", async () => {
    const { app } = makeApp();
    await request(app).get("/api/settings");
    await request(app).patch("/api/settings").send({ role: "cpp" }).expect(200);
    const res = await request(app).get("/api/settings");
    expect(res.headers["x-cache"]).toBe("MISS");
    expect(res.body.role).toBe("cpp");
  });
});

describe("backup", () => {
  it("exports and imports", async () => {
    const { app } = makeApp();
    await openAndAnswerAll(app);
    await request(app).post(day("/submit")).expect(200);
    const exported = (await request(app).get("/api/backup").expect(200)).body;

    const other = makeApp().app;
    await request(other)
      .post("/api/backup")
      .send(exported)
      .expect(200, { days: 1, skippedRoles: [] });
    const res = await request(other).get(day()).expect(200);
    expect(res.body.submitted).toBe(true);
  });

  it("rejects invalid backups and malformed JSON", async () => {
    const { app } = makeApp();
    await request(app).post("/api/backup").send({ nope: 1 }).expect(400);
    await request(app)
      .post("/api/backup")
      .send({ days: { backend: { "2026-10-15": { items: [{ id: "x" }] } } } })
      .expect(400);
    const res = await request(app)
      .post("/api/backup")
      .set("Content-Type", "application/json")
      .send("{not json")
      .expect(400);
    expect(res.body).toEqual({ error: "Malformed JSON" });
  });
});

describe("security and errors", () => {
  it("sets helmet headers and restricts CORS to the frontend origin", async () => {
    const { app } = makeApp();
    const ok = await request(app).get("/api/roles").set("Origin", "http://localhost:5173");
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(ok.headers["x-content-type-options"]).toBe("nosniff");
    expect(ok.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(ok.headers["x-powered-by"]).toBeUndefined();

    const evil = await request(app).get("/api/roles").set("Origin", "https://evil.example");
    expect(evil.headers["access-control-allow-origin"]).not.toBe("https://evil.example");
  });

  it("rate limits the API", async () => {
    const { app } = makeApp({ config: { rateLimitMax: 3 } });
    for (let i = 0; i < 3; i++) await request(app).get("/api/roles").expect(200);
    const res = await request(app).get("/api/roles").expect(429);
    expect(res.body.error).toMatch(/Too many/);
  });

  it("returns JSON 404s for unknown routes", async () => {
    const { app } = makeApp();
    await request(app).get("/api/nothing").expect(404, { error: "Not found" });
  });

  it("never leaks stack traces on internal errors", async () => {
    const { app, db, errors } = makeApp();
    db.close(); // every query now throws
    const res = await request(app).get("/api/roles").expect(500);
    expect(res.body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(res.body)).not.toMatch(/at |\.js/);
    expect(errors).toHaveLength(1); // logged on the server instead
  });
});

describe("static frontend", () => {
  it("caches hashed assets for a year and revalidates index.html", async () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), "dist-"));
    fs.mkdirSync(path.join(dist, "assets"));
    fs.writeFileSync(path.join(dist, "index.html"), "<!doctype html>");
    fs.writeFileSync(path.join(dist, "assets", "main-abc123.js"), "1");
    const { app } = makeApp({ config: { staticDir: dist } });

    const index = await request(app).get("/").expect(200);
    expect(index.headers["cache-control"]).toBe("no-cache");
    const asset = await request(app).get("/assets/main-abc123.js").expect(200);
    expect(asset.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    fs.rmSync(dist, { recursive: true, force: true });
  });
});
