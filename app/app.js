// Fenster app. Hash routes (#/home, #/learn, ...). Progress is saved on this device (localStorage);
// a database can replace load()/save() later without touching the screens.

const params = new URLSearchParams(location.search);
const EMBED = Boolean(params.get("embed")); // journey map iframes: never save
const SAVE_KEY = "fenster.v1";
const SAVED = {
  name: "",
  lang: (navigator.language || "en").slice(0, 2),
  big: false,
  onboarded: false,
  level0: null,
  points: 0,
  streak: 0,
  lastDay: null,
  feedDay: null,
  answers: {}, // today's feed: clip number -> "real" | "fake"
  round: 0, // today's play-through: 0, then +1 each time the feed is replayed
  scored: {}, // clip number -> the round it earned points in (points only once a day)
  aha: [], // things learned, newest first
  lessons: [], // finished lesson ids
  chats: 0,
  checks: 0,
  games: 0, // finished "Real or Fake?" pair games
};
function load() {
  try {
    return { ...SAVED, ...JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") };
  } catch {
    return { ...SAVED };
  }
}
function save() {
  if (EMBED) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(Object.fromEntries(Object.keys(SAVED).map((k) => [k, state[k]]))));
  } catch {
    /* private mode: progress lasts until the tab closes */
  }
}
const state = { ...load(), wa: true, group: true };
if (params.get("lang")) state.lang = params.get("lang");
if (!window.I18N[state.lang]) state.lang = "en";
if (EMBED) document.documentElement.classList.add("embed");

function t(key, vars = {}) {
  let s = window.I18N[state.lang][key] ?? window.I18N.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll("{" + k + "}", v);
  return s;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const go = (path) => {
  location.hash = "#/" + path;
};

// ---------- progress: points, levels, streak, toast ----------
const LEVELS = [0, 100, 250, 500, 900];
const levelOf = (pts) => LEVELS.filter((n) => pts >= n).length; // 1..5
const today = () => new Date().toISOString().slice(0, 10);

let toastTimer;
function toast(text, gold) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.classList.toggle("gold", !!gold);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), gold ? 3200 : 1800);
}
function addPoints(n) {
  const before = levelOf(state.points);
  state.points += n;
  const after = levelOf(state.points);
  if (after > before) toast(t("toast.level", { level: t("lv." + after) }), true);
  else toast(t("toast.pts", { n }));
  save();
  renderSidebar();
}
// A day you play counts for your streak. One missed day is forgiven (a "rest day").
function markPlayedToday() {
  const d = today();
  if (state.lastDay === d) return;
  const gap = state.lastDay ? Math.round((new Date(d) - new Date(state.lastDay)) / 864e5) : 0;
  state.streak = state.lastDay && gap <= 2 ? state.streak + 1 : 1;
  state.lastDay = d;
}
function learned(text) {
  if (text && !state.aha.includes(text)) state.aha.unshift(text);
}

// Share with family: the phone's share sheet, or WhatsApp in a new tab on desktop.
function share(text) {
  if (navigator.share) return navigator.share({ text }).catch(() => {});
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
}
const appUrl = () => location.origin;

// ---------- icons (inline so the app works offline) ----------
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  learn:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 8h6"/></svg>',
  create:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
  rank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
};
const TABS = ["home", "learn", "create", "rank", "me"];
const LOGO = `<svg viewBox="0 0 60 72" aria-hidden="true"><path d="M4 70V22Q30 2 56 22V70Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M30 10V70M4 42H56" stroke="currentColor" stroke-width="3.5"/></svg>`;

// ---------- the daily feed ----------
// Home is a TikTok-style feed of 7 clips in different media. For each one: real or fake?
// The order comes from content/feed/<date>.json. "showcase:" clips are hand-made below (media the dataset
// doesn't have: newspaper, voice note); "dataset:" clips come from dataset/items.json and "video:" clips from
// content/videos/videos.json (real vs AI videos, played in an embedded player).
const SHOWCASE = Object.fromEntries(
  [
    {
      k: "v1",
      answer: "fake",
      lesson: "images",
      media: () => `<div class="vid">
      <div class="vid-scene"><div class="tramp"></div><span class="bun b1">🐇</span><span class="bun b2">🐇</span><span class="bun b3">🐇</span><div class="grain"></div></div>
      <div class="hud"><span>${t("v1.cam")}</span><span class="rec">● REC</span><span class="ts">2026-10-16 02:14:07</span><div class="bar"><i></i></div></div>
    </div>`,
    },
    {
      k: "a2",
      answer: "fake",
      lesson: "safety",
      media: () => `<div class="paper">
      <div class="url">⚠️ ${t("a2.url")}</div>
      <div class="in"><div class="mast">${t("a2.mast")}</div><p class="kicker">${t("a2.date")}</p>
      <p class="head">${t("a2.head")}</p><div class="pic">☕</div><p>${t("a2.lead")}</p></div>
    </div>`,
    },
    {
      k: "e3",
      answer: "fake",
      lesson: "scams",
      media: () => `<div class="paper"><div class="url">✉️ ${t("e3.box")}</div>
      <div class="in"><p class="from">${esc(t("r1.aFrom"))}</p><p class="head" style="font-family:inherit">${t("r1.aSubj")}</p><p>${t("r1.aBody")}</p>
      <p class="fake-btn">${t("e3.btn")}</p></div></div>`,
    },
    {
      k: "v6",
      answer: "fake",
      lesson: "scams",
      media: () => `<div class="chat">
      <div class="chat-h"><div class="avatar" style="background:#888">?</div><b>${t("v6.from")}</b></div>
      <div class="chat-b"><div class="bub vn"><span class="play">▶</span><span class="wave">${Array.from({ length: 26 }, (_, j) => `<i style="height:${20 + ((j * 37) % 70)}%;animation-delay:${(j % 7) * 0.12}s"></i>`).join("")}</span><small>0:14</small></div>
      <div class="bub"><b>${t("v6.trl")}:</b> ${t("v6.tr")}</div></div>
    </div>`,
    },
    {
      k: "n7",
      answer: "real",
      lesson: "report",
      media: () => `<div class="paper">
      <div class="url">🔒 stadtbibliothek-neustadt.de</div>
      <div class="site-h">📚 ${t("n7.site")}</div>
      <div class="in"><p class="small muted">${t("n7.crumb")} · ${t("n7.date")}</p><p class="head" style="font-family:inherit">${t("n7.head")}</p><p>${t("n7.body")}</p></div>
    </div>`,
    },
  ].map((c) => [c.k, c]),
);
const DEMO_FEED_DATE = "2026-10-17";
// Used until the feed file and dataset have loaded (or if they can't load).
let FEED = ["v1", "a2", "e3", "v6", "n7"].map((k) => SHOWCASE[k]);
const PTS = 20;

// Dataset items by id, filled at startup by loadDataset() from dataset/loader.js.
const DS = {};
// German for dataset items (dataset is English), from content/dataset-de.json (npm run translate).
let DS_DE = {};
// Lesson cards and quizzes from content/lessons.json, per lesson id and language.
let LESSON_TEXT = {};
const dsPhoto = (id) =>
  DS[id]
    ? `<div class="photo"><img src="${DS[id].src}" alt="${esc(t("dsi.alt"))}"></div>`
    : `<div class="photo">${handSVG(true)}</div>`;
const dsSms = (id) => `<div class="chat">
    <div class="chat-h"><div class="avatar" style="background:#888">💬</div><b>${t("dst.from")}</b></div>
    <div class="chat-b"><div class="bub">${esc(dsText(id, "content"))}<small>09:12</small></div></div>
  </div>`;
