// Build a starter set of AI-generated vs real photos, matched by subject.
//   Fake: OwensLab/CommunityForensics-Small on Hugging Face (CC BY-NC-SA 4.0). We only pick images whose prompt is a
//         plain photo caption (e.g. "a black and yellow bee on a green leaf") and that are not flagged NSFW.
//   Real: a freely licensed photo of the same subject from Wikimedia Commons (license + author saved per image).
// No people: prompts mentioning people are skipped (no real personal data).
// Files land in dataset/inbox/; `npm run data` moves them into images/real|fake and assigns ids.
// Usage: node scripts/fetch-images.mjs [--count 20]
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { appendRows, readRows } from "./lib/csv.mjs";
import { CSV_PATH, DATASET_DIR } from "./lib/paths.mjs";
import { arg } from "./lib/util.mjs";

const COUNT = Number(arg("--count", 20));
const HF =
  "https://datasets-server.huggingface.co/rows?dataset=OwensLab/CommunityForensics-Small&config=default&split=train";
const BROWSABLE_ROWS = 10000; // the HF viewer only exposes the first ~10.5k rows
const UA = { "User-Agent": "RealOrFakeDataset/0.1 (Claude Impact Lab Berlin hackathon)" };
const INBOX = join(DATASET_DIR, "inbox");

const PEOPLE =
  /\b(man|men|woman|women|person|people|boy|girl|child|children|kid|kids|baby|player|lady|guy|he|she|his|her|they|crowd|family|couple|skier|surfer|rider)\b/i;
const STOP = new Set(
  "a an the of on in at with and or some is are to two three four several many very next near by for from its this that there it top up out sitting standing laying lying parked large small big little old new full front".split(
    " ",
  ),
);
const FREE_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? \d)/i;

await mkdir(INBOX, { recursive: true });
const existing = new Set((await readRows(CSV_PATH)).map((r) => r.source_original_id));
const perModel = {};
const usedReal = new Set();
const rows = [];

for (let offset = 0; offset < BROWSABLE_ROWS && rows.length / 2 < COUNT; offset += 61) {
  const page = await getJson(`${HF}&offset=${offset}&length=4`).catch(() => null);
  for (const { row: r } of page?.rows ?? []) {
    if (rows.length / 2 >= COUNT) break;
    const id = `${r.model_name}/${r.image_name}`;
    if (r.label !== 1 || r.nsfw_flag || !r.real_source.startsWith("coco") || PEOPLE.test(r.prompt)) continue;
    if (r.prompt.length > 90 || existing.has(id) || (perModel[r.model_name] ?? 0) >= 2) continue;

    const keywords = r.prompt
      .toLowerCase()
      .replace(/[^a-z ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .slice(0, 3);
    if (keywords.length < 2) continue;
    const real = await findRealPhoto(keywords);
    if (!real) continue;

    const subject = keywords.slice(0, 2).join(" ");
    const fakeFile = `fake-${safe(r.model_name)}-${r.image_name}`;
    const realFile = `real-${safe(real.title)}.jpg`;
    await writeFile(join(INBOX, fakeFile), Buffer.from(r.image_data, "base64"));
    await writeFile(join(INBOX, realFile), real.bytes);
    perModel[r.model_name] = (perModel[r.model_name] ?? 0) + 1;

    rows.push(
      {
        modality: "image",
        is_real: "no",
        category: "ai-image",
        subject,
        content: fakeFile,
        source_dataset: "CommunityForensics-Small",
        source_license: "CC BY-NC-SA 4.0",
        source_generator: r.model_name,
        source_original_id: id,
        added_by: "fetch-images",
        explanation: "",
        clues: "",
      },
      {
        modality: "image",
        is_real: "yes",
        category: "ai-image",
        subject,
        content: realFile,
        source_dataset: "Wikimedia Commons",
        source_license: real.license,
        source_author: real.artist,
        source_generator: "",
        source_original_id: real.pageUrl,
        added_by: "fetch-images",
      },
    );
    console.log(`✓ ${subject.padEnd(22)} fake: ${r.model_name}  |  real: ${real.title} (${real.license})`);
  }
}

const added = await appendRows(CSV_PATH, rows);
console.log(`\nAdded ${added} image rows (${added / 2} pairs). Files are in dataset/inbox/. Next: npm run data`);

async function findRealPhoto(keywords) {
  // Try the most specific search first, then fewer keywords.
  for (let n = keywords.length; n >= 2; n--) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6",
      gsrlimit: "15",
      gsrsearch: `${keywords.slice(0, n).join(" ")} filetype:bitmap -portrait -people`,
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime|size",
      iiurlwidth: "512",
      iiextmetadatafilter: "LicenseShortName|Artist",
    });
    const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`).catch(() => null);
    const pages = Object.values(data?.query?.pages ?? {}).sort((a, b) => a.index - b.index);
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      const license = ii?.extmetadata?.LicenseShortName?.value ?? "";
      if (!ii || ii.mime !== "image/jpeg" || ii.width < 512 || !FREE_LICENSE.test(license) || usedReal.has(p.title))
        continue;
      const img = await fetch(ii.thumburl, { headers: UA });
      if (!img.ok) continue;
      usedReal.add(p.title);
      return {
        title: p.title.replace(/^File:/, ""),
        license,
        artist: (ii.extmetadata?.Artist?.value ?? "unknown")
          .replace(/<[^>]+>/g, "")
          .trim()
          .slice(0, 80),
        pageUrl: ii.descriptionurl,
        bytes: Buffer.from(await img.arrayBuffer()),
      };
    }
  }
  return null;
}

async function getJson(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function safe(s) {
  return s
    .replace(/\.[a-z]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .toLowerCase();
}
