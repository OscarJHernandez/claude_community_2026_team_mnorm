# AGENTS.md · Real or Fake? project guide

This is a guide for AI coding agents (Claude Code, Codex, Cursor, …) and for teammates. It covers how the project
works, where the data lives and how to run everything. Event rules (deadline, judging, team roles) live in
[CLAUDE.md](CLAUDE.md).

## What this is

**Fenster** is a plain-JS PWA for adults 60+ (served by a small Node server). It has a "Real or Fake?" feed and a
scam checker that uses Claude. The app design and architecture are in [docs/](docs/) and [design/](design/). This guide
focuses on how to run things and on the **Real-or-Fake dataset** that feeds the game: a
**"Real or Fake?" learning game** dataset for everyday people. The player sees **two images or two text messages**
and judges each one as real or fake. A pair can be one real + one fake, both real, or both fake. Every item has a
**difficulty from 1 (obvious) to 5 (very hard)**, **clues** and a short **explanation** shown after answering, so the
game can start easy and teach as it goes.

Three categories:

| `category`      | "real" (`is_real: true`) means | "fake" (`is_real: false`) means |
| --------------- | ------------------------------ | ------------------------------- |
| `ai-image`      | a real photo                   | an AI-generated image           |
| `ai-vs-human`   | a message written by a person  | a message written by AI         |
| `scam-vs-legit` | a legitimate message           | a scam message                  |

## Run it (2 minutes)

Requires **Node.js 20.6+** (`node -v`).

```bash
git pull
npm install
npm start              # the app: http://localhost:3000  (?lang=de or ?lang=en)
npm run preview        # or just the dataset: http://localhost:3000/dataset/preview.html (stop npm start first)
```

Optional: `cp .env.example .env` and paste an `ANTHROPIC_API_KEY`. That turns on the live scam checker in the app, lets
Claude rate new dataset items, and lets it write new messages. Everything else works without a key.

## Where things live

```
server.mjs         The app server (node:http): serves the app and /api/* routes. `npm start`.
server/            routes/check.mjs (scam checker), lib/claude.mjs (Claude client for the app).
app/               The Fenster PWA: index.html, app.js, i18n.js (English + German), styles.css, journey.html.
                   The "Real or Fake?" pair game is the `#/play` screen (S.play in app.js).