// Real vs AI videos (Canva / TikTok players). No link to the original before answering: it gives the answer away.
const vidEmbed = (id) => `<div class="video"><iframe src="${esc(DS[id].content)}" title="${esc(t("dsv.alt"))}"
    loading="lazy" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
const dsMedia = (id) => ({ image: dsPhoto, video: vidEmbed })[DS[id]?.modality]?.(id) ?? dsSms(id);
const dsLesson = (id) => (DS[id]?.modality === "text" ? "scams" : "images");
function dsText(id, field) {
  const de = state.lang === "de" && DS_DE[id]?.[field];
  return de || DS[id]?.[field];
}
function dsCredit(id) {
  const src = DS[id]?.source;
  if (!src) return "";
  return [src.author, src.license, src.dataset].filter(Boolean).join(" · ");
}
/** "📷 author · license · source", plus a link to the original for videos. Shown after answering. */
function dsCreditHTML(id) {
  const link = DS[id]?.link
    ? ` · <a href="${esc(DS[id].link)}" target="_blank" rel="noopener">${t("dsv.open")}</a>`
    : "";
  return `<p class="credit">${DS[id]?.modality === "video" ? "🎬" : "📷"} ${esc(dsCredit(id))}${link}</p>`;
}

/** Turn a feed entry ("showcase:v1", "dataset:img-0034", "video:vid-0002" or { id, caption }) into a clip. */
function toClip(entry) {
  const { id, caption } = typeof entry === "string" ? { id: entry } : entry;
  const [kind, key] = id.split(":");
  if (kind === "showcase") return SHOWCASE[key];
  const item = DS[key];
  if (!item) return null;
  return {
    k: caption || { image: "dsi", video: "dsv" }[item.modality] || "dst",
    ds: key,
    answer: item.is_real ? "real" : "fake",
    lesson: dsLesson(key),
    media: () => dsMedia(key),
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// For the "Real or Fake?" pair game: getRound/getPair from dataset/loader.js and every item (dataset + videos).
let LOADER = null;
let ITEMS = [];

/** Load the dataset, videos, German texts and today's feed (falls back to the demo day, then to a dataset round). */
async function loadContent() {
  LOADER = await import("../dataset/loader.js");
  const { loadDataset, getRound } = LOADER;
  const items = await loadDataset();
  const videos = (await fetchJson("../content/videos/videos.json").catch(() => ({ items: [] }))).items;
  ITEMS = [...items, ...videos];
  ITEMS.forEach((i) => (DS[i.id] = i));
  DS_DE = (await fetchJson("../content/dataset-de.json").catch(() => ({ items: {} }))).items;
  videos.forEach((v) => v.de && (DS_DE[v.id] = v.de));
  LESSON_TEXT = (await fetchJson("../content/lessons.json").catch(() => ({ lessons: {} }))).lessons;
  const feed =
    (await fetchJson(`../content/feed/${today()}.json`).catch(() => null)) ||
    (await fetchJson(`../content/feed/${DEMO_FEED_DATE}.json`).catch(() => null));
  const entries =
    feed?.clips ?? getRound(items, { count: 7, start: 1, end: 4 }).flatMap((p) => [`dataset:${p.left.id}`]);
  const clips = entries.map(toClip).filter(Boolean);
  if (clips.length) FEED = clips;
  // A new day's feed starts with no answers.
  const day = feed?.date ?? today();
  if (state.feedDay !== day) Object.assign(state, { feedDay: day, answers: {}, round: 0, scored: {} });
}
const score = () => FEED.filter((F, i) => state.answers[i + 1] === F.answer).length;

const TASKS = [
  { ico: "📧", key: "t.scam", pts: 20, to: "home/4", done: () => !!state.answers[4] },
  { ico: "🎮", key: "t.play", pts: 20, to: "play", done: () => state.games >= 1 },
  { ico: "☀️", key: "t.morning", pts: 15, to: "chat", done: () => state.chats >= 1 },
  { ico: "🔍", key: "t.check", pts: 10, to: "check", done: () => state.checks >= 1 },
  { ico: "🗣️", key: "t.explain", pts: 10, to: "lesson/what", done: () => state.lessons.includes("what") },
  { ico: "🌙", key: "t.evening", pts: 30, to: "evening", done: () => false },
];

const LESSONS = [
  { id: "what", ico: "🤖", lvl: 1, min: 3 },
  { id: "safety", ico: "🛡️", lvl: 1, min: 2 },
  { id: "images", ico: "🖼️", lvl: 1, min: 3 },
  { id: "scams", ico: "📞", lvl: 1, min: 4 },
  { id: "ask", ico: "💡", lvl: 2, min: 3 },
  { id: "write", ico: "✍️", lvl: 2, min: 3 },
  { id: "report", ico: "🚩", lvl: 2, min: 2 },
  { id: "phone", ico: "📱", lvl: 2, min: 5 },
];

const PEOPLE = {
  group: [
    ["Ingrid", 520, 12, "#7A4FA0"],
    ["Max", 470, 9, "#2B6CB0"],
    ["ME", 340, 5, "#0B5D5B"],
    ["Peter", 300, 3, "#B4540A"],
    ["Helga", 210, 2, "#A3261B"],
  ],
  all: [
    ["Gisela", 1240, 41, "#2B6CB0"],
    ["Werner", 1180, 30, "#7A4FA0"],
    ["Ingrid", 520, 12, "#1D6B34"],
    ["Max", 470, 9, "#B4540A"],
    ["ME", 340, 5, "#0B5D5B"],
    ["Peter", 300, 3, "#A3261B"],
  ],
};

// Sample "photos" for the image round. B is the AI one (six fingers, gibberish sign).
function handSVG(ai) {
  const n = ai ? 5 : 4; // fingers besides the thumb
  let fingers = "";
  for (let i = 0; i < n; i++) {
    const w = 84 / n,
      x = 168 + i * w,
      h = 70 + (i === 0 || i === n - 1 ? -10 : 8);
    fingers += `<rect x="${x + 2}" y="${118 - h + 40}" width="${w - 4}" height="${h}" rx="${(w - 4) / 2}" fill="${ai ? "url(#skinAI)" : "#E0AC86"}" stroke="#8a5a3c" stroke-width="2"/>`;
  }
  return `<svg viewBox="0 0 400 230" role="img" aria-label="${ai ? "B" : "A"}">
    <defs><linearGradient id="skinAI" x1="0" x2="1"><stop offset="0" stop-color="#F6C7B0"/><stop offset="1" stop-color="#FBE0D3"/></linearGradient></defs>
    <rect width="400" height="230" fill="${ai ? "#E9DDF5" : "#CFE3EE"}"/>
    <rect x="22" y="22" width="120" height="44" rx="6" fill="#fff" stroke="#555" stroke-width="2"/>
    <text x="82" y="51" font-size="${ai ? 15 : 16}" text-anchor="middle" font-family="Arial" font-weight="700" fill="#333">${ai ? esc(t("r3.sign")) : state.lang === "de" ? "BÄCKEREI" : "BAKERY"}</text>
    <rect x="0" y="190" width="400" height="40" fill="${ai ? "#D7C3EA" : "#B7A58A"}"/>
    ${fingers}
    <rect x="${ai ? 132 : 140}" y="112" width="${ai ? 46 : 40}" height="26" rx="13" transform="rotate(-35 160 125)" fill="${ai ? "url(#skinAI)" : "#E0AC86"}" stroke="#8a5a3c" stroke-width="2"/>
    <rect x="160" y="108" width="100" height="95" rx="34" fill="${ai ? "url(#skinAI)" : "#E0AC86"}" stroke="#8a5a3c" stroke-width="2"/>
  </svg>`;
}

