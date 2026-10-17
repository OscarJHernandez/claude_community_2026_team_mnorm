# CLAUDE.md · Claude Impact Lab team project

You are helping a mixed team (not all developers) build a working demo in ONE day at the Claude Impact Lab Berlin.
Hard submission deadline: **16:00**. **Shipping a working demo beats perfect code.**

Read this whole file at the start of every session and follow it. When the team is unsure about a rule, answer from this file.

## The challenge
Theme: **AI education for everyone.** Build a working prototype that helps one real audience learn or use AI
(for example older adults, small business owners, job seekers, parents, newcomers, people with disabilities,
or workers in non-tech jobs). Another audience is fine if it is a real group of people.

At the start, help the team write down in the README, in one sentence each:
1. Who exactly is the audience?
2. What is their problem with AI today?
3. What will our demo let them do?

## Event rules (remind the team if they drift)
1. **Build today.** Ideas and research can come from before; the code is written on the day. No pre-built projects.
2. **Claude must be part of the product**, not just the tool that wrote it.
3. **Teams of 5**: at least 1 builder, 1 product or design and 1 domain expert; the other 2 seats can be a founder or anyone.
4. **Public repo** with a README anyone can follow.
5. **No secrets in Git.** API keys live in `.env` (git-ignored).
6. **Open-source libraries, APIs and assets are fine.** Credit them in the README.
7. **Be kind.** Help other teams and respect the venue.
8. **16:00 is final.** Late submissions are not judged.

## How the team is judged (optimise for this)
| Criteria | Points | What judges ask |
|---|---|---|
| Impact | 40 | Does it help a real audience learn or use AI? Would they actually use it? |
| Working demo | 20 | Does it really run? |
| Technical quality | 20 | Is it well built? |
| Creativity | 20 | Is the idea fresh? |

Judges watch the 2-minute demo video first, then read the README. So a clear audience, a demo that works,
and a README that explains it matter more than extra features.

## Plan for the day (keep the team on time)
- **11:00** Agree on audience, problem and the smallest demo. Write it in the README.
- **11:30** Skeleton running end to end (ugly is fine).
- **13:00 to 13:45** Lunch. Something must already run before lunch.
- **13:45** Improve the core flow, test it with the domain expert's eyes.
- **15:00** Feature freeze. Record the 2-minute demo video. Finish the README.
- **15:45** Submit. Do not wait for 15:59.

If the team is behind, suggest cutting scope instead of working faster.

## Team collaboration
- **Roles:** the builder drives the code; product or design shapes the user flow and the demo script;
  the domain expert speaks for the audience and tests every screen; the founder owns the pitch, the problem
  statement and the README. Everyone can prompt Claude.
- **One repo, one owner.** The owner created it from the template and added teammates as collaborators.
- **Before you start working: `git pull`.** After each small step: commit and push.
- **Split the work by file or folder** so two people never edit the same file at the same time.
  If two people must, use branches and merge often.
- **If there is a merge conflict,** resolve it, keep both sides' intent, and explain to the team in plain words what you kept.
- Non-engineers can work in Claude.ai or edit the README directly on GitHub. That counts.

## How to work (instructions for Claude)
- Ask 1 or 2 short questions first if the goal is unclear, then build.
- Build the **smallest thing that demos well**. Suggest cutting scope early.
- Prefer simple stacks: a single HTML file, Python, or Next.js. No complex infra.
- Explain what you did in plain language. Some teammates are not engineers.
- Make small commits with clear messages so the team can follow along.
- After each step, tell the team how to run or see it.

## Hard rules
- **Never put API keys or secrets in code or commits.** Read them from `.env` (`ANTHROPIC_API_KEY`).
- Never commit `.env`, `node_modules`, or large data files.
- Only use data the team is allowed to use. No real personal data. Use fake or sample data.
- Credit open-source libraries and assets in the README.
- Don't delete files the team created without asking.

## API key
- Each person can claim $100 in API credits with the QR code in the room: sign in with the Claude Console account
  you will use today. Your organization is filled in for you; add your name and submit once.
- Credits can take a while to arrive (the claim page says 1 to 2 business days). If yours are not there yet,
  build with a teammate's key in the meantime. Credits work with the API only, not Claude.ai subscriptions.
- Create an API key in the Console, run `cp .env.example .env` and paste the key into `.env`.

## Using Claude in the product
- Use the Anthropic API with a current model (check docs.claude.com for model names).
- Keep prompts in one clear place (e.g. `prompts/`) so they're easy to tweak.
- Handle errors simply: show a friendly message if the API call fails.

## Before the deadline
- Keep `README.md` filled in: what it does, who it's for, how to run it, screenshots, credits.
- At 15:00, remind the team to record the 2-minute demo video. It is required.
- One person per team submits the form: https://tally.so/r/1WPr9Q
  (team name, members, repo link, demo video link, who it is for). Make sure the repo is public
  and the video link opens for anyone.
- Agenda, rules and judging are also in the event repo:
  https://github.com/Claude-Community-Berlin/claude-impact-lab-berlin-2026-10-17
