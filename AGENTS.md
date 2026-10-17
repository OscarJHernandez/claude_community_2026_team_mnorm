# AGENTS.md · Real or Fake? project guide

This is a guide for AI coding agents (Claude Code, Codex, Cursor, …) and for teammates. It covers how the project
works, where the data lives and how to run everything. Event rules (deadline, judging, team roles) live in
[CLAUDE.md](CLAUDE.md).

## What this is

A **"Real or Fake?" learning game** dataset for everyday people. The player sees **two images or two text messages**
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
npm run preview        # then open http://localhost:3000/dataset/preview.html
```

Optional, to let Claude rate new items or write new messages: `cp .env.example .env` and paste an
`ANTHROPIC_API_KEY`. Everything else works without a key.

## Where things live

```
dataset/
  items.csv        SOURCE OF TRUTH. One row per image or message. Edit this (Excel, Numbers, GitHub web editor).
  items.json       GENERATED from items.csv by `npm run data`. The app loads this. Never edit by hand.
  images/          All images, flat: images/<id>.jpg (max 512px JPEG). The path never says real or fake.
  inbox/           Drop new images here; `npm run data` converts them and moves them into images/.
  loader.js        Zero-dependency JS helper the app imports: loadDataset, getPair, getRound, difficultyOf.
  preview.html     Small page to browse pairs (uses loader.js exactly like the app would).
  README.md        Dataset details: item format, sources, licenses, how content was checked.
  HOW_TO_ADD.md    Step-by-step for non-developers adding images or messages.
prompts/           Every prompt sent to Claude (rate-item.md, write-texts.md). Tweak wording here, not in code.
scripts/
  build.mjs        `npm run data`: inbox → images, ids, Claude fills gaps, validation, writes items.json.
  fetch-images.mjs Downloads more images: --source eval (AI fakes) or --source wikimedia (real photos).
  fetch-texts.mjs  Pulls the hand-reviewed real SMS from the UCI collection (line numbers in CURATED).
  generate-texts.mjs  Claude writes new messages: --kind ai-written | scam | legit.
  lib/             csv.mjs (CSV read/write + column list), claude.mjs (all Claude API calls, model, schemas),
                   images.mjs (toJpeg), paths.mjs, util.mjs
test/              node:test tests for the loader and dataset integrity.
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
```

`mode` is `one-fake | both-real | both-fake | random`. Pairs share modality and category and prefer the same `subject`.
Image subjects: `animal, bird, landscape, water, plant, food, building, interior, street, vehicle, object, people`.

## Commands

| Command                                              | What it does                                              |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `npm run preview`                                    | serve the repo; open `/dataset/preview.html`              |
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