function gardenSVG() {
  let roses = "";
  const pts = [
    [70, 120],
    [130, 90],
    [200, 130],
    [270, 95],
    [330, 125],
    [110, 160],
    [240, 165],
    [310, 170],
  ];
  pts.forEach(([x, y], i) => {
    roses += `<line x1="${x}" y1="${y}" x2="${x + 4}" y2="215" stroke="#4E8A4A" stroke-width="4"/>
      <circle cx="${x}" cy="${y}" r="${16 + (i % 3) * 3}" fill="#D2425A" opacity=".85"/><circle cx="${x - 3}" cy="${y - 3}" r="7" fill="#9E1F35" opacity=".7"/>`;
  });
  return `<svg viewBox="0 0 400 230" role="img" aria-label="AI picture"><rect width="400" height="230" fill="#F4ECD9"/><circle cx="335" cy="45" r="26" fill="#F5C451" opacity=".8"/><rect y="180" width="400" height="50" fill="#9CC48E" opacity=".7"/>${roses}</svg>`;
}

// ---------- screens ----------
// Each screen: { title?, tab?, back?, render(args) }.
const S = {};

S.wa = {
  bare: true,
  render: () => `<div class="wa-screen">
    <div class="wa-bar"><div class="avatar">👨‍👩‍👧</div><div><b>${t("wa.group")}</b><small>${t("wa.members")}</small></div></div>
    <div class="wa-msgs">
      <div class="wa-msg"><div class="who">Max</div>${t("wa.m1")}</div>
      <div class="wa-msg"><div class="who">Fenster</div>${t("wa.m2")}
        <div class="link-card"><div class="ttl">Fenster · ${t("wa.group")}</div><div class="url">fenster.app/join/family-quiz</div></div>
        <button class="btn wa" data-go="ob/1">${t("wa.cta")}</button>
      </div>
    </div>
    <div class="wa-input"><div>${t("wa.input")}</div></div>
  </div>`,
};

const steps = (n) =>
  `<div class="steps" aria-label="${t("ob.step", { n })}">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div><p class="muted small">${t("ob.step", { n })}</p>`;

S.ob = {
  focus: true,
  back: (a) => (a[0] && a[0] !== "1" ? "ob/" + (+a[0] - 1) : null),
  render: ([n = "1"]) => {
    if (n === "1")
      return `<div class="stack">${steps(1)}
      <h1 class="h1">${t("ob.welcome")} 👋</h1>
      <p>${t("ob.lang")}</p>
      <button class="choice" data-act="lang" data-v="de" aria-pressed="${state.lang === "de"}"><span class="ico">🇩🇪</span><b>Deutsch</b></button>
      <button class="choice" data-act="lang" data-v="en" aria-pressed="${state.lang === "en"}"><span class="ico">🇬🇧</span><b>English</b></button>
      <p class="h2">${t("ob.text")}</p>
      <button class="choice" data-act="big" data-v="0" aria-pressed="${!state.big}"><span class="ico">A</span><b>${t("ob.textOk")}</b></button>
      <button class="choice" data-act="big" data-v="1" aria-pressed="${state.big}"><span class="ico" style="font-size:2rem">A</span><b>${t("ob.textBig")}</b></button>
      <button class="btn primary" data-go="ob/2">${t("c.continue")}</button></div>`;
    if (n === "2")
      return `<div class="stack">${steps(2)}
      <label for="obname" class="h1">${t("ob.name")}</label>
      <input id="obname" class="field" data-field="name" autocomplete="given-name" placeholder="${t("ob.namePh")}" value="${esc(state.name)}">
      <p class="h2">${t("ob.q")}</p>
      ${[
        ["o1", "🌱"],
        ["o2", "🌿"],
        ["o3", "🌳"],
      ]
        .map(
          ([k, ico]) =>
            `<button class="choice" data-act="level" data-v="${k}" aria-pressed="${state.level0 === k}"><span class="ico">${ico}</span><span><b>${t("ob." + k)}</b><span class="sub">${t("ob." + k + "s")}</span></span></button>`,
        )
        .join("")}
      <p class="muted small">${t("ob.note")}</p>
      <button class="btn primary" data-go="ob/3">${t("c.continue")}</button></div>`;
    return `<div class="stack">${steps(3)}
      <h1 class="h1">${t("ob.permT")}</h1>
      <div class="card">
        <label class="toggle-row"><input type="checkbox" data-act="wa" ${state.wa ? "checked" : ""}><span><b>${t("ob.permWa")}</b><br><span class="muted small">${t("ob.permWaS")}</span></span></label>
        <label class="toggle-row"><input type="checkbox" data-act="group" ${state.group ? "checked" : ""}><span><b>${t("ob.permGr")}</b><br><span class="muted small">${t("ob.permGrS")}</span></span></label>
      </div>
      <p class="muted small">🔒 ${t("ob.permNote")}</p>
      <button class="btn primary" data-act="start">${t("ob.start")}</button></div>`;
  },
};

// Home is the game: a vertical, full-screen feed (like TikTok). Swipe up or tap "Next".
S.home = {
  tab: "home",
  immersive: true,
  render: ([i, pick]) => {
    if (i && pick && EMBED) state.answers[+i] = pick;
    return `<div class="feed-wrap">
      <div class="feed-head">
        <div class="feed-progress"><span class="dots">${FEED.map((F, n) => `<i data-dot="${n + 1}" class="${state.answers[n + 1] ? "done" : ""}"></i>`).join("")}</span><span id="feed-count">${t("f.count", { n: 1, total: FEED.length })}</span></div>
        <span class="stat-chip">⭐ <span id="feed-pts">${state.points}</span></span>
        <a class="btn-sm" href="#/play" aria-label="${t("play.cta")}">🎮<span class="wide-only"> ${t("play.cta")}</span></a>
        <a class="btn-sm" href="#/tasks">☰ ${t("f.tasks")}</a>
      </div>
      <div class="reel" id="reel">
        ${FEED.map((F, n) => `<section class="clip" data-i="${n + 1}">${clip(n + 1)}</section>`).join("")}
        <section class="clip clip-result" data-i="${FEED.length + 1}">${resultHTML(score())}</section>
      </div>
    </div>`;
  },
  after: ([i]) => {
    if (i) scrollToClip(+i, false);
    const reel = document.getElementById("reel");
    reel.addEventListener("scroll", updateFeedHead, { passive: true });
    updateFeedHead();
  },
};

