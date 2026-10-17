// Claude calls made while the app is running (the dataset tools use scripts/lib/claude.mjs).
// The API key is read from .env on the server and never reaches the browser.
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const MODEL = "claude-opus-5-5";
const PROMPTS_DIR = fileURLToPath(new URL("../../prompts/", import.meta.url));

let client;
export function claudeAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  // Live answers: give up after 15 s so the app can show its fallback instead of a spinner.
  client ??= new Anthropic({ timeout: 15_000, maxRetries: 1 });
  return client;
}

export async function prompt(name) {
  return readFile(join(PROMPTS_DIR, name), "utf8");
}

/** One JSON-schema-constrained call, low effort for speed. Falls back to another model server-side if declined. */
export async function askJson({ system, text, schema, maxTokens = 2000 }) {
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: [{ type: "text", text }] }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined this request.");
  const out = res.content.find((b) => b.type === "text")?.text;
  if (!out) throw new Error(`Empty response (stop_reason: ${res.stop_reason}).`);
  return JSON.parse(out);
}
