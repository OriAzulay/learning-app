# Learning App — Learning Tracker for Developer Roles

A small app for daily practice toward a developer role. Every day it generates 20 new questions of increasing difficulty, stores the questions and your answers, checks them after Submit, and rates your mastery of each topic. There are two tracks: **Backend** and **Basic C++**.

It started as a single HTML file with everything in `localStorage`. It is now a small, production-style project, a Vite frontend and an Express + SQLite backend, kept deliberately simple so every piece is easy to read and learn from.

---

## Quick start

Requirements: **Node.js 22 or newer** (CI uses 24).

```bash
npm install            # installs both workspaces (frontend + backend)
cp .env.example .env   # optional: the defaults work without it
npm run dev            # backend on :3000 with auto-reload + Vite on :5173
```

Open http://localhost:5173. The first start creates `backend/data/app.db` and fills the question bank.

| Command (from the root) | What it does                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server (proxies `/api` to the backend) + backend with `node --watch` |
| `npm test`              | All tests: backend, then frontend                                             |
| `npm run lint`          | ESLint, then a Prettier formatting check                                      |
| `npm run format`        | Rewrites files with Prettier                                                  |
| `npm run build`         | Builds the frontend into `frontend/dist`                                      |
| `npm start`             | Runs the backend only; it also serves `frontend/dist` if it was built         |
| `npm run seed`          | Reloads the question bank from `backend/src/seed-data` (keeps your history)   |

Each folder also has its own `npm test` (`cd backend && npm test`, `cd frontend && npm test`).

**"Production-style" run on one machine:** `npm run build && npm start`, then open http://localhost:3000. Express serves both the page and the API.

**Moving your old data in:** if you used the old single-file version, click "ייצוא גיבוי" (export backup) there, then "ייבוא גיבוי" (import backup) here. The old backup format is accepted as is.

---

## How the app works

- **Daily questions:** the first time you open the app each day, 20 questions are picked, four at each level from 1 to 5. For the rest of the day you see the same questions and your answers.
- **Answer and solution:** write a free-text answer for each question. Submit is enabled once everything is answered. After Submit a ✓ or ✗ appears, and the "פתרון" (Solution) button replaces the answer box with the correct solution. If the automatic check was wrong, click the ✓/✗ to flip it.
- **Ratings by topic:** green (75% and above), orange (50%–75%), red (below 50%).
- **Adaptive picking:** prefers questions you haven't seen and weak topics; a question you got wrong comes back after 3 days.
- **Editing after Submit:** answers stay editable, and anything you add or change is shown in italic.
- **More questions:** `add more questions` adds another 20 new questions on the same day.
- **Week strip:** click a previous day to open its questions. A green dot marks a submitted day, a blue dot a day you started.

---

## Architecture

```
learning-app/
├── package.json            npm workspaces + root scripts (dev, test, lint, build)
├── .env.example            the one config file (copy to .env)
├── eslint.config.js  .prettierrc.json  .editorconfig
├── .github/workflows/ci.yml
├── frontend/               Vite + vanilla JS (ES modules)
│   ├── index.html          the page markup
│   ├── vite.config.js      dev server, /api proxy, Vitest config
│   ├── src/
│   │   ├── main.js         boot, routing (#/ and #/day/YYYY-MM-DD), global events, backup
│   │   ├── api.js          the only module that calls the backend
│   │   ├── state.js        in-memory state loaded from the API
│   │   ├── dom.js          h() element builder + rich() text renderer (no innerHTML)
│   │   ├── styles.css      the original CSS
│   │   ├── views/          home.js, quiz.js, weekStrip.js, toast.js  (DOM code)
│   │   └── lib/            pure logic, unit tested: dates, rich text, edit diff, quiz state, autosave
│   └── tests/
└── backend/                Node.js + Express
    ├── data/               app.db lives here (git-ignored)
    ├── src/
    │   ├── server.js       starts the server
    │   ├── app.js          builds the Express app: helmet, CORS, rate limit, routes, static files, errors
    │   ├── config.js       reads .env and validates it with zod
    │   ├── cache.js        lru-cache wrapper + cache keys
    │   ├── errors.js       HttpError (errors that are safe to show)
    │   ├── routes/         HTTP layer: URLs, input validation, caching
    │   ├── services/       business logic: picking, checking, days, stats, settings, backup
    │   ├── db/             connection, migration (schema), seed
    │   ├── middleware/     validate (zod), error handler
    │   └── seed-data/      the question banks (moved verbatim from the old HTML file)
    └── tests/
```

