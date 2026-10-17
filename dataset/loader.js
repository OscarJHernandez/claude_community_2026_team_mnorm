// "Real or Fake?" dataset loader. Zero dependencies, works in the browser and in Node 18+.
//
//   import { loadDataset, getPair, getRound } from "./dataset/loader.js";
//   const items = await loadDataset();
//   const pair  = getPair(items, { modality: "image", difficulty: 2 });
//   // pair.left / pair.right are items; each has is_real, explanation, clues, src (images) or content (texts)

const DEFAULT_URL = new URL("./items.json", import.meta.url);

// The four kinds of pair. "random" picks one of these, with one-fake twice as likely.
export const MODES = {
  "one-fake": [true, false],
  "both-real": [true, true],
  "both-fake": [false, false],
};
const RANDOM_MODES = ["one-fake", "one-fake", "both-real", "both-fake"];

/** Load items.json. Image items get an absolute `src` you can put straight into <img src>. */
export async function loadDataset(url = DEFAULT_URL) {
  const href = new URL(url, typeof location !== "undefined" ? location.href : DEFAULT_URL).href;
  let data;
  if (href.startsWith("file:")) {
    const { readFile } = await import("node:fs/promises");
    data = JSON.parse(await readFile(new URL(href), "utf8"));
  } else {
    const res = await fetch(href);
    if (!res.ok) throw new Error(`Could not load dataset (${res.status}) from ${href}`);
    data = await res.json();
  }
  return data.items.map((item) =>
    item.modality === "image" ? { ...item, src: new URL(item.content, href).href } : item,
  );
}

/**
 * Difficulty 1 (obvious) to 5 (very hard). Once the app has collected enough answers
 * (item.stats = { shown, correct }), the measured difficulty wins over the hand/Claude rating.
 */
export function difficultyOf(item, minShown = 20) {
  const s = item.stats;
  if (s && s.shown >= minShown) return 1 + Math.round(4 * (1 - s.correct / s.shown));
  return item.difficulty ?? 3;
}

/**
 * Pick two items of the same modality and category.
 * Options:
 *   modality   "image" | "text"            (optional)
 *   category   "ai-image" | "ai-vs-human" | "scam-vs-legit"   (optional, otherwise any that works)
 *   difficulty 1..5 target                  (optional, default 3)
 *   mode       "one-fake" | "both-real" | "both-fake" | "random" (default "random")
 *   exclude    ids not to use (e.g. already shown)
 * Returns { left, right, mode, category, pairDifficulty } or null if nothing fits.
 */
export function getPair(
  items,
  { modality, category, difficulty = 3, mode = "random", exclude = [], rng = Math.random } = {},
) {
  const excluded = new Set(exclude);
  const pool = items.filter(
    (i) => (!modality || i.modality === modality) && (!category || i.category === category) && !excluded.has(i.id),
  );
  const categories = shuffle([...new Set(pool.map((i) => i.category))], rng);
  const modes = mode === "random" ? [pick(RANDOM_MODES, rng), ...shuffle(Object.keys(MODES), rng)] : [mode];

  for (const m of new Set(modes)) {
    if (!MODES[m]) throw new Error(`Unknown mode "${m}". Use one of: random, ${Object.keys(MODES).join(", ")}`);
    const [wantA, wantB] = MODES[m];
    for (const cat of categories) {
      const inCat = pool.filter((i) => i.category === cat);
      const a = closest(
        inCat.filter((i) => i.is_real === wantA),
        difficulty,
        null,
        rng,
      );
      if (!a) continue;
      const b = closest(
        inCat.filter((i) => i.is_real === wantB && i.id !== a.id),
        difficulty,
        a.subject,
        rng,
      );
      if (!b) continue;
      const [left, right] = rng() < 0.5 ? [a, b] : [b, a];
      return {
        left,
        right,
        mode: m,
        category: cat,
        pairDifficulty: Math.round((difficultyOf(a) + difficultyOf(b)) / 2),
      };
    }
  }
  return null;
}

/** A game round: `count` pairs going from easy (`start`) to hard (`end`), never repeating an item. */
export function getRound(items, { count = 10, start = 1, end = 5, ...opts } = {}) {
  const used = [...(opts.exclude ?? [])];
  const round = [];
  for (let n = 0; n < count; n++) {
    const difficulty = count === 1 ? start : Math.round(start + ((end - start) * n) / (count - 1));
    const pair = getPair(items, { ...opts, difficulty, exclude: used });
    if (!pair) break;
    used.push(pair.left.id, pair.right.id);
    round.push(pair);
  }
  return round;
}

// Closest difficulty wins; within ±1 of the target, the same subject is preferred; ties are random.
function closest(candidates, target, subject, rng) {
  if (!candidates.length) return null;
  const scored = shuffle(candidates, rng).map((i) => {
    const gap = Math.abs(difficultyOf(i) - target);
    const subjectBonus = subject && i.subject === subject && gap <= 1 ? -1.5 : 0;
    return { i, score: gap + subjectBonus };
  });
  scored.sort((x, y) => x.score - y.score);
  return scored[0].i;
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}
