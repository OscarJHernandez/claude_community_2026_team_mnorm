> 👋 **Starter for Claude Impact Lab teams.** Fill in each section below as you build and delete this note.
>
> 📅 **Agenda, rules, deadline and judging** are in the event repo: **[claude-impact-lab-berlin-2026-10-17](https://github.com/Claude-Community-Berlin/claude-impact-lab-berlin-2026-10-17)**. Read it first.
>
> ✅ **When you're finished:** record a 2-minute demo video, then submit with the **[submission form](https://tally.so/r/1WPr9Q)** before **16:00**. One submission per team.
>
> 🔑 Set your API key first: `cp .env.example .env`, then paste your key into `.env` (it's git-ignored, never commit it).

# <Project name>

**One line:** <what it does, for whom>

## The problem
<Who has this problem, and why it matters. 2–3 sentences.>

## What it does
<What a user can do with it. A short list is fine.>

## How Claude is used
<What Claude does inside the product: which model, what it reads, what it produces.>

## How to run it
Needs Node 20.6+.
```bash
npm install
cp .env.example .env    # paste your ANTHROPIC_API_KEY into .env (optional: without it the scam checker uses a simple offline check)
npm start               # then open http://localhost:3000
```
- `http://localhost:3000/?lang=de` or `?lang=en` to pick the language.
- `http://localhost:3000/app/journey.html` shows every screen side by side.
- `http://localhost:3000/design/` is the design system.
- `npm run check` runs lint, format check and tests. `npm run translate` adds German text for the dataset (needs the key).

Docs: [design philosophy](docs/DESIGN_PHILOSOPHY.md) · [architecture](docs/ARCHITECTURE.md) · [best practices](docs/BEST_PRACTICES.md)

**Live link (if any):** <link>

## Screenshots / demo
<Drop screenshots here, or link your 2-minute demo video.>

## Team
Teams of 5 (at least 1 builder, 1 product or design, 1 domain expert; plus founder or anyone). Link each name to a GitHub or LinkedIn profile, and replace the example row with your team.

| Name | Role / background |
|---|---|
| [Mehul Patel](https://github.com/nomadicmehul) *(example)* | Claude Ambassador, DevRel |
| [Your name](https://www.linkedin.com/in/your-profile) | Builder / Product or design / Domain expert / Founder |
| [Your name](https://github.com/your-username) | |
| [Your name](https://github.com/your-username) | |
| [Your name](https://github.com/your-username) *(optional)* | |
| [Your name](https://github.com/your-username) *(optional)* | |

## Credits
<Open-source libraries, APIs, datasets and assets you used.>

**Dataset** (details in [dataset/README.md](dataset/README.md)):
- Fake images: [CommunityForensics-Small](https://huggingface.co/datasets/OwensLab/CommunityForensics-Small) (CC BY-NC-SA 4.0)
- Real photos: [Wikimedia Commons](https://commons.wikimedia.org), license and author per image in `dataset/items.json`
- Real SMS and spam: [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/), Almeida & Hidalgo (2011), CC BY 4.0
- Font: [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) by the Braille Institute (SIL Open Font License), via Google Fonts
- Libraries: [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript), ESLint, Prettier
