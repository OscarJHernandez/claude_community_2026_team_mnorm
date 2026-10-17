import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolvePublicPath } from "../server.mjs";
import { ruleCheck } from "../server/routes/check.mjs";

const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("server only serves the public folders", () => {
  assert.ok(resolvePublicPath("/app/index.html"));
  assert.ok(resolvePublicPath("/dataset/items.json"));
  assert.equal(resolvePublicPath("/.env"), null);
  assert.equal(resolvePublicPath("/server.mjs"), null);
  assert.equal(resolvePublicPath("/app/../.env"), null);
  assert.equal(resolvePublicPath("/app/%2e%2e/.env"), null);
  assert.equal(resolvePublicPath("/scripts/lib/claude.mjs"), null);
});

test("offline scam check flags classic scams and passes normal messages", async () => {
  const scam = await ruleCheck(
    "URGENT: your account is blocked. Confirm your PIN today at secure-bank-verify.com",
    "en",
  );
  assert.equal(scam.verdict, "scam");
  const safe = await ruleCheck("Hi Anna, it's Ingrid from the choir. Practice moves to Thursday 18:00. See you!", "en");
  assert.equal(safe.verdict, "safe");
  const de = await ruleCheck("Hallo Mama, das ist meine neue Nummer. Kannst du mir 480 € überweisen?", "de");
  assert.equal(de.verdict, "scam");
  assert.match(de.headline, /Betrug/);
});

test("every feed file has 7 clips that exist", async () => {
  const { items } = await json("../dataset/items.json");
  const ids = new Set(items.map((i) => i.id));
  const showcase = new Set(["v1", "a2", "e3", "v6", "n7"]);
  for (const file of await readdir(new URL("../content/feed/", import.meta.url))) {
    const { clips } = await json(`../content/feed/${file}`);
    assert.equal(clips.length, 7, file);
    for (const entry of clips) {
      const [kind, key] = (typeof entry === "string" ? entry : entry.id).split(":");
      assert.ok(kind === "showcase" ? showcase.has(key) : ids.has(key), `${file}: unknown clip ${kind}:${key}`);
    }
  }
});

test("German dataset texts only reference real items", async () => {
  const { items } = await json("../dataset/items.json");
  const ids = new Set(items.map((i) => i.id));
  const de = await json("../content/dataset-de.json");
  for (const [id, t] of Object.entries(de.items)) {
    assert.ok(ids.has(id), id);
    assert.ok(t.explanation && Array.isArray(t.clues), id);
  }
});

test("app texts exist in English and German", async () => {
  globalThis.window = {};
  await import("../app/i18n.js");
  const { en, de } = globalThis.window.I18N;
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
});

test("every Learn lesson has its own cards and quiz in English and German", async () => {
  const { lessons } = await json("../content/lessons.json");
  const ids = ["what", "safety", "images", "scams", "ask", "write", "report", "phone"];
  const firstCards = new Set();
  for (const id of ids) {
    for (const lang of ["en", "de"]) {
      const L = lessons[id]?.[lang];
      assert.ok(L, `${id}/${lang} missing`);
      assert.equal(L.cards.length, 3, `${id}/${lang}`);
      assert.ok(L.q && L.ok && L.options.length === 3, `${id}/${lang}`);
      assert.ok(L.correct >= 0 && L.correct < L.options.length, `${id}/${lang}`);
    }
    firstCards.add(lessons[id].en.cards[0].text);
  }
  assert.equal(firstCards.size, ids.length, "lessons must not share content");
});