function clip(i) {
  const F = FEED[i - 1],
    pick = state.answers[i],
    ok = pick === F.answer,
    paid = state.scored[i] === state.round, // replays don't earn points again
    last = i === FEED.length;
  const sheet = `<div class="sheet ${ok ? "ok" : "no"}">
      <div class="sheet-top"><p class="h">${ok ? "✅ " + (paid ? t("f.right", { n: PTS }) : t("f.rightAgain")) : "💛 " + t("f.wrong")}</p>
        <button class="sheet-toggle" data-act="sheet" aria-expanded="true">${t("f.hide")}</button></div>
      <p style="margin-top:.4rem"><b>${t(F.answer === "fake" ? "f.wasFake" : "f.wasReal")}</b> ${t("g.why")}:</p>
      <ul class="why">${(F.ds && DS[F.ds] ? dsText(F.ds, "clues") : [1, 2, 3].map((w) => t(whyKey(F, w)))).map((c) => `<li>${c}</li>`).join("")}</ul>
      ${F.ds && DS[F.ds] ? `<p class="aha">💡 <b>Aha!</b> ${dsText(F.ds, "explanation")}</p>` : ""}
      <span class="claude-tag">✦ ${t("c.byClaude")}</span>
      ${F.ds && DS[F.ds] ? dsCreditHTML(F.ds) : ""}
      ${ok ? "" : `<button class="btn ghost" style="margin-top:.7rem" data-go="lesson/${F.lesson}">📖 ${t("g.helpCta")}</button>`}
      <button class="btn primary" style="margin-top:.7rem" data-act="next" data-i="${i}">${last ? t("f.done") : t("f.next")} ↓</button>
    </div>`;
  return `<div class="clip-media">${F.media()}</div>
    <div class="clip-meta">
      <p class="cap"><b>${t(F.k + ".handle")}</b> · ${t(F.k + ".cap")}</p>
      <div class="clip-tools">
        <button class="btn-sm" data-act="share" data-v="clip">↗ ${t("f.share")}</button>
        <button class="btn-sm" data-go="lesson/${F.lesson}">📖 ${t("f.learn")}</button>
      </div>
    </div>
    ${
      pick
        ? sheet
        : `<div class="clip-actions"><p class="q">${t("f.q")}</p><div class="ans-row">
      <button class="ans real" data-act="answer" data-i="${i}" data-v="real">✓ ${t("f.real")}</button>
      <button class="ans fake" data-act="answer" data-i="${i}" data-v="fake">⚠ ${t("f.fake")}</button></div></div>`
    }`;
}
// email, sms-photo clues reuse the older round texts
const whyKey = (F, w) => (({ e3: "r1.w", p5: "r3.w" })[F.k] || F.k + ".w") + w;

function answer(i, v) {
  if (state.answers[i]) return;
  const F = FEED[i - 1];
  state.answers[i] = v;
  markPlayedToday();
  learned(F.ds && DS[F.ds] ? dsText(F.ds, "explanation") : t(whyKey(F, 1)));
  if (v === F.answer && !(i in state.scored)) {
    state.scored[i] = state.round;
    addPoints(PTS);
  }
  save();
  renderSidebar();
  document.querySelector(`.clip[data-i="${i}"]`).innerHTML = clip(i);
  document.querySelector(".clip-result").innerHTML = resultHTML(score());
  document.getElementById("feed-pts").textContent = state.points;
  document.querySelector(`[data-dot="${i}"]`)?.classList.add("done");
}
// Keeps "3 / 7" and the progress dots in the header in step with the clip on screen.
function updateFeedHead() {
  const n = Math.min(currentClip(), FEED.length);
  const count = document.getElementById("feed-count");
  if (count) count.textContent = t("f.count", { n, total: FEED.length });
  document.querySelectorAll("[data-dot]").forEach((d) => d.classList.toggle("here", +d.dataset.dot === n));
}
const currentClip = () => {
  const reel = document.getElementById("reel");
  return reel ? Math.round(reel.scrollTop / reel.clientHeight) + 1 : 1;
};

function scrollToClip(i, smooth) {
  const reel = document.getElementById("reel"),
    el = reel && reel.children[i - 1];
  if (el) reel.scrollTo({ top: el.offsetTop, behavior: smooth ? "smooth" : "auto" });
}

function resultHTML(s) {
  const low = s < 4;
  return `<div class="stack center result-in">
      <p style="font-size:3rem;line-height:1">${low ? "🌱" : "🎉"}</p>
      <h1 class="h1">${state.name ? t("res.title", { name: esc(state.name) }) : t("res.title0")}</h1>
      <p class="big-num">${s}/${FEED.length}</p>
      <p>${t("res.score", { n: s, total: FEED.length })} · <b>${t("res.earned", { n: Object.keys(state.scored).length * PTS })}</b> · ${t("res.streak", { n: Math.max(state.streak, 1) })}</p>
      <button class="btn primary" data-go="play">🎮 ${t("play.more")}</button>
      <button class="btn ghost" data-act="freplay">🔄 ${t("f.replay")}</button>
      <button class="btn ghost" data-go="aha">📒 ${t("aha.count", { n: state.aha.length })}</button>
      ${low ? `<div class="card" style="text-align:left"><p>${t("res.low")}</p><button class="btn primary" style="margin-top:.7rem" data-go="lesson/scams">${t("res.lowCta")}</button></div>` : ""}
      <div class="card stack" style="text-align:left">
        <h2 style="font-size:1.1rem">👨‍👩‍👧 ${t("res.shareT")}</h2>
        <p class="muted">${t("res.shareS")}</p>
        <button class="btn wa" data-act="share" data-v="game">${t("c.share")}</button>
      </div>
    </div>`;
}

S.result = {
  back: () => "home",
  render: ([forced]) =>
    `<div class="stack">${resultHTML(forced != null ? +forced : score())}<button class="btn ghost" data-go="home">${t("c.home")}</button></div>`,
};

// ---------- "Real or Fake?" pair game ----------
// 10 rounds from easy to hard. Each round shows two items of the same kind (photos, messages or videos); the player
// judges each one. A pair can be one real + one fake, both real or both fake. Pairs come from getRound/getPair in
// dataset/loader.js; one video pair (content/videos/videos.json) is mixed in halfway.
const GAME_ROUNDS = 10;
let GAME = null;
function newGame() {
  const { getRound, getPair } = LOADER;
  const rounds = getRound(
    ITEMS.filter((i) => i.modality !== "video"),
    { count: GAME_ROUNDS - 1, start: 1, end: 5 },
  );
  const videoPair = getPair(
    ITEMS.filter((i) => i.modality === "video"),
    { difficulty: 3 },
  );
  if (videoPair) rounds.splice(Math.floor(rounds.length / 2), 0, videoPair);
  return { rounds, n: 0, picks: [], right: 0 };
}
const truth = (item) => (item.is_real ? "real" : "fake");

S.play = {
  back: () => "home",
  title: () => t("play.title"),
  render: () => {
    if (!LOADER) return `<p class="muted">${t("play.loading")}</p>`;
    GAME ??= newGame();
    if (!GAME.rounds.length) return `<div class="feedback careful"><p>${t("play.empty")}</p></div>`;
    if (GAME.n >= GAME.rounds.length) return playResultHTML();
    const P = GAME.rounds[GAME.n];
    return `<div class="stack play">
      <div class="play-head">
        <span class="stat-chip">${t("play.round", { n: GAME.n + 1, total: GAME.rounds.length })}</span>
        <span class="stat-chip">⭐ <span id="play-pts">${state.points}</span></span>
      </div>
      ${GAME.n === 0 ? `<p class="muted">${t("play.intro")}</p>` : ""}
      <div class="pair">${pairCard(P.left, "left")}${pairCard(P.right, "right")}</div>
      <div id="play-foot">${playFoot()}</div>
    </div>`;
  },
};

