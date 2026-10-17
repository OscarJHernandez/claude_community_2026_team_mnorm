# Fenster best practices

> How we build and improve features. Check this list before you open a pull request.
> Design rules: [DESIGN_PHILOSOPHY.md](DESIGN_PHILOSOPHY.md) · Structure: [ARCHITECTURE.md](ARCHITECTURE.md)

## 1. Audience first

- Test every screen with the domain expert's eyes: **would Anna (72) understand this in 5 seconds?**
- Follow the [screen checklist](DESIGN_PHILOSOPHY.md#checklist-for-every-new-screen): one idea, one main action,
  text ≥ 20px, targets ≥ 60px, a word on every icon, Back top-left.
- Try every screen with **"Bigger text" on**, in **German**, and at **375px wide**.
- Turn on "reduce motion" in your OS once per feature and check nothing breaks.

## 2. AI is always visible and honest

- Anything Claude wrote, judged or made uses the violet AI style and the **✦ AI** label
  (`--fs-ai`, see `design/index.html#ai`).
- Every AI answer ends with "AI can be wrong too" / "Auch KI kann sich irren".
- Never present AI output as a fact from Fenster or as a person's words.
- AI-made pictures carry the "✦ Made with AI" stamp, also when shared.
- In demos and docs, say clearly: **people learn about AI, with AI (Claude), and how to protect themselves.**

## 3. Safety and privacy

- **No real personal data**, ever. Use the demo persona (Anna, Max, Ingrid) and fake numbers like `+49 1577 ••• 302`.
- **No real brands in fake content.** Scam examples use made-up names (Stadtbank, Rail Travel, The New York Chronicle)
  and fake links (`.example`, `.top`, `parcel-track-help.info`).
- Never ask the user for a PIN, password or bank details, not even in a game.
- The scam checker **never opens or fetches** links it is given.
- Dataset rules from `dataset/README.md` apply: no identifiable people in images, licenses recorded per item.
- **No secrets in git.** `ANTHROPIC_API_KEY` lives in `.env` (git-ignored). The key is only read in `server.mjs`
  and `scripts/`, never sent to the browser.

## 4. Claude in the product

- **Prompts live in `/prompts/*.md`**, one file per job. No prompt text inside JS files.
- One shared client per side (`scripts/lib/claude.mjs`, `server/lib/claude.mjs`). One `MODEL` constant
  (`claude-opus-5-5`). Don't scatter model names.
- Ask for **JSON with a schema** (`output_config.format`) whenever the app reads the answer. Check
  `stop_reason === "refusal"` and keep the server-side fallback on.
- Live routes: `effort: "low"`, 15 s timeout, input capped at 2,000 characters, answer in the user's language.
- **Every live call has a fallback**: a saved answer in `content/ai-fallback/` and a friendly message
  ("Something didn't work. Please try again."). The demo must never show a stack trace or a spinner forever.
- Prefer **build-time** Claude work (ratings, translations, daily feed) that a person reviews in a PR over live
  calls the user waits for.
- When you change a prompt, run it on 3–5 real examples in both languages and paste the results in the PR.

## 5. Content

Each feed clip (dataset or showcase) must have:

- [ ] the media (image path, text, or showcase markup) and **credits/license**
- [ ] the correct answer (`is_real`)
- [ ] 2–4 **clues** the user can actually see
- [ ] one **Aha** sentence: a habit they can reuse
- [ ] a lesson link
- [ ] English **and** German text (`clues_de`, `explanation_de` for dataset items)
- [ ] a difficulty (1–5)

Daily feed of 7: start easy, mix media types (video, article, email/SMS, photo, voice note, website), and include
2–3 real items. The dataset is the source of truth for images and messages: edit `dataset/items.csv`, then
`npm run data` (see `dataset/HOW_TO_ADD.md`).

## 6. Text and translations

- **No hard-coded UI text.** Every string is a key in `app/i18n/en.json` **and** `de.json`, added in the same PR.
- German uses "Sie". Short sentences. German is ~30% longer: check that buttons still fit.
- Use the words from the [voice table](DESIGN_PHILOSOPHY.md#words-voice-and-tone): "Make a picture", not "Generate".
- Run the key-check before committing (a test compares the two files and fails on missing keys).

## 7. Motivation and community

- Every answer ends with *why* + an Aha sentence. Never just "right/wrong".
- Reward effort: points for playing, a streak with rest days, kind level names.
- Celebrate briefly: "+20 ⭐" pop (900 ms); confetti only for level-ups and badges, max 1 s.
- Rankings show **only the user's group**, the user highlighted, no "last place" label. Show the group goal.
- Every finished game, lesson or AI creation offers **Share with family** (Web Share / WhatsApp link) with a
  friendly, prefilled message in the user's language.

## 8. Code

- Plain ES modules, no framework. Small files: one screen per file in `app/js/screens/`, shared UI in
  `app/js/components/`.
- Use **design tokens** (`var(--fs-…)`) for every colour, size, radius and duration. No hex codes in components.
- Screens render from data; state goes through `lib/progress.js`; network goes through `lib/api.js`.
- Escape any text that came from a user or from Claude before putting it into HTML.
- Wrap `localStorage` in try/catch (private mode can throw).
- Keep it accessible: real `<button>`s, `aria-pressed` on toggles, `alt` text on images (empty `alt` only on
  pure decoration, and never on the image the user must judge: describe it neutrally without giving the answer
  away), visible focus outline.
- `npm run check` must pass (ESLint + Prettier + tests). Run `npm run format` before you commit.
- Add a `node --test` test for any logic (feed building, scoring, streaks, fallbacks).

## 9. Working as a team (from CLAUDE.md)

- `git pull` before you start. Small commits with clear messages. Push often.
- Split work by file or folder. Two people never edit the same file at the same time; if you must, use a branch.
- Merge conflicts: keep both sides' intent and explain in plain words what you kept.
- Credit every library, dataset and asset in the README.
- Don't delete files a teammate created without asking.

## 10. Definition of done (a feature)

- [ ] Works end to end on `npm start`, in English and German, on a phone-width window
- [ ] Passes the screen checklist and section 2 (AI visible) above
- [ ] Has a fallback if Claude or the network fails
- [ ] Text in both i18n files; no hard-coded strings
- [ ] `npm run check` passes
- [ ] Docs updated if a decision changed (`ARCHITECTURE.md` decisions log)
- [ ] The domain expert has tried it

## 11. Recording the demo video

1. `npm start`, open http://localhost:3000/?demo=1 in a clean browser window (no bookmarks bar, zoom 100%).
2. Use a phone-sized window (about 400 × 860) or the browser's device mode.
3. Follow the script: WhatsApp invite → onboarding (choose Deutsch, bigger text) → window intro → swipe 3 clips
   (one wrong answer → gentle help + lesson) → scam checker with Claude live → result → share with family.
4. Record once in German, once in English. Keep it under 2 minutes.
5. Have the saved AI answers ready (`content/ai-fallback/`) in case the venue Wi-Fi is slow.
