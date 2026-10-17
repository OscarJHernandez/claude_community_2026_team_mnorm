// Translate dataset items to German for the app: content/dataset-de.json (keyed by item id).
// Usage: npm run translate            (only items that have no German yet)
//        npm run translate -- --all   (redo every item)
// Needs ANTHROPIC_API_KEY in .env. Review the result in a pull request before the demo.
import { readFile, writeFile } from "node:fs/promises";
import { askJson, claudeAvailable } from "../server/lib/claude.mjs";

const ITEMS = new URL("../dataset/items.json", import.meta.url);
const OUT = new URL("../content/dataset-de.json", import.meta.url);

const SCHEMA = {
  type: "object",
  properties: {
    content: { type: "string" },
    clues: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
  },
  required: ["content", "clues", "explanation"],
  additionalProperties: false,
};

const SYSTEM = `Translate this item from a "Real or Fake?" learning game for older adults into natural German.
Use the polite "Sie". Keep it short, warm and plain, no jargon.
- content: the message itself. Translate so it reads like a real German SMS/email of the same kind (keep links,
  amounts in euro instead of pounds, keep typos/slang style if they are a clue). For images, return "".
- clues and explanation: translate faithfully, same number of clues.`;

if (!claudeAvailable()) {
  console.error("No ANTHROPIC_API_KEY in .env. Add one, then run again.");
  process.exit(1);
}

const { items } = JSON.parse(await readFile(ITEMS, "utf8"));
const out = JSON.parse(await readFile(OUT, "utf8"));
const all = process.argv.includes("--all");
const todo = items.filter((i) => all || !out.items[i.id]);
console.log(`Translating ${todo.length} items…`);

let done = 0;
async function worker() {
  while (todo.length) {
    const item = todo.shift();
    const text = JSON.stringify({
      modality: item.modality,
      content: item.modality === "text" ? item.content : "",
      clues: item.clues,
      explanation: item.explanation,
    });
    try {
      const de = await askJson({ system: SYSTEM, text, schema: SCHEMA });
      out.items[item.id] = item.modality === "text" ? de : { clues: de.clues, explanation: de.explanation };
      console.log(`  ${++done} ${item.id}`);
    } catch (err) {
      console.warn(`  skipped ${item.id}: ${err.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`Saved ${Object.keys(out.items).length} translations to content/dataset-de.json`);
