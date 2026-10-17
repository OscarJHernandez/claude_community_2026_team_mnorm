// Tiny CSV reader/writer (RFC 4180: quotes, commas and newlines inside quotes). No dependencies.
import { mkdir, readFile, rmdir, writeFile } from "node:fs/promises";

export const COLUMNS = [
  "id",
  "modality",
  "is_real",
  "category",
  "subject",
  "content",
  "difficulty",
  "difficulty_source",
  "clues",
  "explanation",
  "source_dataset",
  "source_license",
  "source_author",
  "source_generator",
  "source_prompt",
  "source_original_id",
  "added_by",
];

export function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    inQuotes = false;
  text = text.replace(/^\uFEFF/, ""); // Excel adds a BOM
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

function escape(value) {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function stringifyCsv(rows, columns = COLUMNS) {
  const lines = [columns.join(",")];
  for (const r of rows) lines.push(columns.map((c) => escape(r[c])).join(","));
  return lines.join("\n") + "\n";
}

export async function readRows(path) {
  try {
    return parseCsv(await readFile(path, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function writeRows(path, rows) {
  await writeFile(path, stringifyCsv(rows));
}

/** Append rows, skipping any whose source_original_id + category already exist (makes fetch scripts re-runnable). */
export async function appendRows(path, newRows) {
  return withLock(`${path}.lock`, () => appendUnlocked(path, newRows));
}

// A lock folder, so two scripts running at the same time can't overwrite each other's rows.
async function withLock(lockDir, fn) {
  for (let n = 0; ; n++) {
    try {
      await mkdir(lockDir);
      break;
    } catch (err) {
      if (err.code !== "EEXIST" || n > 200) throw err;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  try {
    return await fn();
  } finally {
    await rmdir(lockDir);
  }
}

async function appendUnlocked(path, newRows) {
  const rows = await readRows(path);
  const seen = new Set(rows.map((r) => `${r.category}|${r.source_original_id || r.content}`));
  let added = 0;
  for (const r of newRows) {
    const key = `${r.category}|${r.source_original_id || r.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(r);
    added++;
  }
  await writeRows(path, rows);
  return added;
}
