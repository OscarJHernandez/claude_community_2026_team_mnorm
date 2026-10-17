# Fenster design philosophy

> Read this before you design or build any screen. When two rules seem to clash, the one higher up wins.
> Visual reference: [`design/index.html`](../design/index.html) · Tokens: [`design/tokens.css`](../design/tokens.css)

## Who we design for

**Anna, 72.** She uses WhatsApp every day to talk to her family. She reads with glasses, taps carefully and
gets nervous when a screen "does something" she didn't ask for. She has heard that AI is dangerous, and that
scammers use it. Nobody has ever shown her how it works. She is clever and curious, and **she does not want to
feel stupid.**

Every screen should feel to her like **a calm, friendly window**: she can see clearly what's on the other side,
she always knows where she is, and she can always step back.

## The seven principles

### 1. Clear before clever
One screen = one idea = one main action. If a screen needs a second main button, it is two screens.
No hidden gestures that are the *only* way to do something: swiping is a shortcut, never the only path
(the feed always has a big **Next** button).

### 2. Calm and clean
Lots of space, few elements, quiet colours. Only one thing on a screen may be loud: the main action or
the big moment (a score, a warning). No decoration that doesn't explain something. No autoplaying sound.
No pop-ups the user didn't ask for. Remove before you add.

### 3. Big, readable, tappable
Text 20px at least (meta text 17px, never body text). Line height 1.5. Short lines, short sentences.
Every touch target at least 60px high and wide, with 12px between targets. Every icon has a word next to it.
"Make the text bigger" is always one tap away (onboarding step 1 and Profile).

### 4. Always say it's AI
Anything Claude wrote, judged or made appears in the **AI colour (violet)** with the **✦ AI** label, and ends
with *"AI can be wrong too."* The user must always be able to tell **what a person made, what AI made,
and what Fenster explains about AI.** We teach people to use AI *with* AI, and we are honest about it.

### 5. Never blame, always explain
A wrong answer is "Not quite" in warm honey colour with 💛, never red, never "Wrong". Red means only one thing:
**real danger out in the world** (a scam, a risky link). Every answer, right or wrong, is followed by
*why*, so every round ends with something learned (the **Aha!** moment).

### 6. Celebrate effort, together
Reward showing up, not only being right: points for playing, a streak that forgives a missed day, levels with
kind names. Compare with family and friends to cheer each other on, not to shame: no "last place", show the
group goal and your neighbours on the ranking. Sharing is a gift ("Look what I learned"), not a brag.

### 7. Always a way back
Every screen has a **‹ Back** button with the word "Back", top-left, same place every time. Nothing important
is ever lost by tapping Back. Destructive actions ask once, in plain words.

## Layout rules

These keep every screen predictable. Anna learns the layout once and it works everywhere.

**The screen has three fixed zones**

```
┌──────────────────────────────┐
│ ‹ Back      Title     EN|DE │  1. Top bar: where am I, how do I go back, language
├──────────────────────────────┤
│                              │
│  Heading (one line, 28–35px) │  2. Content: one column, top to bottom,
│  One short sentence          │     most important thing first
│                              │
│  [ the one thing to look at ]│
│                              │
│  ( Main action button      ) │  ← main action at the bottom of the content,
│  ( Secondary, outlined     ) │     full width, thumb height
├──────────────────────────────┤
│ Home Learn Try AI Rank   Me  │  3. Bottom tabs: icon + word, always the same 5
└──────────────────────────────┘
```

- **One column.** Never put two pieces of text side by side on a phone. Side-by-side is only for equal choices
  (Real | Fake) or small stats (🔥 5 | ⭐ 340).
- **Reading order = importance order.** Heading → what to look at → what to do. Nothing important below the
  main button.
- **Main action at the bottom**, full width, in reach of the thumb. At most one primary (filled) button per
  screen; others are outlined or text.
- **Same thing, same place.** Back top-left, language top-right, tabs at the bottom, "Real" always left and
  "Fake" always right, the AI explanation always slides up from the bottom.
- **Spacing:** 16px screen padding, 16px between blocks, 24–32px before a new section heading.
  Group things that belong together inside one card; don't use lines to separate.
- **Cards** are white on warm paper with a 1px hairline (`--fs-line`), 20px corners (`--fs-r`), 20–24px padding
  and a soft shadow (`--fs-shadow-sm`). A card is one topic. Never a card inside a card.
- **Max 3 things to choose from** on one screen, 5 in a list before you split it.
- **Desktop:** a sidebar (brand, navigation, progress, settings) and one centred column, max 680px wide.
  Bigger screen = more breathing room, not more content. The one exception is the game on wide screens
  (≥ 1100px): the picture on the left, the question and the explanation in a panel on the right, so the
  explanation never covers what she is looking at.