function pairCard(item, side) {
  const id = item.id,
    pick = GAME.picks[GAME.n]?.[side],
    ok = pick === truth(item);
  const answered = `<div class="feedback ${ok ? "ok" : "no"}">
      <p class="h">${ok ? "✅ " + t("f.right", { n: PTS }) : "💛 " + t("f.wrong")}</p>
      <p style="margin-top:.4rem"><b>${t(item.is_real ? "f.wasReal" : "f.wasFake")}</b> ${t("g.why")}:</p>
      <ul class="why">${(dsText(id, "clues") ?? []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      ${dsText(id, "explanation") ? `<p class="aha">💡 <b>Aha!</b> ${esc(dsText(id, "explanation"))}</p>` : ""}
      <span class="claude-tag">✦ ${t("c.byClaude")}</span>
      ${dsCreditHTML(id)}
      ${ok ? "" : `<button class="btn ghost" style="margin-top:.7rem" data-go="lesson/${dsLesson(id)}">📖 ${t("g.helpCta")}</button>`}
    </div>`;
  return `<div class="card pair-card" data-card="${side}">
      <p class="pair-label">${t(side === "left" ? "play.a" : "play.b")}</p>
      <div class="pair-media">${dsMedia(id)}</div>
      ${
        pick
          ? answered
          : `<div class="ans-row">
        <button class="ans real" data-act="gpick" data-v="${side}:real">✓ ${t("f.real")}</button>
        <button class="ans fake" data-act="gpick" data-v="${side}:fake">⚠ ${t("f.fake")}</button></div>`
      }
    </div>`;
}

function playFoot() {
  const picks = GAME.picks[GAME.n] ?? {};
  if (!picks.left || !picks.right) return `<p class="q center">${t("play.q")}</p>`;
  const last = GAME.n === GAME.rounds.length - 1;
  return `<button class="btn primary" data-act="gnext">${last ? t("f.done") : t("play.next")} →</button>`;
}

// Only the card that was answered is redrawn, so a video in the other card keeps playing.
function gamePick(side, v) {
  const picks = (GAME.picks[GAME.n] ??= {});
  if (picks[side]) return;
  picks[side] = v;
  const item = GAME.rounds[GAME.n][side];
  markPlayedToday();
  learned(dsText(item.id, "explanation"));
  if (v === truth(item)) {
    GAME.right++;
    addPoints(PTS);
  }
  if (GAME.picks[GAME.n].left && GAME.picks[GAME.n].right && GAME.n === GAME.rounds.length - 1) state.games++;
  save();
  renderSidebar();
  document.querySelector(`[data-card="${side}"]`).outerHTML = pairCard(item, side);
  document.getElementById("play-foot").innerHTML = playFoot();
  document.getElementById("play-pts").textContent = state.points;
}

function playResultHTML() {
  const total = GAME.rounds.length * 2,
    low = GAME.right < total * 0.6;
  return `<div class="stack center result-in">
      <p style="font-size:3rem;line-height:1">${low ? "🌱" : "🎉"}</p>
      <h1 class="h1">${t("play.result")}</h1>
      <p class="big-num">${GAME.right}/${total}</p>
      <p><b>${t("res.earned", { n: GAME.right * PTS })}</b></p>
      ${low ? `<div class="card" style="text-align:left"><p>${t("res.low")}</p><button class="btn primary" style="margin-top:.7rem" data-go="lesson/images">${t("res.lowCta")}</button></div>` : ""}
      <button class="btn primary" data-act="gagain">🔄 ${t("play.again")}</button>
      <button class="btn ghost" data-go="aha">📒 ${t("aha.count", { n: state.aha.length })}</button>
      <button class="btn ghost" data-go="home">${t("c.home")}</button>
    </div>`;
}

// The former home: greeting, tasks and group activity. Opened from "Tasks" in the feed.
S.tasks = {
  back: () => "home",
  title: () => t("f.tasks"),
  render: () => `<div class="stack">
    <h1 class="h1">${state.name ? t("home.hi", { name: esc(state.name) }) + " ☀️" : t("home.hi0")}</h1>
    ${statsHTML()}
    <div class="card hero stack">
      <p class="small muted">${t("home.today")}</p>
      <h2 class="h1">${t("home.todayT")}</h2>
      <p class="muted">${t("tk.progress", { n: Object.keys(state.answers).length, total: FEED.length })} · <b>+${FEED.length * PTS}</b></p>
      <button class="btn light" data-go="home/${Math.min(Object.keys(state.answers).length + 1, FEED.length)}">${t("home.start")} →</button>
    </div>
    <h2 class="h2">${t("home.tasks")}</h2>
    <div>${TASKS.map((x) => `<button class="task ${x.done() ? "done" : ""}" data-go="${x.to}"><span class="ico">${x.done() ? "✅" : x.ico}</span><span>${t(x.key)}</span><span class="badge-pts">${x.done() ? t("tk.done") : "+" + x.pts}</span></button>`).join("")}</div>
    <h2 class="h2">${t("home.feed")}</h2>
    <div class="card feed"><div class="avatar" style="background:#2B6CB0">M</div><span style="flex:1">${t("f.max")}</span><button class="btn primary" data-go="home/5">${t("f.play")}</button></div>
    <div class="card feed"><div class="avatar" style="background:#7A4FA0">I</div><span style="flex:1">${t("f.ingrid")}</span><button class="btn ghost" data-act="cheer">${t("f.cheer")}</button></div>
  </div>`,
};

S.learn = {
  tab: "learn",
  render: () => `<div class="stack">
    <h1 class="h1">${t("l.title")}</h1><p class="muted">${t("l.sub")}</p>
    <div class="grid">${LESSONS.map((L) => `<button class="tile ${state.lessons.includes(L.id) ? "done" : ""}" data-go="lesson/${L.id}"><span class="ico">${state.lessons.includes(L.id) ? "✅" : L.ico}</span><b>${t("l." + L.id)}</b><span class="meta">${t(L.lvl === 1 ? "l.lvl1" : "l.lvl2")} · ${t("c.min", { n: L.min })}</span></button>`).join("")}</div>
  </div>`,
};

// A lesson: 3 cards, then one quiz question. Content comes from content/lessons.json.
S.lesson = {
  back: () => "learn",
  title: ([id]) => t("l." + (id || "safety")),
  render: ([id = "safety", card = "1", ans]) => {
    const L = LESSONS.find((x) => x.id === id) || LESSONS[1];
    const C = LESSON_TEXT[L.id]?.[state.lang] ?? LESSON_TEXT[L.id]?.en;
    if (!C) return `<div class="stack"><p class="muted">${t("ck.error")}</p></div>`;
    const total = C.cards.length + 1;
    const c = +card;
    const dots = `<div class="dots">${Array.from({ length: total }, (_, i) => `<i class="${i + 1 === c ? "on" : ""}"></i>`).join("")}</div>`;
    if (c <= C.cards.length) {
      const k = C.cards[c - 1];
      return `<div class="stack">
        <p class="muted small">${L.ico} ${t("ls.card", { n: c, total })}</p>
        <div class="card lesson-card">
          <p class="lesson-ico">${k.ico}</p>
          <p class="lesson-text">${esc(k.text)}</p>
        </div>
        ${dots}
        <button class="btn primary" data-go="lesson/${L.id}/${c + 1}">${t("c.continue")} →</button>
      </div>`;
    }
    const picked = ans == null ? null : +ans;
    return `<div class="stack">
      <p class="muted small">${L.ico} ${t("ls.card", { n: total, total })}</p>
      <h1 class="h1">${esc(C.q)}</h1>
      ${C.options
        .map((o, k) => {
          const st =
            picked == null
              ? ""
              : k === C.correct
                ? "border-color:var(--ok);background:var(--ok-soft)"
                : k === picked
                  ? "border-color:var(--fs-gentle);background:var(--fs-gentle-soft)"
                  : "opacity:.6";
          return `<button class="choice" style="${st}" ${picked == null ? `data-act="quiz" data-v="${L.id}/${k}"` : ""}><b>${esc(o)}</b></button>`;
        })
        .join("")}
      ${
        picked == null
          ? ""
          : `<div class="feedback ${picked === C.correct ? "ok" : "careful"}"><p class="h">${picked === C.correct ? "✅ " + t("ls.okShort") : "💛 " + t("f.wrong")}</p>
            <p class="aha" style="margin-top:.6rem">💡 <b>Aha!</b> ${esc(C.ok)}</p></div>
      ${dots}
      <button class="btn primary" data-go="learn">${t("ls.more")}</button>`
      }
    </div>`;
  },
};

