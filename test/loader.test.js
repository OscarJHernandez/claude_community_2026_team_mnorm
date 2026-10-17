import { test } from "node:test";
import assert from "node:assert/strict";
import { getPair, getRound, getFixedPairs, difficultyOf, loadDataset } from "../dataset/loader.js";

const item = (id, is_real, difficulty, extra = {}) => ({
  id,
  modality: "text",
  category: "scam-vs-legit",
  subject: "bank",
  is_real,
  difficulty,
  ...extra,
});

const ITEMS = [
  item("r1", true, 1),
  item("r2", true, 3),
  item("r3", true, 5),
  item("f1", false, 1),
  item("f2", false, 3),
  item("f3", false, 5),
  item("img-r", true, 2, { modality: "image", category: "ai-image" }),
  item("img-f", false, 2, { modality: "image", category: "ai-image" }),
];

test("one-fake pairs have exactly one fake, same modality and category", () => {
  for (let n = 0; n < 50; n++) {
    const p = getPair(ITEMS, { mode: "one-fake", modality: "text" });
    assert.equal([p.left, p.right].filter((i) => !i.is_real).length, 1);
    assert.equal(p.left.category, p.right.category);
    assert.equal(p.left.modality, "text");
  }
});

test("both-real and both-fake modes", () => {
  const real = getPair(ITEMS, { mode: "both-real", modality: "text" });
  assert.ok(real.left.is_real && real.right.is_real && real.left.id !== real.right.id);
  const fake = getPair(ITEMS, { mode: "both-fake", modality: "text" });
  assert.ok(!fake.left.is_real && !fake.right.is_real);
});

test("picks items closest to the target difficulty", () => {
  const p = getPair(ITEMS, { mode: "one-fake", modality: "text", difficulty: 5 });
  assert.deepEqual([p.left.id, p.right.id].sort(), ["f3", "r3"]);
  assert.equal(p.pairDifficulty, 5);
});

test("returns null when nothing fits", () => {
  assert.equal(getPair(ITEMS, { mode: "both-real", modality: "image" }), null);
});

test("unknown mode throws a helpful error", () => {
  assert.throws(() => getPair(ITEMS, { mode: "nope" }), /Unknown mode/);
});

test("getFixedPairs joins items by their pair number and skips incomplete pairs", () => {
  const vids = [
    item("a-real", true, 2, { pair: 1 }),
    item("b-ai", false, 3, { pair: 2 }),
    item("a-ai", false, 2, { pair: 1 }),
    item("b-real", true, 3, { pair: 2 }),
    item("lonely", true, 3, { pair: 9 }),
    item("no-pair", false, 3),
  ];
  const pairs = getFixedPairs(vids);
  assert.equal(pairs.length, 2);
  for (const p of pairs) {
    assert.equal(p.left.pair, p.right.pair);
    assert.equal(p.mode, "one-fake");
  }
});

test("getRound ramps difficulty and never repeats an item", () => {
  const round = getRound(ITEMS, { modality: "text", mode: "one-fake", count: 3 });
  assert.equal(round.length, 3);
  const ids = round.flatMap((p) => [p.left.id, p.right.id]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    round.map((p) => p.pairDifficulty),
    [1, 3, 5],
  );
});

test("measured difficulty wins once enough players answered", () => {
  assert.equal(difficultyOf({ difficulty: 2 }), 2);
  assert.equal(difficultyOf({ difficulty: 2, stats: { shown: 5, correct: 0 } }), 2);
  assert.equal(difficultyOf({ difficulty: 2, stats: { shown: 100, correct: 10 } }), 5);
  assert.equal(difficultyOf({}), 3);
});

test("the real items.json loads and every image file exists", async () => {
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const items = await loadDataset();
  assert.ok(items.length > 0);
  for (const i of items.filter((i) => i.modality === "image")) {
    assert.ok(existsSync(fileURLToPath(i.src)), `missing ${i.content}`);
  }
});

test("image paths never give the answer away", async () => {
  const items = await loadDataset();
  for (const i of items.filter((i) => i.modality === "image")) {
    assert.match(i.content, /^images\/img-\d{4}\.jpg$/, `${i.id} should live at images/<id>.jpg`);
  }
});
