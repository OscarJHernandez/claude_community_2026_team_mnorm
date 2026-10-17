// Download more images into dataset/inbox/ (as small JPEGs) and add rows to dataset/items.csv.
//
//   --source eval       AI-generated fakes from OwensLab/CommunityForensics-Eval (CC BY-NC-SA 4.0, educational use).
//                       ~21 generators, from old GANs (easy to spot) to Midjourney 6.1 / FLUX / Imagen 3 (very hard).
//                       Only the small metadata columns are read to choose images, so we never download the 50k images.
//   --source wikimedia  Real photos from Wikimedia Commons with a free license (license + author saved per image).
//                       "everyday" searches give ordinary snapshots; "showcase" searches use Featured pictures,
//                       polished photos that can look AI-made (good hard examples).
//
// New rows have no difficulty/clues/explanation yet: `npm run data` asks Claude to fill them.
// Always look through new images before committing (no children, nothing unsafe, no text that gives the answer away).
// Usage: node scripts/fetch-images.mjs --source eval|wikimedia [--count 100]
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { asyncBufferFromUrl, parquetMetadataAsync, parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { appendRows, readRows } from "./lib/csv.mjs";
import { CSV_PATH, DATASET_DIR, ROOT } from "./lib/paths.mjs";
import { toJpeg } from "./lib/images.mjs";
import { arg, seededShuffle } from "./lib/util.mjs";

const SOURCE = arg("--source");
const COUNT = Number(arg("--count", 100));
const INBOX = join(DATASET_DIR, "inbox");
const UA = {
  "User-Agent": "RealOrFakeDataset/0.2 (https://github.com/OscarJHernandez/claude_community_2026_team_mnorm)",
};

await mkdir(INBOX, { recursive: true });
const known = new Set((await readRows(CSV_PATH)).map((r) => r.source_original_id).filter(Boolean));

// ---------------------------------------------------------------------------------------------------------------
// Fakes: CommunityForensics-Eval
// ---------------------------------------------------------------------------------------------------------------
async function fetchEvalFakes() {
  const DATASET = "OwensLab/CommunityForensics-Eval";
  const ROWS_API = `https://datasets-server.huggingface.co/rows?dataset=${DATASET}&config=default&split=CompEval`;
  const TEXT_HEAVY =
    /\b(logo|poster|interface|screenshot|sheet music|cover|sign|menu|map|diagram|chart|text|font|label|quote|website|app|icon|card|book|flyer|banner|infographic|word|letter|software|template|pattern|vector|clipart|cartoon|t-?shirt|sticker|png|jpg)\b/i;
  const UNSAFE =
    /\b(child|children|kid|kids|baby|toddler|boy|girl|teen|school|nude|naked|sexy|lingerie|bikini|blood|gun|weapon|dead)\b/i;

  const index = await loadEvalIndex(DATASET);
  const candidates = index.filter((r) => {
    if (r.label !== 1 || r.nsfw || known.has(`${r.model}/${r.name}`)) return false;
    if (!r.prompt) return true; // unconditional generators: checked by eye during review
    const words = r.prompt.split(/\s+/);
    return (
      r.prompt.length >= 10 &&
      r.prompt.length <= 100 &&
      new Set(words).size > words.length / 2 && // drops "ip ip ip ip" junk
      !TEXT_HEAVY.test(r.prompt) &&
      !UNSAFE.test(r.prompt)
    );
  });

  // Same number from every generator, spread across its rows, so we get the full range of quality.
  const byModel = new Map();
  for (const r of candidates) byModel.set(r.model, [...(byModel.get(r.model) ?? []), r]);
  const perModel = Math.ceil(COUNT / byModel.size);
  console.log(`${candidates.length} usable fakes from ${byModel.size} generators; taking up to ${perModel} each.`);

  let added = 0;
  for (const [model, list] of byModel) {
    let taken = 0;
    const batch = [];
    for (const r of seededShuffle(list, 11)) {
      if (taken >= perModel || added + taken >= COUNT) break;
      // Very large images make the rows API fail with 500: retry once, then just pick another row.
      const res = await getJson(`${ROWS_API}&offset=${r.offset}&length=1`, 2).catch(() => null);
      const row = res?.rows?.[0]?.row;
      if (!row || row.image_name !== r.name || row.model_name !== model) continue; // offset mismatch: skip safely
      const file = `eval-${safe(model)}-${safe(r.name)}.jpg`;
      await writeFile(join(INBOX, file), await toJpeg(Buffer.from(row.image_data, "base64")));
      batch.push({
        modality: "image",
        is_real: "no",
        category: "ai-image",
        content: file,
        source_dataset: "CommunityForensics-Eval",
        source_license: "CC BY-NC-SA 4.0",
        source_generator: model,
        source_prompt: r.prompt,
        source_original_id: `${model}/${r.name}`,
        added_by: "fetch-images",
      });
      taken++;
    }
    added += await appendRows(CSV_PATH, batch); // save after every generator, so progress survives a crash
    console.log(`✓ ${model.padEnd(26)} ${taken}`);
  }
  console.log(`\nAdded ${added} fake images to dataset/inbox/. Review them, then: npm run data`);
}

/** Metadata (no images) for every row of the Eval set, cached in .cache/ so re-runs are instant. */
async function loadEvalIndex(dataset) {
  const cache = join(ROOT, ".cache", "cf-eval-index.json");
  if (existsSync(cache)) return JSON.parse(await readFile(cache, "utf8"));

  const { parquet_files: all } = await getJson(`https://datasets-server.huggingface.co/parquet?dataset=${dataset}`);
  // --index-files N: only index the first N files (row offsets stay correct because we always take a prefix).
  // The first ~230 files already contain all 21 generators, which saves time when Hugging Face rate-limits us.
  const files = all.slice(0, Number(arg("--index-files", all.length)));
  console.log(`Indexing ${files.length} parquet files (metadata only, ~2 minutes, cached afterwards)...`);
  // One small cache file per parquet file, so an interrupted run (e.g. rate limit) resumes where it stopped.
  const partsDir = join(ROOT, ".cache", "cf-eval-parts");
  await mkdir(partsDir, { recursive: true });
  const parts = new Array(files.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < files.length) {
        const i = next++;
        const partFile = join(partsDir, `${i}.json`);
        if (existsSync(partFile)) {
          parts[i] = JSON.parse(await readFile(partFile, "utf8"));
          continue;
        }
        parts[i] = await withRetry(async () => {
          const file = await asyncBufferFromUrl({ url: files[i].url });
          const metadata = await parquetMetadataAsync(file);
          const columns = ["image_name", "model_name", "label", "prompt", "nsfw_flag"];
          const rows = await parquetReadObjects({ file, metadata, columns, compressors });
          return rows.map((r) => ({ ...r, label: Number(r.label) }));
        });
        await writeFile(partFile, JSON.stringify(parts[i]));
        if (i % 50 === 0) process.stdout.write(`${i} `);
      }
    }),
  );
  let offset = 0;
  const index = parts.flatMap((rows) =>
    rows.map((r) => ({
      offset: offset++,
      name: r.image_name,
      model: r.model_name,
      label: Number(r.label),
      prompt: (r.prompt ?? "").trim(),
      nsfw: String(r.nsfw_flag).toLowerCase() === "true",
    })),
  );
  await mkdir(join(ROOT, ".cache"), { recursive: true });
  await writeFile(cache, JSON.stringify(index));
  console.log(`\nIndexed ${index.length} rows.`);
  return index;
}

