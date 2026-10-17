// Sample real messages from the UCI SMS Spam Collection (CC BY 4.0) into dataset/items.csv.
//   ham  -> real human messages (category ai-vs-human, is_real yes)
//   spam -> real scam messages  (category scam-vs-legit, is_real no)
// By default it takes a hand-reviewed list of messages (family-friendly, no private names or real numbers).
// Usage: node scripts/fetch-texts.mjs [--random --human 15 --scam 8]
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRows } from "./lib/csv.mjs";
import { CSV_PATH } from "./lib/paths.mjs";
import { arg, seededShuffle } from "./lib/util.mjs";

const URL_ZIP = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip";
const SOURCE = { source_dataset: "UCI SMS Spam Collection", source_license: "CC BY 4.0" };

const dir = await mkdtemp(join(tmpdir(), "uci-sms-"));
console.log("Downloading UCI SMS Spam Collection...");
const res = await fetch(URL_ZIP);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
await writeFile(join(dir, "sms.zip"), Buffer.from(await res.arrayBuffer()));
execFileSync("unzip", ["-o", "-q", "sms.zip", "-d", "out"], { cwd: dir });
const lines = (await readFile(join(dir, "out", "SMSSpamCollection"), "utf8")).split("\n");

const messages = lines
  .map((line, n) => {
    const [label, ...rest] = line.split("\t");
    return { label, text: rest.join("\t").trim(), lineNo: n + 1 };
  })
  .filter((m) => m.text);

// Keep messages a player can read in a few seconds, and drop anything that could be personal data.
const readable = (m) =>
  m.text.length >= 40 && m.text.length <= 220 && !/&lt;|&gt;|&amp;/.test(m.text) && /[a-z]/.test(m.text);
const noPersonalData = (m) => !/\d{5,}|@\w|\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(m.text);
const familyFriendly = (m) =>
  !/sex|gay|xxx|horny|naughty|dirty|nude|adult|singles|per night|wife|babe|kiss/i.test(m.text);
const ok = (m) => readable(m) && familyFriendly(m);

// Hand-reviewed line numbers in the UCI file.
const CURATED = {
  ham: [5309, 1050, 244, 4778, 5337, 2280, 2883, 1594, 558, 611, 2245, 3275, 1582, 1271, 304],
  spam: [4113, 3676, 711, 5465, 5295, 320, 4374, 5459],
};
const random = process.argv.includes("--random");
const byLine = new Map(messages.map((m) => [m.lineNo, m]));

const human = !random
  ? CURATED.ham.map((n) => byLine.get(n))
  : seededShuffle(
      messages.filter((m) => m.label === "ham" && ok(m) && noPersonalData(m)),
      7,
    ).slice(0, Number(arg("--human", 15)));
// One message per opening phrase: UCI has many near-identical copies of the same spam.
const seenOpening = new Set();
const scam = !random
  ? CURATED.spam.map((n) => byLine.get(n))
  : seededShuffle(
      messages.filter((m) => m.label === "spam" && ok(m)),
      7,
    )
      .filter(
        (m) =>
          !seenOpening.has(m.text.slice(0, 15).toLowerCase()) && seenOpening.add(m.text.slice(0, 15).toLowerCase()),
      )
      .slice(0, Number(arg("--scam", 8)));

const rows = [
  ...human.map((m) => ({
    modality: "text",
    is_real: "yes",
    category: "ai-vs-human",
    subject: "sms-casual",
    content: m.text,
    ...SOURCE,
    source_original_id: `line-${m.lineNo}`,
    added_by: "fetch-texts",
  })),
  ...scam.map((m) => ({
    modality: "text",
    is_real: "no",
    category: "scam-vs-legit",
    subject: "sms-spam",
    content: m.text,
    ...SOURCE,
    source_original_id: `line-${m.lineNo}`,
    added_by: "fetch-texts",
  })),
];
const added = await appendRows(CSV_PATH, rows);
console.log(`Added ${added} new text rows to dataset/items.csv (${human.length} human, ${scam.length} scam sampled).`);
console.log("Please skim them in items.csv and delete any row that still looks personal.");
