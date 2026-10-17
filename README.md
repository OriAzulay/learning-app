# Learning App — Learning Tracker for Developer Roles

A lightweight, single-file HTML app for daily practice toward a developer role. Every day the app generates 20 new questions of increasing difficulty. It stores the questions and your answers, checks them after Submit, and rates your mastery of each topic.

There are currently two tracks: **Backend** and **Basic C++**.

**Live demo:** https://oriazulay.github.io/learning-app/learning-app.html

**Download:** [learning-app.html](https://raw.githubusercontent.com/OriAzulay/learning-app/main/learning-app.html) (open the link and save the page as an `.html` file)

### Easy version

- **On a phone:** open the Live demo link and choose "Add to Home Screen" to use it like an app.
- **Offline:** the downloaded file runs on its own in any browser, with no server and no install.
- **Your progress:** each device and browser keeps its own progress locally. Use "ייצוא גיבוי" (Export backup) and "ייבוא גיבוי" (Import backup) to save it or move it to another device.

---

## The Idea

- **Steady daily practice:** The first time you open the app each day, 20 questions are generated, four at each level from 1 to 5. For the rest of the day you see the same questions along with the answers you've already written.
- **Answer and solution:** Write a free-text answer for each question. After Submit, a ✓ or ✗ appears, and the "Solution" button (פתרון) replaces the answer box with the correct solution.
- **Progress by topic:** Each topic gets a color based on the percentage of correct answers:
  green (75% and above) · orange (50%–75%) · red (below 50%).
- **Adaptive learning:** Selection favors questions you haven't seen yet and weak topics. A question you got wrong comes back after 3 days.
- **Editing after submit:** Answers stay editable after Submit, and anything you add or change is shown in italic.
- **More questions:** The `add more questions` button adds another 20 new questions on the same day, again from level 1 to 5.

## Screens

| Screen | What it contains |
|---|---|
| **Home** | Banner with a greeting and the date · role picker · week strip (Sunday to Saturday, today highlighted, arrows for next and previous week) · topic list with color ratings · "Start" button |
| **Questions** | Week strip · 20 questions with answer boxes · "Answer / Solution" under each box · Submit at the bottom (enabled only once everything is answered) · `add more questions` |

Clicking a previous day in the strip opens that day's questions and answers. A green dot marks a submitted day, and a blue dot marks a day you started answering.

---

## Architecture

```
┌──────────────────────── learning-app.html ────────────────────────┐
│                                                                   │
│  HTML  ── two screens: #home and #quiz                            │
│  CSS   ── dark fintech style, color variables in :root,           │
│           mobile-friendly, RTL                                    │
│  JS    ┬─ question banks (structured text) + generator templates  │
│        ├─ adaptive daily question selection                       │
│        ├─ answer checking (keywords / number / Big-O / output)    │
│        ├─ simple hash routing:  #/  and #/day/YYYY-MM-DD          │
│        └─ localStorage persistence + JSON backup export/import    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Principles:**
- **One file, no server, no build:** Open it directly on a computer or phone. No dependencies except the Heebo font from Google Fonts; offline, a system font is used.
- **No backend, no AI:** Checking happens in the browser against a stored solution. If the automatic check is wrong, click the ✓/✗ to correct it.
- **Data is stored locally:** Each device keeps its own data. To move data between devices, use "Export backup" and "Import backup".

### Code Structure (inside `<script>`)

| Part | Role |
|---|---|
| `USER_NAME`, `QUESTIONS_PER_DAY`, `LEVELS` | Basic settings |
| `BACKEND_TOPICS`, `BACKEND_BANK`, `backendTemplates()` | Backend topics, question bank and templates (HTTP codes, ports, Big-O, chmod, CIDR, binary search) |
| `CPP_TOPICS`, `CPP_BANK` | C++ topics and a question bank with code snippets |
| `ROLES` | The list of roles. Add new roles here |
| `parseBank()`, `allQuestions()`, `rich()` | Parse the bank into objects, and render text with code blocks |
| `checkAnswer()` | Check an answer according to its check type |
| `load()` / `save()` | Read from and write to localStorage |
| `topicStats()`, `rating()` | Compute the percentage and color for each topic |
| `pickQuestions()`, `generateDay()` | Pick 20 questions of increasing level, favoring new questions and weak topics |
| `route()`, `renderWeeks()` | Routing and the week strip |
| `showHome()`, `showQuiz()`, `renderQ()`, `renderQuizState()` | Render the screens |

### Data Model (localStorage, key `learning-app.v1`)

```js
{
  role: "backend",                       // the selected role
  days: {
    backend: {
      "2026-10-17": {
        items:   [ {id, topic, level, q, a, check}, ... ],  // the day's questions (full copy)
        answers: [ "...", ... ],         // answers written
        results: [ true, false, ... ],   // correct / incorrect
        done:    [ true, ..., false ],   // which questions have been submitted
        view:    [ "ans" | "sol", ... ], // what each box shows
        ansEdit: { 3: "0001110" },       // after submit: which characters of an answer were edited (1 = shown in italic)
        submitted: true                  // all of the day's questions were submitted
      }
    },
    cpp: { ... }
  },
  seen: { backend: { "<questionId>": { d: "2026-10-17", ok: true } } }  // when each question was asked and whether it was answered correctly
}
```

Questions are stored as a full copy inside each day, so changes to the bank don't alter history.

---

## Question Bank Format

Each question is one line:

```
topic ~ level ~ question ~ solution ~ keywords        (Backend, separator is ~)
topic ¦ level ¦ question ¦ solution ¦ keywords        (C++, separator is ¦ because ~ is used for destructors)
```

- **Keywords:** Groups separated by commas, with alternatives within a group separated by `|`. An answer counts as correct when it contains a word from every group, or from most groups when there are more than two.
  Example: `lifo|אחרון שנכנס,fifo|ראשון שנכנס`
- **`=value`:** The answer must start with this value. Suited to "What will be printed?" questions, e.g. `=21`.
- **Code:** `@@` separates text from code, and `\n` marks a new line inside the code. This works in both the question and the solution.
  Example: `מה לא בסדר בקוד הבא?@@int arr[5];\nfor (int i = 0; i <= 5; i++)\n    arr[i] = i;`

Template-generated questions (in `backendTemplates()`) can also use `check:{type:"num"}` or `check:{type:"bigo"}`.

## Adding a New Role

1. Define a topics object, e.g. `const FRONTEND_TOPICS = { react: "React", css: "CSS", ... }`.
2. Write a question bank in the format above. Aim for at least 4 questions per level, preferably more.
3. Add a line to `ROLES`:
   ```js
   frontend: { label:"Frontend", topics:FRONTEND_TOPICS, bank:FRONTEND_BANK }
   ```
   (`sep` and `templates` are optional.)

The role appears automatically in the picker, with its own day strip and ratings.

---

## Running

- **On a computer:** Open `learning-app.html` in a browser (Chrome, Edge, Firefox or Safari).
- **On a phone:** Download the file and open it in a browser. Google Drive's preview doesn't run HTML, so you need to download the file.
- **GitHub Pages:** You can enable Pages on the repo and access the app from any device. Note that data is still stored separately in each browser.

## Project Structure

```
learning-app/
├── learning-app.html   # the whole app: HTML + CSS + JS + question banks
└── README.md
```

## Future Directions

- A login screen, and embedding the app as a tab inside a main app
- More roles (Frontend, DevOps and more)
- Sync between devices (e.g. a JSON file on Drive or a small server)
- Smarter answer checking using a language model