content/           App content in git: feed/<date>.json (the 7 clips of the day: "showcase:", "dataset:<id>" or
                   "video:<id>"), dataset-de.json (German clues/explanations per dataset id, `npm run translate`),
                   videos/ (real vs AI video clips: the team's sheet + videos.json, see videos/README.md), ai-fallback/.
docs/              PROPOSAL, ARCHITECTURE, DESIGN_PHILOSOPHY, BEST_PRACTICES. Read before changing the app.
design/            Design system: tokens.css (use the --fs-* tokens) and index.html (visual reference).
dataset/
  items.csv        SOURCE OF TRUTH. One row per image or message. Edit this (Excel, Numbers, GitHub web editor).
  items.json       GENERATED from items.csv by `npm run data`. The app loads this. Never edit by hand.
  images/          All images, flat: images/<id>.jpg (max 512px JPEG). The path never says real or fake.
  inbox/           Drop new images here; `npm run data` converts them and moves them into images/.
  loader.js        Zero-dependency JS helper the app imports: loadDataset, getPair, getRound, difficultyOf.
  preview.html     Small page to browse pairs (uses loader.js exactly like the app would).
  README.md        Dataset details: item format, sources, licenses, how content was checked.
  HOW_TO_ADD.md    Step-by-step for non-developers adding images or messages.
prompts/           Every prompt sent to Claude: check.md (app scam checker), rate-item.md and write-texts.md
                   (dataset tooling). Tweak wording here, not in code.
scripts/
  build.mjs        `npm run data`: inbox → images, ids, Claude fills gaps, validation, writes items.json.
  fetch-images.mjs Downloads more images: --source eval (AI fakes) or --source wikimedia (real photos).
  fetch-texts.mjs  Pulls the hand-reviewed real SMS from the UCI collection (line numbers in CURATED).
  generate-texts.mjs  Claude writes new messages: --kind ai-written | scam | legit.
  translate-dataset.mjs  `npm run translate`: German text for dataset items into content/dataset-de.json.
  lib/             csv.mjs (CSV read/write + column list), claude.mjs (all Claude API calls, model, schemas),
                   images.mjs (toJpeg), paths.mjs, util.mjs
test/              node:test tests: loader + dataset integrity (loader.test.js), app + feed + i18n (app.test.js).
.cache/            Download caches (git-ignored). Safe to delete.
```

## How data flows

```
 Wikimedia / Hugging Face / UCI ──fetch scripts──▶ dataset/inbox/ + new rows in items.csv
 teammates (Excel / GitHub)    ──────────────────▶ dataset/inbox/ + new rows in items.csv
                                                        │
                                                 npm run data
                       (convert to JPEG, assign ids, Claude fills subject / difficulty / clues / explanation,
                                          check every row, print problems in plain words)
                                                        ▼
                               dataset/images/<id>.jpg  +  dataset/items.json  ──▶  the app (loader.js)
```

## Using the dataset in the app

```js
import { loadDataset, getPair, getRound } from "./dataset/loader.js";
const items = await loadDataset(); // fetches dataset/items.json
const pair = getPair(items, { modality: "image", difficulty: 2, mode: "one-fake" });
// pair.left / pair.right: { id, is_real, src (images) | content (texts), difficulty, clues, explanation, source }
const round = getRound(items, { modality: "text", count: 10, start: 1, end: 5 }); // easy → hard, no repeats
const videoPairs = getFixedPairs(videos); // videos.json: a real + an AI clip that share a `pair` number (Pair ID)
```

`mode` is `one-fake | both-real | both-fake | random`. Pairs share modality and category and prefer the same `subject`.
Image subjects: `animal, bird, landscape, water, plant, food, building, interior, street, vehicle, object, people`.

## Commands

| Command                                              | What it does                                              |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `npm start`                                          | run the app on http://localhost:3000                      |
| `npm run preview`                                    | serve the repo; open `/dataset/preview.html`              |
| `npm run translate`                                  | German clues/explanations for new dataset items (key)     |
| `npm run data`                                       | rebuild `items.json` (Claude fills gaps if a key is set)  |
| `npm run data:offline`                               | rebuild without calling Claude                            |
| `npm run fetch:images -- --source eval --count 50`   | download 50 more AI images (spread over ~20 generators)   |
| `npm run fetch:images -- --source wikimedia --count 50` | download 50 more freely licensed real photos           |
| `npm run fetch:texts`                                | re-pull the curated real SMS                              |
| `npm run generate -- --kind scam --count 10`         | Claude writes 10 new messages (needs a key)               |
| `npm run check`                                      | lint + format check + tests (CI runs this on every PR)    |
| `npm run format`                                     | auto-fix formatting                                       |

## Rules for changes

- **Edit `dataset/items.csv`, never `items.json`.** Run `npm run data` (or `data:offline`) after editing, and commit both.
- **Never renumber or delete dataset ids** that `content/feed/*.json` or `content/dataset-de.json` use (tests check this).
  New items without German text fall back to English until `npm run translate` runs.
- **Look at every new image before committing.** No children, no nudity or gore, no readable text or watermark that
  gives the answer away. Real people: only adults in public scenes, never a portrait. Never store a person's name.
- **Keep licenses.** Every row records `source_dataset`, `source_license` and `source_author` where known. Only
  add images you are allowed to use, and credit new sources in `dataset/README.md` and the root README.
- **Texts:** no real phone numbers (use Ofcom drama ranges such as `020 7946 0xxx` or `0808 157 0xxx`), no working
  links (use made-up look-alike domains), no real private people's names.
- **Claude:** every API call goes through `scripts/lib/claude.mjs` (one `MODEL` constant). Prompts live in `/prompts`.
  Read the key from `.env` (`ANTHROPIC_API_KEY`), never put it in code or commits. API failures warn and continue.
- **Before pushing:** `npm run check` must pass. Work on a branch, open a PR into `main`, and keep commits small.
- Don't delete files teammates created without asking.