### The three backend layers

A request flows **route → service → db**:

1. **Routes** (`src/routes/`) know about HTTP: URLs, status codes, validating input with zod, and caching. They contain no business rules.
2. **Services** (`src/services/`) hold the rules: which 20 questions to pick, how answers are checked, when Submit is allowed. They take a database connection and know nothing about HTTP, which makes them easy to test directly.
3. **DB** (`src/db/`) opens SQLite, creates the schema and seeds the bank. Services run SQL through it.

`createApp({ db, config, now, rng })` builds the app without starting it. Tests pass an in-memory database, a fixed "today" and a seeded random generator.

### REST API

All JSON, under `/api`:

| Method | Path                                             | Purpose                                                    |
| ------ | ------------------------------------------------ | ---------------------------------------------------------- |
| GET    | `/roles`                                         | Roles with their topics                                    |
| GET    | `/settings`                                      | `{ userName, role }`                                       |
| PATCH  | `/settings`                                      | Change the selected role (or name)                         |
| GET    | `/roles/:role/stats`                             | Per-topic `{ ok, total, rating }`                          |
| GET    | `/roles/:role/days?from=&to=`                    | Week strip summaries                                       |
| POST   | `/roles/:role/days/:date`                        | Open a day; creates today's questions the first time (201) |
| GET    | `/roles/:role/days/:date`                        | A day's questions and answers                              |
| PATCH  | `/roles/:role/days/:date/items/:i`               | Save an answer (+ edit flags) or the Answer/Solution view  |
| POST   | `/roles/:role/days/:date/items/:i/toggle-result` | The manual ✓/✗ fix                                         |
| POST   | `/roles/:role/days/:date/submit`                 | Check every pending answer                                 |
| POST   | `/roles/:role/days/:date/more`                   | Add 20 more questions                                      |
| GET    | `/backup`                                        | Export everything as JSON                                  |
| POST   | `/backup`                                        | Import (replaces history)                                  |

Errors always look like `{ "error": "message" }`, plus `details` for validation errors.

### Database

SQLite in one file, `backend/data/app.db`, through `better-sqlite3`.

| Table             | What it holds                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `settings`        | `user_name`, selected `role` (used to be hardcoded / in localStorage)                                        |
| `roles`, `topics` | The tracks and their topic names                                                                             |
| `questions`       | The question bank: text, solution, and how to check it (`check_json`)                                        |
| `days`            | One row per role per opened day, and whether it is submitted                                                 |
| `day_items`       | The day's questions (copied in, so bank edits never change history), answers, edit flags, result, done, view |
| `seen`            | When each question was last asked and whether it was answered correctly                                      |

`src/db/migrate.js` runs `CREATE TABLE IF NOT EXISTS` on every start, and stores the schema version in `PRAGMA user_version` for future migrations. On the first start the bank is seeded automatically; `npm run seed` refreshes it later. Seeding upserts, so it never deletes your answers.

---

## Why each decision

**npm workspaces.** One `npm install` and one `package-lock.json` for both folders. CI runs `npm ci` once, and the root scripts can run both sides.

**Vite + vanilla JS.** The app is two screens. A framework would add more concepts than it saves. Vite gives a dev server with instant reload, a proxy to the backend, and a production build with hashed file names. The old inline script is split into ES modules. The pure logic (`src/lib/`) is separate from the DOM code (`src/views/`), so it can be unit tested without a browser.

**Express with routes / services / db.** Each layer has one job, so a change to a URL doesn't touch the picking rules, and the rules can be tested without HTTP.

**Answer checking moved to the server.** The browser used to hold every solution from the start. Now the server only sends a solution after that question is submitted, so the app looks the same but the answers can't be read before Submit.

**SQLite + better-sqlite3.** A real SQL database in a single file, with no server to install and no passwords. `better-sqlite3` is synchronous, which keeps the code simple, and it is fast for one user. Transactions make multi-step writes (like Submit) all-or-nothing. It is pinned to version 12, which downloads a prebuilt binary on install; version 13 compiles from source and needs C++ build tools (Visual Studio on Windows).

**Parameterized queries everywhere.** Every SQL statement uses `?` or `@name` placeholders (`db.prepare(...).run(values)`). Values never become part of the SQL text, which rules out SQL injection.

