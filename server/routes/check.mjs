// POST /api/check { text, lang } -> { verdict, headline, signs[], todo[], report, source }
// Claude checks a pasted message. Without a key (or if Claude fails) a simple rule-based check answers instead,
// and `source: "fallback"` tells the app to say so.
import { readFile } from "node:fs/promises";
import { askJson, claudeAvailable, prompt } from "../lib/claude.mjs";

const SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["scam", "careful", "safe"] },
    headline: { type: "string" },
    signs: { type: "array", items: { type: "string" } },
    todo: { type: "array", items: { type: "string" } },
    report: { type: "string" },
  },
  required: ["verdict", "headline", "signs", "todo", "report"],
  additionalProperties: false,
};

const MAX_CHARS = 2000;

export class UserError extends Error {
  status = 400;
}

export async function handleCheck(body) {
  const lang = body?.lang === "de" ? "de" : "en";
  const text = String(body?.text ?? "")
    .trim()
    .slice(0, MAX_CHARS);
  if (!text)
    throw new UserError(lang === "de" ? "Bitte fügen Sie zuerst eine Nachricht ein." : "Please paste a message first.");

  if (claudeAvailable()) {
    try {
      const language = lang === "de" ? "German (use the polite 'Sie')" : "English";
      const answer = await askJson({
        system: await prompt("check.md"),
        text: `Answer in: ${language}\n\n<message>\n${text}\n</message>`,
        schema: SCHEMA,
        maxTokens: 1500,
      });
      return { ...answer, source: "claude" };
    } catch (err) {
      console.warn("Claude scam check failed, using the rule-based fallback:", err.message);
    }
  }
  return { ...(await ruleCheck(text, lang)), source: "fallback" };
}

// Offline fallback: count classic scam signs. Good enough to keep the demo working, clearly labelled in the UI.
const RULES = [
  ["link", /(https?:\/\/|www\.|bit\.ly|\b[\w-]+\.(top|xyz|info|click|link|co|com|net)\b)/i],
  [
    "urgent",
    /(urgent|immediately|today|now\b|within \d+|blocked|suspended|sofort|dringend|heute|innerhalb von|gesperrt)/i,
  ],
  ["money", /(€|£|\$|\bpay\b|payment|fee|transfer|send me|refund|bezahl|zahlen|überweis|gebühr|erstattung)/i],
  ["secret", /(\bpin\b|password|passwort|\btan\b|card details|kartendaten|verify your identity|identität)/i],
  ["family", /(new number|neue nummer|hi mum|hallo mama|hi dad|hallo papa|grandma|oma\b)/i],
];

export async function ruleCheck(text, lang) {
  const t = JSON.parse(await readFile(new URL("../../content/ai-fallback/check.json", import.meta.url), "utf8"))[lang];
  const hits = RULES.filter(([, re]) => re.test(text)).map(([key]) => key);
  const verdict = hits.length >= 2 ? "scam" : hits.length === 1 ? "careful" : "safe";
  return {
    verdict,
    headline: t.headline[verdict],
    signs: hits.length ? hits.map((k) => t.signs[k]) : [t.signs.none],
    todo: t.todo[verdict],
    report: t.report,
  };
}