## Visual language: "calm editorial"

Anna trusts things that look like a good newspaper, a printed letter from her bank or a well-made book.
She distrusts things that look like a slot machine. So Fenster looks **quiet, warm and well made**, not playful.

| Element | Rule | Why |
|---|---|---|
| Paper | Warm ivory background (`--fs-bg`), white cards on top | Less glare than pure white, feels like paper |
| Ink | Deep green-black (`--fs-ink`), secondary text still ≥ 7:1 | Older eyes need real contrast; no light-grey text |
| Headings | Serif (**Newsreader**, `--fs-font-display`), 600 weight, slightly tight | Newspaper trust; makes each screen feel edited |
| Body | **Atkinson Hyperlegible**, ≥ 20px | Designed for low vision; never swap it out |
| Brand | One deep forest teal (`--fs-learn`), used with gradients only on the main button and hero cards | One confident colour reads as premium; many read as a toy |
| Depth | Soft, warm shadows (`--fs-shadow-*`) instead of thick outlines | Calm; things that float a little look tappable |
| Controls | Still clearly bounded: 1.5px `--fs-line-strong` border on choices and fields, ≥ 60px tall | Calm must never mean "where do I tap?" |
| Icons | Emoji sit in a soft tinted square or circle ("icon well") | Turns emoji from clip-art into a consistent system |
| Selected | Tinted fill **and** a ✓ tick on the right | Never colour alone |
| Motif | The arched window from the logo, faint, on hero cards and the start screen | The brand is a window: calm view, way back |

What to avoid: neon gradients, glassy "AI sparkle" everywhere, confetti on every tap, dark mode as default,
thin grey type, icons without words, more than one loud thing per screen.

## Colour means something

| Colour | Means | Used for |
|---|---|---|
| Teal | **Learn about AI** (and the Fenster brand) | lessons, main buttons, navigation |
| Violet ✦ | **AI made this** | Claude's answers, the AI helper, AI-made pictures |
| Blue 🛡 | **Protect yourself** | scam checker, safety rules, "Stop. Check. Call back." |
| Raspberry | **Together** | family, groups, cheers, invites |
| Gold ⭐ | **Reward** | points, levels, badges, streak |
| Green | **Right / safe** | correct answer, "looks safe" |
| Honey 💛 | **Not quite** | wrong answer, gentle tips |
| Red ⚠ | **Real danger** | scams, risky links. Nothing else. |

Colour never carries meaning alone: it always comes with an icon and a word.

## Motivation: what keeps Anna coming back

1. **The Aha! moment.** After every answer: one sentence she can reuse ("Readable writing on things usually
   means a real photo"). Saved to her **Aha notebook** so she can see how much she knows.
2. **Visible progress in her words.** Not "XP 340" but "You spotted 23 fakes this month. That's 23 times you
   protected yourself."
3. **A forgiving streak.** "🔥 6 days". Missing a day uses a rest day: "Your streak is safe."
4. **Kind levels.** Curious → Explorer → Fake spotter → AI helper → Family AI expert.
5. **Small celebrations.** A gentle "+20 ⭐" pop for each right answer, a bigger moment (soft confetti,
   max 1 second) only for level-ups and badges. Respect "reduce motion".
6. **Together.** Family group goal ("Together: 412 / 500 fakes spotted this week"), cheers (👏 ❤️), and
   "Challenge your family" after every game.

## Words (voice and tone)

- German uses **"Sie"**. English is warm and plain.
- Short sentences. One idea each. No jargon: say "made by AI", not "generated", "synthetic" or "deepfake"
  (explain the word once if we must use it).
- Speak to her as a capable adult: never "Oops!", never baby talk, never exclamation-mark spam.
- Every message tells her what happened **and** what she can do next.

| Instead of | Say |
|---|---|
| Wrong! | Not quite. That's okay, this one is tricky. |
| Error 500 | Something didn't work. Please try again. |
| Generate image | Make a picture |
| Deepfake detected | This voice was probably made by AI. |
| You lost your streak | Your streak is safe. You used a rest day. |
| Submit | Check it / Continue / Send |

## Checklist for every new screen

- [ ] One idea, one main action, main action at the bottom
- [ ] Back top-left with the word "Back"; language switch top-right
- [ ] Body text ≥ 20px, every target ≥ 60px, every icon has a word
- [ ] Contrast ≥ 4.5:1 (AA) for all text, ≥ 7:1 for body text where possible
- [ ] Anything from Claude is violet, labelled ✦ AI, and says "AI can be wrong too"
- [ ] No red unless it's a real-world danger
- [ ] Works in German (texts are ~30% longer) and with "bigger text" on
- [ ] Ends with something learned or a way to share it
- [ ] Works with "reduce motion" on
