// `npm run data`: turn dataset/items.csv (+ images dropped in dataset/inbox/) into dataset/items.json.
// 1. Converts new images from inbox/ to small JPEGs in images/<id>.jpg and gives every row an id.
//    (One flat folder and one file type, so the file path never gives the answer away.)
// 2. Asks Claude to fill empty subject / difficulty / clues / explanation (skipped with --no-claude or without an API key).
// 3. Checks every row and explains problems in plain words.
// 4. Writes items.csv back (with the new ids/paths) and items.json for the app.
import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { readRows, writeRows } from "./lib/csv.mjs";
import { DATASET_DIR, CSV_PATH } from "./lib/paths.mjs";
import { enrichRow, claudeAvailable } from "./lib/claude.mjs";
import { toJpeg } from "./lib/images.mjs";

export const CATEGORIES = ["ai-image", "ai-vs-human", "scam-vs-legit"];
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const useClaude = !process.argv.includes("--no-claude");

const rows = await readRows(CSV_PATH);
const problems = [];
const warn = (row, n, msg) => problems.push(`  Row ${n + 2} (${row.id || row.content.slice(0, 40)}): ${msg}`);

// ---- 1. normalise rows, assign ids, move inbox images ----
const nextNumber = { img: maxId(rows, "img"), txt: maxId(rows, "txt") };
for (const row of rows) {
  row.modality ||= IMAGE_EXT.includes(extname(row.content).toLowerCase()) ? "image" : "text";
  if (row.modality === "image") row.category ||= "ai-image";
  const real = parseBool(row.is_real);
  if (real !== null) row.is_real = real ? "yes" : "no";
  if (!row.id) {
    const prefix = row.modality === "image" ? "img" : "txt";
    row.id = `${prefix}-${String(++nextNumber[prefix]).padStart(4, "0")}`;
  }
  if (row.modality === "image" && real !== null && !existsSync(join(DATASET_DIR, row.content))) {
    const inbox = join(DATASET_DIR, "inbox", row.content);
    if (existsSync(inbox)) {
      const dest = `images/${row.id}.jpg`;
      await mkdir(join(DATASET_DIR, "images"), { recursive: true });
      await writeFile(join(DATASET_DIR, dest), await toJpeg(await readFile(inbox)));
      await unlink(inbox);
      console.log(`Filed inbox/${row.content} -> ${dest}`);
      row.content = dest;
    }
  }
  if (row.difficulty && !row.difficulty_source) row.difficulty_source = "team";
  row.added_by ||= "team";
}

// ---- 2. let Claude fill the gaps ----
const needsEnrich = rows.filter((r) => !r.difficulty || !r.explanation || !r.clues || !r.subject);
if (needsEnrich.length && useClaude) {
  if (!claudeAvailable()) {
    console.warn(
      `⚠️  ${needsEnrich.length} row(s) have no subject/difficulty/clues/explanation, but ANTHROPIC_API_KEY is not set. Skipping Claude.`,
    );
  } else {
    console.log(`Asking Claude to rate ${needsEnrich.length} row(s)...`);
    for (const row of needsEnrich) {
      try {
        const out = await enrichRow(row, DATASET_DIR);
        if (!row.difficulty) {
          row.difficulty = String(out.difficulty);
          row.difficulty_source = "claude";
        }
        row.subject ||= out.subject;
        row.clues ||= out.clues.join("; ");
        row.explanation ||= out.explanation;
        process.stdout.write(".");
      } catch (err) {
        console.warn(`\n⚠️  Claude could not rate ${row.id}: ${err.message}`);
      }
    }
    process.stdout.write("\n");
  }
}

// ---- 3. validate ----
const items = [];
const seenIds = new Set();
for (const [n, row] of rows.entries()) {
  const before = problems.length;
  if (seenIds.has(row.id)) warn(row, n, `id "${row.id}" is used twice.`);
  seenIds.add(row.id);
  if (!["image", "text"].includes(row.modality))
    warn(row, n, `modality must be "image" or "text", not "${row.modality}".`);
  if (parseBool(row.is_real) === null) warn(row, n, `is_real must be yes or no, not "${row.is_real}".`);
  if (!CATEGORIES.includes(row.category))
    warn(row, n, `category must be one of ${CATEGORIES.join(", ")}, not "${row.category}".`);
  if (!row.content) warn(row, n, "content is empty (put the image file name or the message text here).");
  if (row.modality === "image" && row.content && !existsSync(join(DATASET_DIR, row.content)))
    warn(row, n, `image file "${row.content}" not found in dataset/ or dataset/inbox/.`);
  const d = row.difficulty ? Number(row.difficulty) : null;
  if (d !== null && !(Number.isInteger(d) && d >= 1 && d <= 5))
    warn(row, n, `difficulty must be a whole number 1-5, not "${row.difficulty}".`);
  if (problems.length > before) continue;

  items.push({
    id: row.id,
    modality: row.modality,
    is_real: parseBool(row.is_real),
    category: row.category,
    subject: row.subject || null,
    content: row.content,
    difficulty: d,
    difficulty_source: d === null ? null : row.difficulty_source || "team",
    clues: row.clues
      ? row.clues
          .split(";")
          .map((c) => c.trim())
          .filter(Boolean)
      : [],
    explanation: row.explanation || null,
    source: {
      dataset: row.source_dataset || null,
      license: row.source_license || null,
      author: row.source_author || null,
      generator: row.source_generator || null,
      prompt: row.source_prompt || null,
      original_id: row.source_original_id || null,
    },
    added_by: row.added_by,
  });
}

// ---- 4. write ----
await writeRows(CSV_PATH, rows);
await writeFile(
  join(DATASET_DIR, "items.json"),
  JSON.stringify({ version: 1, generated_at: new Date().toISOString(), count: items.length, items }, null, 2) + "\n",
);

console.log(`\n✅ Wrote dataset/items.json with ${items.length} items.`);
console.table(summary(items));
if (problems.length) {
  console.log(`\n⚠️  ${problems.length} problem(s). These rows were left out of items.json until fixed in items.csv:`);
  console.log(problems.join("\n"));
  process.exitCode = 1;
}

function parseBool(v) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (["yes", "y", "true", "1", "real", "legit"].includes(s)) return true;
  if (["no", "n", "false", "0", "fake", "scam", "ai"].includes(s)) return false;
  return null;
}

function maxId(rows, prefix) {
  return rows.reduce((m, r) => {
    const match = r.id?.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
}

function summary(items) {
  const table = {};
  for (const i of items) {
    const key = `${i.category} / ${i.is_real ? "real" : "fake"}`;
    table[key] ??= { count: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, unrated: 0 };
    table[key].count++;
    table[key][i.difficulty ? `d${i.difficulty}` : "unrated"]++;
  }
  return table;
}
