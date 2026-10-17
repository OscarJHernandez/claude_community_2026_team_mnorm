> 👋 **Starter for Claude Impact Lab teams.** Fill in each section below as you build and delete this note.
>
> 📅 **Agenda, rules, deadline and judging** are in the event repo: **[claude-impact-lab-berlin-2026-10-17](https://github.com/Claude-Community-Berlin/claude-impact-lab-berlin-2026-10-17)**. Read it first.
>
> ✅ **When you're finished:** record a 2-minute demo video, then submit with the **[submission form](https://tally.so/r/1WPr9Q)** before **16:00**. One submission per team.
>
> 🔑 Set your API key first: `cp .env.example .env`, then paste your key into `.env` (it's git-ignored, never commit it).

# Real or Fake?

**One line:** A TikTok-style swipe game that helps older adults on WhatsApp spot AI fakes and scam messages and try using AI themselves.

## The problem
Older adults use WhatsApp every day, and that is where AI fake videos, voice clones and scams get forwarded to them. Most of them have never used AI, so they can't tell what is real and don't know AI can also help them. Warnings don't build that skill; safe practice with patient explanations does.

## What it does
- Opens from a link in WhatsApp, no app or account needed.
- **"Real or Fake?" game** (`#/play`, the 🎮 button on Home): 10 rounds, each with **two photos, two messages or two videos**. The player judges each one as real or fake (one real + one fake, both real, or both fake)
- A daily feed of 7 single clips on Home, including **real vs AI videos** played in the page ([how to add videos](content/videos/README.md))
- Four kinds of challenge: **AI image vs real photo**, **AI-written vs human message**, **scam vs legit message**, **AI video vs real video**
- Every item has a **difficulty from 1 (obvious) to 5 (very hard)**, so a round can start easy and get harder
- After each answer the player sees **what gave it away** (clues) and a short, friendly **explanation**
- The team can add new images and messages with a spreadsheet, no coding needed ([how](dataset/HOW_TO_ADD.md))

## How Claude is used
- **Rates every item** (`claude-opus-5-5`, with vision for images): difficulty 1–5, the clues a player can spot, and a plain-language explanation. It runs in `npm run data` for any new row that is missing them.
- **Writes the fake messages**: AI-written texts that imitate real ones, modern scams and legit notifications (`npm run generate`).
- **Scam checker in the app**: the user pastes a message and Claude explains whether it looks like a scam and why ([`prompts/check.md`](prompts/check.md), [`server/routes/check.mjs`](server/routes/check.mjs)).
- All prompts are in [`prompts/`](prompts/). Dataset API calls are in [`scripts/lib/claude.mjs`](scripts/lib/claude.mjs), app calls in [`server/lib/claude.mjs`](server/lib/claude.mjs).

## How to run it
You need **Node.js 20.6 or newer** ([download](https://nodejs.org)). Check with `node -v`.

```bash
git clone https://github.com/OscarJHernandez/claude_community_2026_team_mnorm.git
cd claude_community_2026_team_mnorm
npm install
cp .env.example .env    # optional: paste your ANTHROPIC_API_KEY (without it the scam checker uses a simple offline check)
npm start               # then open http://localhost:3000
```
- `http://localhost:3000/#/play` opens the "Real or Fake?" game directly.
- `http://localhost:3000/?lang=de` or `?lang=en` to pick the language.
- `http://localhost:3000/app/journey.html` shows every screen side by side.
- `http://localhost:3000/design/` is the design system.
- `npm run check` runs lint, format check and tests. `npm run translate` adds German text for the dataset (needs the key).

Docs: [design philosophy](docs/DESIGN_PHILOSOPHY.md) · [architecture](docs/ARCHITECTURE.md) · [best practices](docs/BEST_PRACTICES.md)

**Just the dataset:** `npm run preview` (stop `npm start` first, both use port 3000), then open
**http://localhost:3000/dataset/preview.html**. Pick Images or Texts, a difficulty and a pair type, then click
**New pair** and **Reveal answers**. Stop either server with `Ctrl+C`.

**Claude features for the dataset** (need the key in `.env`):

```bash
npm run data                                   # Claude rates any new rows and rebuilds the dataset
npm run generate -- --kind scam --count 5      # Claude writes 5 new scam messages (or ai-written / legit)
```

| I want to…                         | Run / open                                                        |
| ---------------------------------- | ----------------------------------------------------------------- |
| add an image or message            | follow [dataset/HOW_TO_ADD.md](dataset/HOW_TO_ADD.md)             |
| rebuild after editing `items.csv`  | `npm run data` (or `npm run data:offline` with no key)            |
| download more images               | `npm run fetch:images -- --source eval --count 20` (AI) or `--source wikimedia` (real) |
| check everything before a PR       | `npm run check`                                                   |
| understand the code and data       | [AGENTS.md](AGENTS.md) (where everything lives) and [dataset/README.md](dataset/README.md) |

**Where the data lives:** `dataset/items.csv` is the master list (edit this). `dataset/items.json` is generated from
it and is what the app loads. All pictures are in `dataset/images/`.

**Something not working?** "command not found: npm" means Node isn't installed. If the preview can't load items.json,
run `npm run data:offline` and open it through `npm start` or `npm run preview`, not by double-clicking the file.
"Port 3000 in use" means another server is still running: stop it with `Ctrl+C` or use `PORT=3001 npm start`.

**Live link (if any):** https://rs.neurorelations.tech:8444/fenster/ (phone-friendly; the "Real or Fake?" game is at https://rs.neurorelations.tech:8444/fenster/app/#/play)

## Screenshots / demo
| Onboarding | Feed: answer explained | "Real or Fake?" game | Scam checker |
|---|---|---|---|
| <img src="docs/screenshots/1-onboarding.jpg" width="200" alt="Onboarding: language and text size"> | <img src="docs/screenshots/2-feed-explained.jpg" width="200" alt="Feed item answered, with clues"> | <img src="docs/screenshots/3-real-or-fake-game.jpg" width="200" alt="Real or Fake? round with a scam SMS"> | <img src="docs/screenshots/4-scam-checker.jpg" width="200" alt="Scam checker result"> |

## Team
Teams of 5 (at least 1 builder, 1 product or design, 1 domain expert; plus founder or anyone). Link each name to a GitHub or LinkedIn profile, and replace the example row with your team.

| Name | Role / background |
|---|---|
| [Oscar J. Hernandez](https://github.com/OscarJHernandez) | Data science, Engineering |
| [Natalia Sahagun](https://github.com/nalius-sp) | Product / Design, Consultancy and Project Management |
| [Ruthvick Poornachandra](https://github.com/ruthvick7) | Domain expert (product) |
| Mariia Liashchenko | Product designer |
| [Mikhail Popov](https://github.com/mikhailpopov6) | Builder, DevRel |

## Credits
<Open-source libraries, APIs, datasets and assets you used.>

**Dataset** (details in [dataset/README.md](dataset/README.md)):
- Fake images: [CommunityForensics-Small](https://huggingface.co/datasets/OwensLab/CommunityForensics-Small) and [CommunityForensics-Eval](https://huggingface.co/datasets/OwensLab/CommunityForensics-Eval) (CC BY-NC-SA 4.0, non-commercial educational use)
- Real photos: [Wikimedia Commons](https://commons.wikimedia.org), license and author per image in `dataset/items.json`
- Videos ([content/videos/](content/videos/README.md)): real and AI clips made and shared by the team on [Canva](https://www.canva.com), and the AI singer "Nyla Stone" by [@nyla.stonesb](https://www.tiktok.com/@nyla.stonesb) on TikTok, shown with TikTok's official embedded player (not copied)
- Real SMS and spam: [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/), Almeida & Hidalgo (2011), CC BY 4.0
- Font: [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) by the Braille Institute (SIL Open Font License), via Google Fonts
- Libraries: [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript), [sharp](https://sharp.pixelplumbing.com), [hyparquet](https://github.com/hyparam/hyparquet), ESLint, Prettier
