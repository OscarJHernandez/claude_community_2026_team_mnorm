// All Claude API calls for the dataset tooling live here. Prompts live in /prompts.
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { PROMPTS_DIR } from "./paths.mjs";

export const MODEL = "claude-opus-5-5";

const MEDIA_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

let client;
export function claudeAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  client ??= new Anthropic();
  return client;
}

async function prompt(name) {
  return readFile(join(PROMPTS_DIR, name), "utf8");
}

/** One JSON-schema-constrained call. Falls back to another model server-side if this one declines. */
async function askJson({ system, content, schema, maxTokens = 4000 }) {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined this item.");
  const text = res.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error(`Empty response (stop_reason: ${res.stop_reason}).`);
  return JSON.parse(text);
}

// Coarse subjects: items with the same subject get paired together (bird with bird, bank with bank).
export const SUBJECTS = {
  image: [
    "animal",
    "bird",
    "landscape",
    "water",
    "plant",
    "food",
    "building",
    "interior",
    "street",
    "vehicle",
    "object",
    "people",
  ],
  text: [
    "sms-casual",
    "delivery",
    "bank",
    "family",
    "prize",
    "phone-plan",
    "account",
    "appointment",
    "code",
    "tax",
    "job",
    "travel",
    "shopping",
  ],
};

const RATING_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", enum: [...SUBJECTS.image, ...SUBJECTS.text] },
    difficulty: { type: "integer", enum: [1, 2, 3, 4, 5] },
    clues: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
  },
  required: ["subject", "difficulty", "clues", "explanation"],
  additionalProperties: false,
};

/** Ask Claude how hard an item is to judge, which clues give it away, and a plain-language explanation. */
export async function enrichRow(row, datasetDir) {
  const label = describeLabel(row);
  const facts = [
    `Category: ${row.category}`,
    `Correct answer: ${label}`,
    row.subject && `Subject: ${row.subject}`,
    row.source_generator && `Made with: ${row.source_generator}`,
  ]
    .filter(Boolean)
    .join("\n");

  const content = [];
  if (row.modality === "image") {
    const data = await readFile(join(datasetDir, row.content));
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: MEDIA_TYPES[extname(row.content).toLowerCase()] ?? "image/png",
        data: data.toString("base64"),
      },
    });
  } else {
    content.push({ type: "text", text: `<message>\n${row.content}\n</message>` });
  }
  content.push({ type: "text", text: `${facts}\nPick subject from: ${SUBJECTS[row.modality].join(", ")}` });
  return askJson({ system: await prompt("rate-item.md"), content, schema: RATING_SCHEMA });
}

const TEXTS_SCHEMA = {
  type: "object",
  properties: {
    messages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string" },
          subject: { type: "string" },
          difficulty: { type: "integer", enum: [1, 2, 3, 4, 5] },
          clues: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
        },
        required: ["content", "subject", "difficulty", "clues", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["messages"],
  additionalProperties: false,
};

/** Ask Claude to write `count` messages of one kind (see prompts/write-texts.md). `examples` = real messages to imitate. */
export async function writeTexts({ kind, count, examples = [] }) {
  const text = [
    `Kind: ${kind}`,
    `Count: ${count}`,
    examples.length ? `Real examples to match in style and length:\n${examples.map((e) => `- ${e}`).join("\n")}` : "",
  ].join("\n\n");
  const out = await askJson({
    system: await prompt("write-texts.md"),
    content: [{ type: "text", text }],
    schema: TEXTS_SCHEMA,
    maxTokens: 16000,
  });
  return out.messages;
}

export function describeLabel(row) {
  const real = ["yes", "true", "1", "real", "legit"].includes(String(row.is_real).toLowerCase());
  if (row.category === "scam-vs-legit") return real ? "legitimate message" : "scam message";
  if (row.category === "ai-vs-human") return real ? "written by a human" : "written by AI";
  return real ? "real photo" : "AI-generated image";
}
