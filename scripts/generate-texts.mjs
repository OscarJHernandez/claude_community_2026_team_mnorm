// Ask Claude to write more fake/legit messages into dataset/items.csv.
// Usage: node --env-file=.env scripts/generate-texts.mjs --kind ai-written|scam|legit [--count 10]
import { readRows, appendRows } from "./lib/csv.mjs";
import { CSV_PATH } from "./lib/paths.mjs";
import { claudeAvailable, writeTexts, MODEL } from "./lib/claude.mjs";
import { arg } from "./lib/util.mjs";

const KINDS = {
  "ai-written": { category: "ai-vs-human", is_real: "no" },
  scam: { category: "scam-vs-legit", is_real: "no" },
  legit: { category: "scam-vs-legit", is_real: "yes" },
};
const kind = arg("--kind");
const count = Number(arg("--count", 10));
if (!KINDS[kind]) {
  console.error(`Pick a kind: --kind ${Object.keys(KINDS).join(" | ")}`);
  process.exit(1);
}
if (!claudeAvailable()) {
  console.error(
    "ANTHROPIC_API_KEY is not set. Run `cp .env.example .env`, paste your key, and use `npm run generate -- --kind ...`.",
  );
  process.exit(1);
}

// AI-written messages should imitate the real human ones already in the dataset.
const examples =
  kind === "ai-written"
    ? (await readRows(CSV_PATH))
        .filter((r) => r.category === "ai-vs-human" && r.is_real === "yes")
        .slice(0, 12)
        .map((r) => r.content)
    : [];

console.log(`Asking Claude for ${count} "${kind}" messages...`);
try {
  const messages = await writeTexts({ kind, count, examples });
  const added = await appendRows(
    CSV_PATH,
    messages.map((m) => ({
      modality: "text",
      ...KINDS[kind],
      subject: m.subject,
      content: m.content,
      difficulty: String(m.difficulty),
      difficulty_source: "claude",
      clues: m.clues.join("; "),
      explanation: m.explanation,
      source_dataset: "claude-generated",
      source_license: "CC0 (team-generated)",
      source_generator: MODEL,
      added_by: "generate-texts",
    })),
  );
  console.log(`Added ${added} rows. Run \`npm run data\` to rebuild items.json.`);
} catch (err) {
  console.error(`Sorry, Claude could not write the messages: ${err.message}`);
  process.exit(1);
}