S.create = {
  tab: "create",
  render: () => `<div class="stack">
    <h1 class="h1">${t("cr.title")}</h1><p class="muted">${t("cr.sub")}</p>
    <button class="choice" data-go="chat"><span class="ico">💬</span><span><b>${t("cr.chat")}</b><span class="sub">${t("cr.chatS")}</span></span></button>
    <button class="choice" data-go="home/1"><span class="ico">🪟</span><span><b>${t("home.todayT")}</b><span class="sub">${t("home.todayS")}</span></span></button>
    <button class="choice" data-go="check"><span class="ico">🔍</span><span><b>${t("cr.check")}</b><span class="sub">${t("cr.checkS")}</span></span></button>
  </div>`,
};

// AI helper: a real conversation with Claude via POST /api/helper.
state.chat = { msgs: [], loading: false, error: null, draft: "" };

S.chat = {
  back: () => "create",
  title: () => t("ch.title"),
  render: () => {
    const c = state.chat;
    const bubbles = c.msgs
      .map((m, i) =>
        m.role === "user"
          ? `<div class="bubble me">${esc(m.content)}</div>`
          : `<div class="bubble ai"><p class="ai-label">✦ ${t("ck.aiLabel")}</p><div class="ai-text">${esc(m.content)}</div>
            <button class="chip share-chip" data-act="share" data-v="chat:${i}">↗ ${t("ch.share")}</button></div>`,
      )
      .join("");
    return `<div class="stack chat-screen">
    ${
      c.msgs.length
        ? ""
        : `<div class="card ai-intro"><p class="ai-label">✦ ${t("ck.aiLabel")}</p><p>${t("ch.intro")}</p></div>
    <p class="muted small">${t("ck.examples")}</p>
    <div class="chips">${["ch.s1", "ch.s2", "ch.s3"].map((k) => `<button class="chip" data-act="ask" data-v="${k}">${t(k)}</button>`).join("")}</div>`
    }
    ${bubbles}
    ${c.loading ? `<div class="bubble ai thinking">✦ ${t("ch.thinking")}</div>` : ""}
    ${c.error ? `<div class="feedback careful"><p>${esc(c.error)}</p></div>` : ""}
    <form class="composer" data-form="chatform">
      <textarea id="chatin" rows="2" data-field="chattext" placeholder="${t("ch.ph")}" ${c.loading ? "disabled" : ""}>${esc(c.draft)}</textarea>
      <button class="btn primary" type="submit" ${c.loading ? "disabled" : ""}>${t("ch.go")}</button>
    </form>
    <p class="muted small">${t("c.disclaimer")}</p>
  </div>`;
  },
  after: () => {
    const v = document.getElementById("view");
    v.scrollTop = v.scrollHeight;
  },
};