**In-memory cache (`lru-cache`).** Read-heavy GETs (roles, settings, stats, week strip, a day) are cached for a short TTL (`CACHE_TTL_MS`, 30s by default). Every write deletes exactly the keys it could have made stale (`invalidateDay` in `src/cache.js`), so you never see old data. The `X-Cache: HIT/MISS` response header lets you watch it in the browser's Network tab. An LRU with a max size means memory can't grow without bound. No Redis is needed for one process.

**HTTP cache headers.** Vite puts a content hash in asset names (`index-BlhrObtp.js`), so a changed file gets a new name. Those files are sent with `Cache-Control: public, max-age=31536000, immutable`, and browsers keep them for a year. `index.html` gets `no-cache`, so the browser always checks for a new version. API responses get `no-store`, because the server cache handles them.

**Validation with zod.** Every route validates `params`, `query` and `body` before the service runs (`middleware/validate.js`). Bad input becomes a clear 400 instead of reaching the database. Unknown body fields are rejected (`.strict()`).

**XSS prevention.** The frontend never puts data into `innerHTML`. Elements are built with `h()` / `textContent` (`src/dom.js`). Question text with code blocks is split into pieces by a pure function (`lib/rich.js`) and each piece becomes a text node. The Content-Security-Policy header from helmet also blocks inline scripts as a second layer.

**helmet, CORS, rate limiting.** `helmet` sets safe default headers (CSP, nosniff, frame protection and more). The CSP allows Google Fonts and the inline SVG favicon, and leaves out `upgrade-insecure-requests` because the app is served over plain HTTP. CORS only allows `CORS_ORIGIN` (the Vite dev server). In dev the browser talks to Vite, which proxies `/api`, so requests are same-origin anyway. `express-rate-limit` caps requests per IP per minute (`RATE_LIMIT_MAX`).

**One `.env` file.** Both the backend (`dotenv`) and Vite read the root `.env`. Only `.env.example` is committed. The config is validated at startup, so a typo fails fast with a clear message.

**Central error handler.** Services throw `HttpError(status, message)` for expected problems. Anything else is logged on the server and the client only gets `{ "error": "Internal server error" }`, never a stack trace.

**Autosave with debounce.** Answers save to the server 400ms after you stop typing (`lib/saver.js`), and are flushed immediately before Submit, before navigating, and when the tab is hidden.

**Vitest + supertest + `:memory:`.** Vitest runs both test suites with the same API. Backend tests open a fresh in-memory SQLite database for each test, so they never touch `data/app.db`, run fast, and don't depend on each other. Route tests use supertest to send real HTTP requests to the app without opening a port. Frontend tests cover the pure functions in `src/lib/`.

**ESLint + Prettier.** ESLint catches bugs (unused variables, undefined globals). Prettier owns formatting, so there are no style debates. `eslint-config-prettier` turns off ESLint rules that would conflict.

**CI (`.github/workflows/ci.yml`).** On every push and pull request to `main`: `npm ci` (with npm caching), lint, all tests, the frontend build, and `npm audit --audit-level=high`. GitHub Actions only reads workflows from `.github/workflows/`. (`.gitlab-ci.yml` is GitLab's format, so the workflow lives here instead.)

**Not included on purpose:** separate dev/staging/prod environments, Docker, cloud deployment, monitoring, users or logins.

---

## Question bank format

The banks live in `backend/src/seed-data/`. Each question is one line:

```
topic ~ level ~ question ~ solution ~ keywords        (Backend, separator is ~)
topic ¦ level ¦ question ¦ solution ¦ keywords        (C++, separator is ¦ because ~ is used for destructors)
```

- **Keywords:** groups separated by commas, alternatives inside a group separated by `|`. An answer is correct when it contains a word from every group, or from most groups when there are more than two. Example: `lifo|אחרון שנכנס,fifo|ראשון שנכנס`
- **`=value`:** the answer must start with this value, for "What will be printed?" questions, e.g. `=21`.
- **Code:** `@@` separates text from code, and `\n` is a new line inside the code. Works in the question and the solution.

Template-generated questions (`backendTemplates.js`) can also use `check: { type: "num" }` or `check: { type: "bigo" }`.

After editing a bank, run `npm run seed`.

## Adding a new role

1. Create a bank file in `backend/src/seed-data/` that exports a topics object and the bank text (see `cppBank.js`). Aim for at least 4 questions per level.
2. Add an entry to `ROLES` in `backend/src/seed-data/roles.js`.
3. Run `npm run seed`. The role appears in the picker with its own days and ratings.

## Future directions

- A login screen, and embedding the app as a tab inside a main app
- More roles (Frontend, DevOps and more)
- Smarter answer checking using a language model
