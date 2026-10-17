// POST /api/helper { messages: [{ role, content }], lang } -> { text, source }
// The AI helper: a friendly first conversation with AI. Claude answers in the user's language.
import { askText, claudeAvailable, prompt } from "../lib/claude.mjs";
import { UserError } from "./check.mjs";

const MAX_CHARS = 2000;
const MAX_TURNS = 12;

const OFFLINE = {
  en: "I'm not connected right now, so I can't answer properly. Please try again in a moment. (AI can be wrong too.)",
  de: "Ich bin gerade nicht verbunden und kann deshalb nicht richtig antworten. Bitte versuchen Sie es gleich noch einmal. (Auch KI kann sich irren.)",
};

export async function handleHelper(body) {
  const lang = body?.lang === "de" ? "de" : "en";
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (messages[0]?.role === "assistant") messages.shift();
  if (messages.at(-1)?.role !== "user") {
    throw new UserError(lang === "de" ? "Bitte schreiben Sie zuerst eine Frage." : "Please write a question first.");
  }

  if (claudeAvailable()) {
    try {
      const language = lang === "de" ? "German (use the polite 'Sie')" : "English";
      const system = (await prompt("helper.md")) + `\n\nAlways answer in ${language}.`;
      return { text: await askText({ system, messages }), source: "claude" };
    } catch (err) {
      console.warn("Claude helper failed:", err.message);
    }
  }
  return { text: OFFLINE[lang], source: "fallback" };
}