async function runChat(text) {
  const c = state.chat;
  text = text.trim();
  if (!text || c.loading) return;
  c.msgs.push({ role: "user", content: text });
  Object.assign(c, { draft: "", loading: true, error: null });
  render();
  try {
    const res = await fetch("/api/helper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: c.msgs, lang: state.lang }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("ck.error"));
    c.msgs.push({ role: "assistant", content: data.text });
    state.chats += 1;
    if (state.chats <= 3) addPoints(15);
  } catch (err) {
    c.msgs.pop();
    Object.assign(c, { draft: text, error: err.name === "Error" ? err.message : t("ck.error") });
  }
  c.loading = false;
  if (parse().name === "chat") render();
}

S.image = {
  back: () => "create",
  title: () => t("im.title"),
  render: () => `<div class="stack">
    <label for="imgp"><b>${t("im.label")}</b></label>
    <textarea id="imgp" class="field" rows="2">${t("im.prompt")}</textarea>
    <button class="btn primary">🎨 ${t("im.go")}</button>
    <div class="card" style="padding:.5rem">${gardenSVG()}</div>
    <p>🔎 ${t("im.look")}</p>
    <button class="btn wa" data-go="wa">${t("c.share")}</button>
    <button class="btn ghost" data-go="home/5">${t("im.challenge")}</button>
  </div>`,
};

// Scam checker: the user pastes a message, Claude (via POST /api/check) explains if it's a scam.
state.check = { text: null, status: "idle", result: null, error: null };
const VERDICT = { scam: ["no", "⚠️"], careful: ["careful", "🤔"], safe: ["ok", "✅"] };

S.check = {
  back: () => "create",
  title: () => t("ck.title"),
  render: () => {
    const c = state.check;
    const r = c.result;
    const [cls, ico] = r ? VERDICT[r.verdict] : [];
    const list = (items) => `<ul class="why">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    return `<div class="stack">
    <label for="ckt"><b>${t("ck.label")}</b></label>
    <textarea id="ckt" class="field" rows="5" data-field="cktext">${esc(c.text ?? t("ck.sample"))}</textarea>
    ${
      r
        ? ""
        : `<p class="muted small">${t("ck.examples")}</p>
    <div class="chips">${["ck.sample", "r2.a", "r2.b"].map((k, i) => `<button class="chip" data-act="ckex" data-v="${k}">${t("ck.ex" + (i + 1))}</button>`).join("")}</div>
    <button class="btn primary" data-act="check" ${c.status === "loading" ? "disabled" : ""}>${
      c.status === "loading" ? `✦ ${t("ck.checking")}` : `🔍 ${t("ck.go")}`
    }</button>`
    }
    ${c.error ? `<div class="feedback careful"><p>${esc(c.error)}</p></div>` : ""}
    ${
      r
        ? `
    ${r.source === "claude" ? `<p class="ai-label">✦ ${t("ck.aiLabel")}</p>` : `<p class="muted small">ℹ️ ${t("ck.offline")}</p>`}
    <div class="feedback ${cls}"><p class="h">${ico} ${esc(r.headline)}</p>
      <p style="margin-top:.5rem"><b>${t("ck.signs")}:</b></p>${list(r.signs)}</div>
    <div class="card"><p><b>${t("ck.todo")}:</b></p>${list(r.todo)}</div>
    <div class="card"><p><b>🚩 ${t("ck.report")}:</b> ${esc(r.report)}</p></div>
    <button class="btn wa" data-act="share" data-v="warn">📣 ${t("ck.warn")}</button>
    <button class="btn ghost" data-act="ckagain">${t("ck.again")}</button>
    <p class="muted small">${t("c.disclaimer")}</p>`
        : ""
    }
  </div>`;
  },
  // #/check/1 runs the sample check straight away (used by the journey map).
  after: ([auto]) => {
    if (auto && state.check.status === "idle" && !state.check.error && !state.check.result) runCheck();
  },
};

async function runCheck() {
  const c = state.check;
  const text = (c.text ?? t("ck.sample")).trim();
  if (!text) return;
  Object.assign(c, { text, status: "loading", error: null, result: null });
  render();
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: state.lang }),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("ck.error"));
    Object.assign(c, { status: "done", result: data });
    state.checks += 1;
    if (state.checks <= 3) addPoints(10);
  } catch (err) {
    Object.assign(c, { status: "idle", error: err.name === "Error" ? err.message : t("ck.error") });
  }
  if (parse().name === "check") render();
}

S.rank = {
  tab: "rank",
  render: ([scope = "group", metric = "points"]) => {
    const list = PEOPLE[scope]
      .map((p) => (p[0] === "ME" ? ["ME", state.points, state.streak, p[3]] : p))
      .sort((a, b) => (metric === "points" ? b[1] - a[1] : b[2] - a[2]));
    return `<div class="stack">
      <h1 class="h1">${t("rk.title")} 🏆</h1>
      <div class="seg"><button aria-pressed="${scope === "group"}" data-go="rank/group/${metric}">${t("rk.group")}</button><button aria-pressed="${scope === "all"}" data-go="rank/all/${metric}">${t("rk.all")}</button></div>
      <div class="seg"><button aria-pressed="${metric === "points"}" data-go="rank/${scope}/points">⭐ ${t("rk.points")}</button><button aria-pressed="${metric === "streak"}" data-go="rank/${scope}/streak">🔥 ${t("rk.streak")}</button></div>
      <div>${list
        .map(([n, p, s, col], i) => {
          const me = n === "ME";
          return `<div class="row ${me ? "me" : ""}"><span class="rank">${["🥇", "🥈", "🥉"][i] || i + 1}</span><div class="avatar" style="background:${col}">${(me ? state.name || "?" : n)[0]}</div><span class="name">${me ? state.name + " (" + t("c.you") + ")" : n}</span><span class="val">${metric === "points" ? p : t("rk.days", { n: s })}</span></div>`;
        })
        .join("")}</div>
      <p class="muted small">${t("rk.reset")}</p>
    </div>`;
  },
};

const BADGES = [
  ["🎮", "b.first", () => Object.keys(state.answers).length > 0 || state.aha.length > 0],
  ["🔥", "b.streak", () => state.streak >= 3],
  ["🕵️", "b.spotter", () => score() >= 5],
  ["💬", "b.chat", () => state.chats >= 1],
  ["🛡️", "b.checker", () => state.checks >= 1],
  ["🎓", "b.teacher", () => state.lessons.includes("what")],
];

S.me = {
  tab: "me",
  render: () => `<div class="stack">
    <div style="display:flex;gap:1rem;align-items:center"><div class="avatar" style="width:4rem;height:4rem;font-size:1.6rem">${esc((state.name || "?")[0])}</div><div><h1 class="h1">${esc(state.name || t("c.you"))}</h1><p class="muted">${t("me.level", { n: levelOf(state.points), level: t("lv." + levelOf(state.points)) })}</p></div></div>
    ${levelBar()}
    ${statsHTML()}
    <button class="choice" data-go="aha"><span class="ico">📒</span><span><b>${t("me.aha")}</b><span class="sub">${t("aha.count", { n: state.aha.length })}</span></span></button>
    <h2 class="h2">${t("me.badges")}</h2>
    <div class="badges">${BADGES.map(([i, k, got]) => `<div class="badge ${got() ? "" : "locked"}"><span class="ico">${i}</span>${t(k)}</div>`).join("")}</div>
    <h2 class="h2">${t("me.groups")}</h2>
    <div class="card feed"><div class="avatar">👨‍👩‍👧</div><span style="flex:1"><b>${t("me.g1")}</b><br><span class="small muted">${t("me.members", { n: 5 })}</span></span></div>
    <button class="btn wa" data-act="share" data-v="invite">${t("me.invite")}</button>
    <h2 class="h2">${t("me.settings")}</h2>
    <div class="card" style="padding:.2rem 1rem">
      <div class="setting"><b>${t("me.lang")}</b>${langToggle()}</div>
      <div class="setting"><b>${t("me.size")}</b>${sizeToggle()}</div>
    </div>
    <button class="btn text" data-act="reset">${t("me.reset")}</button>
  </div>`,
};

S.aha = {
  back: () => "me",
  title: () => t("me.aha"),
  render: () => `<div class="stack">
    <h1 class="h1">📒 ${t("me.aha")}</h1>
    <p class="muted">${t("aha.count", { n: state.aha.length })}</p>
    ${
      state.aha.length
        ? state.aha
            .map(
              (a, i) =>
                `<div class="aha-card"><p>💡 ${esc(a)}</p><button class="chip" data-act="share" data-v="aha:${i}">↗ ${t("f.share")}</button></div>`,
            )
            .join("")
        : `<div class="card"><p>${t("aha.empty")}</p></div><button class="btn primary" data-go="home/1">${t("home.start")} →</button>`
    }
  </div>`,
};

const statsHTML = () => `<div class="stats">
      <div class="stat"><b>🔥 ${state.streak}</b><span class="small muted">${t("home.streak", { n: state.streak })}</span></div>
      <div class="stat pts"><b>⭐ ${state.points}</b><span class="small muted">${t("rk.points")}</span></div>
    </div>`;
function levelBar() {
  const lv = levelOf(state.points);
  if (lv >= LEVELS.length) return `<p class="muted small">${t("lv.max")}</p>`;
  const from = LEVELS[lv - 1],
    to = LEVELS[lv];
  return `<div class="bar"><i style="width:${Math.round(((state.points - from) / (to - from)) * 100)}%"></i></div>
    <p class="muted small">${t("lv.next", { n: to - state.points, level: t("lv." + (lv + 1)) })}</p>`;
}

S.evening = {
  back: () => "home",
  title: () => t("ev.title"),
  render: () => `<div class="stack">
    <div class="card hero stack"><p style="font-size:2.4rem;line-height:1">🌙</p><h1 class="h1">${t("ev.title")}</h1><p class="muted">${t("ev.when")}</p></div>
    <p>${t("ev.what")}</p>
    <p><b>${t("ev.joined")}:</b></p>
    <div style="display:flex;gap:.5rem">${[
      ["I", "#7A4FA0"],
      ["M", "#2B6CB0"],
      ["P", "#B4540A"],
    ]
      .map(([l, c]) => `<div class="avatar" style="background:${c}">${l}</div>`)
      .join("")}</div>
    <button class="btn primary">🔔 ${t("ev.remind")}</button>
    <button class="btn ghost" data-go="home/1">${t("ev.practice")}</button>
  </div>`,
};

// ---------- shell ----------
const langToggle = () =>
  `<div class="lang" role="group" aria-label="Language"><button data-act="lang" data-v="en" aria-pressed="${state.lang === "en"}">EN</button><button data-act="lang" data-v="de" aria-pressed="${state.lang === "de"}">DE</button></div>`;

const sizeToggle = () =>
  `<div class="lang" role="group" aria-label="Text size"><button data-act="big" data-v="0" aria-pressed="${!state.big}">A</button><button data-act="big" data-v="1" aria-pressed="${state.big}" style="font-size:1.2em">A+</button></div>`;

// New users start with onboarding; everyone else lands on today's game.
function parse() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "game") parts[0] = "home"; // old links
  const fallback = state.onboarded || EMBED ? "home" : "ob";
  const name = S[parts[0]] ? parts[0] : fallback;
  return { name, args: S[parts[0]] ? parts.slice(1) : [] };
}

function renderSidebar() {
  const { name } = parse();
  const tab = S[name].tab;
  const lv = levelOf(state.points);
  document.getElementById("sidebar").innerHTML = `
    <a class="brand" href="#/home">${LOGO}<span><b>Fenster</b><small>${t("side.tag")}</small></span></a>
    <nav class="side-nav">${TABS.map((id) => `<a href="#/${id}" class="${tab === id ? "on" : ""}" ${tab === id ? 'aria-current="page"' : ""}>${ICON[id]}${t("nav." + id)}</a>`).join("")}</nav>
    <div class="side-card">
      <p class="label">${t("side.progress")}</p>
      <p class="lvl">${t("me.level", { n: lv, level: t("lv." + lv) })}</p>
      ${levelBar()}
      <div class="nums"><span>🔥 ${state.streak}</span><span>⭐ ${state.points}</span><a href="#/aha" style="color:inherit">📒 ${state.aha.length}</a></div>
    </div>
    <div class="side-settings">
      <div class="row2"><span>${t("me.lang")}</span>${langToggle()}</div>
      <div class="row2"><span>${t("me.size")}</span>${sizeToggle()}</div>
    </div>`;
}

function render() {
  const { name, args } = parse();
  const scr = S[name];
  document.documentElement.lang = state.lang;
  document.documentElement.classList.toggle("big", state.big);
  document.body.classList.toggle("wa", !!scr.bare);
  document.getElementById("device").classList.toggle("focus", !!(scr.focus || scr.bare));

  const top = document.getElementById("topbar");
  top.hidden = !!scr.bare;
  const back = scr.back && scr.back(args);
  top.classList.toggle("plain", !back);
  top.innerHTML = back
    ? `<button class="back" data-go="${back}">‹ ${t("c.back")}</button><span class="title">${scr.title ? scr.title(args) : ""}</span>${langToggle()}`
    : `<span class="logo">${LOGO}Fenster</span>${langToggle()}`;

  const view = document.getElementById("view");
  const keep = scr.immersive && document.getElementById("reel")?.scrollTop; // e.g. language switch mid-feed
  view.classList.toggle("immersive", !!scr.immersive);
  view.innerHTML = scr.render(args);
  view.scrollTop = 0;
  if (keep && !args.length) document.getElementById("reel").scrollTop = keep;
  else if (scr.after) scr.after(args);

  const tabbar = document.getElementById("tabbar");
  tabbar.hidden = !scr.tab;
  tabbar.innerHTML = TABS.map(
    (id) =>
      `<a href="#/${id}" class="${scr.tab === id ? "on" : ""}" ${scr.tab === id ? 'aria-current="page"' : ""}>${ICON[id]}${t("nav." + id)}</a>`,
  ).join("");
  renderSidebar();
}

function shareText(kind) {
  const [k, i] = kind.split(":");
  const url = appUrl();
  if (k === "game") return t("share.game", { n: score(), total: FEED.length, url });
  if (k === "clip") return t("share.clip", { url });
  if (k === "warn") return t("share.warn", { headline: state.check.result?.headline ?? "", url });
  if (k === "aha") return t("share.aha", { text: state.aha[+i], url });
  if (k === "chat") return state.chat.msgs[+i]?.content ?? "";
  return t("share.invite", { url });
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-go],[data-act]");
  if (!el) return;
  if (el.dataset.go) {
    go(el.dataset.go);
    return;
  }
  const act = el.dataset.act;
  if (act === "share") return void share(shareText(el.dataset.v));
  if (act === "cheer") return void toast("👏");
  if (act === "ask") return void runChat(t(el.dataset.v));
  if (act === "quiz") {
    const [id, k] = el.dataset.v.split("/");
    if (!state.lessons.includes(id)) {
      state.lessons.push(id);
      const C = LESSON_TEXT[id]?.[state.lang] ?? LESSON_TEXT[id]?.en;
      learned(C?.ok);
      addPoints(10);
    }
    return go(`lesson/${id}/4/${k}`);
  }
  if (act === "reset") {
    if (!confirm(t("me.resetQ"))) return;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* nothing saved */
    }
    location.hash = "";
    return location.reload();
  }
  // Onboarding done → the window opens onto the Home feed.
  if (act === "start") {
    state.onboarded = true;
    save();
    go("home");
    showSplash();
    return;
  }
  if (el.dataset.act === "answer") {
    answer(+el.dataset.i, el.dataset.v);
    return;
  }
  if (el.dataset.act === "check") return void runCheck();
  if (el.dataset.act === "ckex") {
    Object.assign(state.check, { text: t(el.dataset.v), result: null, error: null });
    return render();
  }
  if (el.dataset.act === "ckagain") {
    Object.assign(state.check, { text: "", status: "idle", result: null, error: null });
    return render();
  }
  if (act === "gpick") return void gamePick(...el.dataset.v.split(":"));
  if (act === "gnext" || act === "gagain") {
    if (act === "gnext") GAME.n++;
    else GAME = newGame();
    render();
    document.getElementById("view").scrollTo?.(0, 0);
    return void window.scrollTo(0, 0);
  }
  // Hide or show the explanation so the clip is visible again. Only a class changes: a video keeps playing.
  if (act === "sheet") {
    const min = el.closest(".sheet").classList.toggle("min");
    el.setAttribute("aria-expanded", String(!min));
    el.textContent = t(min ? "f.show" : "f.hide");
    return;
  }
  // Play today's clips again: answers clear, points already earned stay (and aren't paid twice).
  if (act === "freplay") {
    Object.assign(state, { answers: {}, round: state.round + 1 });
    save();
    if (location.hash === "#/home/1") render();
    else go("home/1");
    return;
  }
  if (el.dataset.act === "next") {
    scrollToClip(+el.dataset.i + 1, true);
    return;
  }
  const v = el.dataset.v;
  switch (el.dataset.act) {
    case "lang":
      state.lang = v;
      break;
    case "big":
      state.big = v === "1";
      break;
    case "level":
      state.level0 = v;
      break;
    case "wa":
      state.wa = el.checked;
      return;
    case "group":
      state.group = el.checked;
      return;
  }
  save();
  render();
});

// Start screen: white → "Fenster" window logo → the window opens and the white dissolves into the app.
function showSplash() {
  document.querySelector(".splash")?.remove();
  const el = document.createElement("div");
  el.className = "splash";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="sp-bg"></div>
    <div class="sp-content"><p class="sp-title">Fenster</p>
      <div class="sp-win"><div class="sp-glow"></div><div class="sp-sash l"></div><div class="sp-sash r"></div></div></div>
    <div class="sp-flood"></div><div class="sp-start"></div>`;
  const done = () => el.remove();
  el.addEventListener("click", () => {
    el.classList.add("skip");
    setTimeout(done, 300);
  });
  document.getElementById("device").appendChild(el);
  setTimeout(done, 4600);
}

document.addEventListener("input", (e) => {
  const act = e.target.dataset.field;
  if (act === "cktext") state.check.text = e.target.value;
  if (act === "chattext") state.chat.draft = e.target.value;
  if (act === "name") {
    state.name = e.target.value.trim().slice(0, 30);
    save();
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.dataset.form !== "chatform") return;
  e.preventDefault();
  runChat(state.chat.draft);
});
// Enter sends a chat message (Shift+Enter for a new line); arrow keys move through the feed on desktop.
document.addEventListener("keydown", (e) => {
  if (e.target.dataset?.field === "chattext" && e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    return void runChat(state.chat.draft);
  }
  if (parse().name !== "home" || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === "ArrowDown" || e.key === "PageDown") scrollToClip(currentClip() + 1, true);
  if (e.key === "ArrowUp" || e.key === "PageUp") scrollToClip(currentClip() - 1, true);
});
window.addEventListener("hashchange", render);
loadContent()
  .catch((err) => console.warn("Content not loaded, using built-in clips:", err.message))
  .finally(render);
// The intro plays when onboarding finishes. ?splash=1 forces it (used by the journey map).
if (params.get("splash") && !matchMedia("(prefers-reduced-motion: reduce)").matches) showSplash();