// ---------------------------------------------------------------------------------------------------------------
// Reals: Wikimedia Commons
// ---------------------------------------------------------------------------------------------------------------
async function fetchWikimediaReals() {
  // subject -> search words. People searches are public scenes (work, markets, sport, music), adults only.
  const QUERIES = {
    animal: ["dog", "cat", "horse", "cow field", "fox", "deer", "squirrel", "goat"],
    bird: ["bird branch", "heron", "owl", "parrot", "seagull", "duck pond"],
    landscape: ["mountain valley", "desert", "forest path", "hills countryside", "canyon", "snow mountains"],
    water: ["lake", "waterfall", "beach waves", "river", "harbour boats", "coast cliffs"],
    plant: ["flower macro", "tulips", "mushroom forest", "cactus", "autumn leaves", "sunflower"],
    food: ["bread bakery", "fruit market stall", "cake", "vegetables", "soup bowl", "pizza"],
    building: ["church", "castle", "old house", "skyscraper", "bridge", "lighthouse"],
    interior: ["kitchen", "library interior", "living room", "cafe interior", "museum hall", "train station hall"],
    street: ["street city", "alley", "street market", "night street", "tram street", "crosswalk"],
    vehicle: ["bicycle", "vintage car", "train", "airplane", "bus", "boat"],
    object: ["teapot", "watch", "shoes", "old camera", "chair", "guitar"],
    people: [
      "market vendor",
      "street musician",
      "farmer field",
      "fisherman",
      "chef kitchen",
      "marathon runners",
      "cyclists race",
      "crowd festival",
    ],
  };
  const POOLS = {
    everyday: (q) => `${q} filetype:bitmap -portrait`,
    showcase: (q) => `incategory:"Featured_pictures_on_Wikimedia_Commons" ${q}`,
  };
  const FREE_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? \d)/i;
  const LOOKS_LIKE_NAME = /^File:[A-Z][a-z]+ [A-Z][a-z]+(\.| \(|$)/;

  const subjects = Object.keys(QUERIES);
  const perSubject = Math.ceil(COUNT / subjects.length);
  let added = 0;
  for (const subject of subjects) {
    let taken = 0;
    const rows = [];
    const queries = seededShuffle(QUERIES[subject], 5);
    for (let q = 0; taken < perSubject && q < queries.length * 2; q++) {
      const pool = q % 2 ? "showcase" : "everyday"; // alternate pools for a mix of easy and hard real photos
      const photo = await searchCommons(POOLS[pool](queries[Math.floor(q / 2) % queries.length]));
      if (!photo) continue;
      const file = `wm-${safe(photo.title)}.jpg`;
      await writeFile(join(INBOX, file), await toJpeg(photo.bytes));
      rows.push({
        modality: "image",
        is_real: "yes",
        category: "ai-image",
        subject,
        content: file,
        source_dataset: `Wikimedia Commons (${pool})`,
        source_license: photo.license,
        source_author: photo.artist,
        source_original_id: photo.pageUrl,
        added_by: "fetch-images",
      });
      known.add(photo.pageUrl);
      taken++;
    }
    added += await appendRows(CSV_PATH, rows); // save after every subject
    console.log(`✓ ${subject.padEnd(10)} ${taken}`);
    if (added >= COUNT) break;
  }
  console.log(`\nAdded ${added} real photos to dataset/inbox/. Review them, then: npm run data`);

  async function searchCommons(search) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6",
      gsrlimit: "20",
      gsrsearch: search,
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime|size",
      iiurlwidth: "500", // Wikimedia only serves standard thumbnail widths
      iiextmetadatafilter: "LicenseShortName|Artist|Restrictions",
    });
    const data = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`).catch(() => null);
    const pages = Object.values(data?.query?.pages ?? {}).sort((a, b) => a.index - b.index);
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      const meta = ii?.extmetadata ?? {};
      if (!ii || ii.mime !== "image/jpeg" || ii.width < 512 || known.has(ii.descriptionurl)) continue;
      if (!FREE_LICENSE.test(meta.LicenseShortName?.value ?? "")) continue;
      if (/personality/i.test(meta.Restrictions?.value ?? "")) continue; // identifiable person: skip
      if (LOOKS_LIKE_NAME.test(p.title) || /portrait|selfie/i.test(p.title)) continue;
      const img = await withRetry(() => throttledFetch(ii.thumburl)).catch(() => null);
      if (!img) continue;
      return {
        title: p.title.replace(/^File:/, ""),
        license: meta.LicenseShortName.value,
        artist: (meta.Artist?.value ?? "unknown")
          .replace(/<[^>]+>/g, "")
          .trim()
          .slice(0, 80),
        pageUrl: ii.descriptionurl,
        bytes: Buffer.from(await img.arrayBuffer()),
      };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
async function getJson(url, tries) {
  const res = await withRetry(() => throttledFetch(url), tries);
  return res.json();
}

// Be polite to free services: Wikimedia gets at most ~1 request per second, everyone else ~5.
const lastCall = {};
async function throttledFetch(url) {
  const host = new URL(url).host;
  const gap = host.endsWith("wikimedia.org") ? 1000 : 200;
  const wait = (lastCall[host] ?? 0) + gap - Date.now();
  lastCall[host] = Date.now() + Math.max(wait, 0);
  if (wait > 0) await sleep(wait);
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${url}`), { status: res.status });
  return res;
}

/** Retry on rate limits (429) and server hiccups (5xx) with growing pauses: 5s, 10s, 20s, 40s, 80s. */
async function withRetry(fn, tries = 6) {
  for (let n = 0; ; n++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status ?? Number(/\b(429|5\d\d)\b/.exec(err.message)?.[1]);
      if (n >= tries - 1 || !(status === 429 || status >= 500)) throw err;
      console.warn(`  (server busy: ${status}, waiting ${5 * 2 ** n}s)`);
      await sleep(5000 * 2 ** n);
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function safe(s) {
  return s
    .replace(/\.[a-z]+$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

// Run last, so every helper above is defined first.
if (SOURCE === "eval") await fetchEvalFakes();
else if (SOURCE === "wikimedia") await fetchWikimediaReals();
else {
  console.error("Pick a source: --source eval (AI fakes) or --source wikimedia (real photos)");
  process.exit(1);
}
