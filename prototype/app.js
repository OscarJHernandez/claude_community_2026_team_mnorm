// Fenster clickable prototype. No backend: all data below is fake.
// Routing is hash-based (#/home, #/home/3/fake, ...) so every screen has a link.

const params = new URLSearchParams(location.search);
const store = {
  get(k) {
    try {
      return localStorage.getItem("fenster." + k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("fenster." + k, v);
    } catch {
      /* private mode */
    }
  },
};

const state = {
  lang: params.get("lang") || store.get("lang") || (navigator.language || "en").slice(0, 2),
  big: store.get("big") === "1",
  name: "Anna",
  points: 340,
  streak: 5,
  answers: {}, // round -> picked letter
  level: null,
  wa: true,
  group: true,
};
if (!window.I18N[state.lang]) state.lang = "en";
if (params.get("embed")) document.documentElement.classList.add("embed");

function t(key, vars = {}) {
  let s = window.I18N[state.lang][key] ?? window.I18N.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll("{" + k + "}", v);
  return s;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const go = (path) => {
  location.hash = "#/" + path;
};

// ---------- icons (inline so the prototype works offline) ----------
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

// ---------- fake content ----------
// The daily game: a TikTok-style feed of 7 clips in different media. For each one: real or fake?
// In the real app Claude generates these every day; here they are hand-written samples.
const FEED = [
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
  // Clips 4 and 5 come from the team dataset (dataset/items.json): a real photo and an AI image.
  { k: "d4", ds: "img-0034", answer: "real", lesson: "images", media: () => dsPhoto("img-0034") },
  { k: "d5", ds: "img-0033", answer: "fake", lesson: "images", media: () => dsPhoto("img-0033") },
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
];
const PTS = 20;

// Dataset items by id, filled at startup by loadDataset() from dataset/loader.js.
const DS = {};
const dsPhoto = (id) =>
  DS[id] ? `<div class="photo"><img src="${DS[id].src}" alt=""></div>` : `<div class="photo">${handSVG(true)}</div>`;
// The dataset is English; German clues/explanations come from DATASET_DE (generated by Claude in the real build).
function dsText(id, field) {
  const de = state.lang === "de" && window.DATASET_DE?.[id]?.[field];
  return de || DS[id]?.[field];
}
function dsCredit(id) {
  const src = DS[id]?.source;
  if (!src) return "";
  return [src.author, src.license, src.dataset].filter(Boolean).join(" · ");
}
const score = () => FEED.filter((F, i) => state.answers[i + 1] === F.answer).length;

const TASKS = [
  { ico: "📧", key: "t.scam", pts: 20, to: "home/3" },
  { ico: "☀️", key: "t.morning", pts: 15, to: "chat" },
  { ico: "🛒", key: "t.ask", pts: 15, to: "chat" },
  { ico: "🗣️", key: "t.explain", pts: 25, to: "lesson/what" },
  { ico: "🌙", key: "t.evening", pts: 30, to: "evening" },
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
  back: (a) => (a[0] === "1" ? "wa" : "ob/" + (+a[0] - 1)),
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
      <h1 class="h1">${t("ob.hi", { name: state.name })}</h1>
      <p>${t("ob.q")}</p>
      ${[
        ["o1", "🌱"],
        ["o2", "🌿"],
        ["o3", "🌳"],
      ]
        .map(
          ([k, ico]) =>
            `<button class="choice" data-act="level" data-v="${k}" aria-pressed="${state.level === k}"><span class="ico">${ico}</span><span><b>${t("ob." + k)}</b><span class="sub">${t("ob." + k + "s")}</span></span></button>`,
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
    if (i && pick) state.answers[+i] = pick;
    return `<div class="feed-wrap">
      <div class="feed-top">
        <span class="logo">Fenster</span>${langToggle()}
        <span class="pill">🔥 ${state.streak}</span><span class="pill">⭐ <span id="feed-pts">${state.points + score() * PTS}</span></span>
        <a class="pill" href="#/tasks" style="margin-left:auto">☰ ${t("f.tasks")}</a>
      </div>
      <div class="reel" id="reel">
        ${FEED.map((F, n) => `<section class="clip" data-i="${n + 1}">${clip(n + 1)}</section>`).join("")}
        <section class="clip clip-result" data-i="${FEED.length + 1}">${resultHTML(score())}</section>
      </div>
    </div>`;
  },
  after: ([i]) => {
    if (i) scrollToClip(+i, false);
  },
};

function clip(i) {
  const F = FEED[i - 1],
    pick = state.answers[i],
    ok = pick === F.answer,
    last = i === FEED.length;
  const sheet = `<div class="sheet ${ok ? "ok" : "no"}">
      <p class="h">${ok ? "✅ " + t("f.right", { n: PTS }) : "💛 " + t("f.wrong")}</p>
      <p style="margin-top:.4rem"><b>${t(F.answer === "fake" ? "f.wasFake" : "f.wasReal")}</b> ${t("g.why")}:</p>
      <ul class="why">${(F.ds && DS[F.ds] ? dsText(F.ds, "clues") : [1, 2, 3].map((w) => t(whyKey(F, w)))).map((c) => `<li>${c}</li>`).join("")}</ul>
      ${F.ds && DS[F.ds] ? `<p class="aha">💡 <b>Aha!</b> ${dsText(F.ds, "explanation")}</p>` : ""}
      <span class="claude-tag">✦ ${t("c.byClaude")}</span>
      ${F.ds && DS[F.ds] ? `<p class="credit">📷 ${esc(dsCredit(F.ds))}</p>` : ""}
      ${ok ? "" : `<button class="btn ghost" style="margin-top:.7rem" data-go="lesson/${F.lesson}">📖 ${t("g.helpCta")}</button>`}
      <button class="btn primary" style="margin-top:.7rem" data-act="next" data-i="${i}">${last ? t("f.done") : t("f.next")} ↓</button>
    </div>`;
  return `<div class="clip-media">${F.media()}</div>
    <div class="rail">
      <button data-go="wa"><span>↗</span>${t("f.share")}</button>
      <button data-go="lesson/${F.lesson}"><span>📖</span>${t("f.learn")}</button>
    </div>
    <div class="clip-meta"><span><b>${t(F.k + ".handle")}</b> · ${t(F.k + ".cap")}</span><span class="count">${t("f.count", { n: i, total: FEED.length })}</span></div>
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
  state.answers[i] = v;
  document.querySelector(`.clip[data-i="${i}"]`).innerHTML = clip(i);
  document.querySelector(".clip-result").innerHTML = resultHTML(score());
  document.getElementById("feed-pts").textContent = state.points + score() * PTS;
}

function scrollToClip(i, smooth) {
  const reel = document.getElementById("reel"),
    el = reel && reel.children[i - 1];
  if (el) reel.scrollTo({ top: el.offsetTop, behavior: smooth ? "smooth" : "auto" });
}

function resultHTML(s) {
  const low = s < 4;
  return `<div class="stack center result-in">
      <p style="font-size:3rem;line-height:1">${low ? "🌱" : "🎉"}</p>
      <h1 class="h1">${t("res.title", { name: state.name })}</h1>
      <p class="big-num">${s}/${FEED.length}</p>
      <p>${t("res.score", { n: s, total: FEED.length })} · <b>${t("res.earned", { n: s * PTS })}</b> · ${t("res.streak", { n: state.streak + 1 })}</p>
      ${low ? `<div class="card" style="text-align:left"><p>${t("res.low")}</p><button class="btn primary" style="margin-top:.7rem" data-go="lesson/scams">${t("res.lowCta")}</button></div>` : ""}
      <div class="card stack" style="text-align:left">
        <h2 style="font-size:1.1rem">👨‍👩‍👧 ${t("res.shareT")}</h2>
        <p class="muted">${t("res.shareS")}</p>
        <button class="btn wa" data-go="wa">${t("c.share")}</button>
      </div>
    </div>`;
}

S.result = {
  back: () => "home",
  render: ([forced]) =>
    `<div class="stack">${resultHTML(forced != null ? +forced : score())}<button class="btn ghost" data-go="home">${t("c.home")}</button></div>`,
};

// The former home: greeting, tasks and group activity. Opened from "Tasks" in the feed.
S.tasks = {
  back: () => "home",
  title: () => t("f.tasks"),
  render: () => `<div class="stack">
    <h1 class="h1">${t("home.hi", { name: state.name })} ☀️</h1>
    <div class="stats">
      <div class="stat"><b>🔥 ${state.streak}</b><span class="small muted">${t("home.streak", { n: state.streak })}</span></div>
      <div class="stat pts"><b>⭐ ${state.points}</b><span class="small muted">${t("rk.points")}</span></div>
    </div>
    <div class="card hero stack">
      <p class="small muted">${t("home.today")}</p>
      <h2 class="h1">${t("home.todayT")}</h2>
      <p class="muted">${t("home.todayS")} · <b>+${FEED.length * PTS}</b></p>
      <button class="btn light" data-go="home/1">${t("home.start")} →</button>
    </div>
    <h2 class="h2">${t("home.tasks")}</h2>
    <div>${TASKS.map((x) => `<button class="task" data-go="${x.to}"><span class="ico">${x.ico}</span><span>${t(x.key)}</span><span class="badge-pts">+${x.pts}</span></button>`).join("")}</div>
    <h2 class="h2">${t("home.feed")}</h2>
    <div class="card feed"><div class="avatar" style="background:#2B6CB0">M</div><span style="flex:1">${t("f.max")}</span><button class="btn primary" data-go="home/5">${t("f.play")}</button></div>
    <div class="card feed"><div class="avatar" style="background:#7A4FA0">I</div><span style="flex:1">${t("f.ingrid")}</span><button class="btn ghost">${t("f.cheer")}</button></div>
  </div>`,
};

S.learn = {
  tab: "learn",
  render: () => `<div class="stack">
    <h1 class="h1">${t("l.title")}</h1><p class="muted">${t("l.sub")}</p>
    <div class="grid">${LESSONS.map((L) => `<button class="tile" data-go="lesson/${L.id}"><span class="ico">${L.ico}</span><b>${t("l." + L.id)}</b><span class="meta">${t(L.lvl === 1 ? "l.lvl1" : "l.lvl2")} · ${t("c.min", { n: L.min })}</span></button>`).join("")}</div>
  </div>`,
};

S.lesson = {
  back: () => "learn",
  title: ([id]) => t("l." + (id || "safety")),
  render: ([id = "safety", card = "1", ans]) => {
    const L = LESSONS.find((x) => x.id === id) || LESSONS[1];
    const cards = ["ls.s1", "ls.s2", "ls.s3"];
    const c = +card;
    if (c <= cards.length) {
      return `<div class="stack">
        <p class="muted small">${t("ls.card", { n: c, total: cards.length + 1 })}</p>
        <div class="card" style="min-height:14rem;display:flex;flex-direction:column;justify-content:center;gap:1rem">
          <p style="font-size:2.6rem;line-height:1">${["🧐", "🔐", "📞"][c - 1]}</p>
          <p style="font-size:1.15rem">${t(cards[c - 1])}</p>
        </div>
        <div class="dots">${[1, 2, 3, 4].map((i) => `<i class="${i === c ? "on" : ""}"></i>`).join("")}</div>
        ${id !== "safety" && id !== "scams" ? `<p class="muted small">✦ ${t("ls.placeholder")}</p>` : ""}
        <button class="btn primary" data-go="lesson/${L.id}/${c + 1}">${t("c.continue")} →</button>
      </div>`;
    }
    const opts = [
      ["qa", 0],
      ["qb", 1],
      ["qc", 0],
    ];
    return `<div class="stack">
      <p class="muted small">${t("ls.card", { n: 4, total: 4 })}</p>
      <h1 class="h1">${t("ls.q")}</h1>
      ${opts
        .map(([k, right]) => {
          const p = ans === k;
          const st = ans
            ? right
              ? "border-color:var(--ok);background:var(--ok-soft)"
              : p
                ? "border-color:var(--bad);background:var(--bad-soft)"
                : ""
            : "";
          return `<button class="choice" style="${st}" data-go="lesson/${L.id}/4/${k}"><b>${t("ls." + k)}</b></button>`;
        })
        .join("")}
      ${
        ans
          ? `<div class="feedback ${ans === "qb" ? "ok" : "no"}"><p class="h">${ans === "qb" ? "✅ " + t("ls.ok") : "💛 " + t("g.wrong")}</p><span class="claude-tag">✦ ${t("c.byClaude")}</span></div>
      <button class="btn primary" data-go="learn">${t("c.continue")}</button>`
          : ""
      }
    </div>`;
  },
};

S.create = {
  tab: "create",
  render: () => `<div class="stack">
    <h1 class="h1">${t("cr.title")}</h1><p class="muted">${t("cr.sub")}</p>
    <button class="choice" data-go="chat"><span class="ico">💬</span><span><b>${t("cr.chat")}</b><span class="sub">${t("cr.chatS")}</span></span></button>
    <button class="choice" data-go="image"><span class="ico">🎨</span><span><b>${t("cr.img")}</b><span class="sub">${t("cr.imgS")}</span></span></button>
    <button class="choice" data-go="check"><span class="ico">🔍</span><span><b>${t("cr.check")}</b><span class="sub">${t("cr.checkS")}</span></span></button>
  </div>`,
};

S.chat = {
  back: () => "create",
  title: () => t("ch.title"),
  render: () => `<div class="stack">
    <div class="bubble me">${t("ch.u1")}</div>
    <div class="bubble ai">${t("ch.a1")}<br><span class="claude-tag">✦ Claude</span></div>
    <div class="chips"><button class="chip">${t("ch.shorter")}</button><button class="chip">${t("ch.funnier")}</button></div>
    <button class="btn wa" data-go="wa">${t("ch.send")}</button>
    <p class="muted small">${t("c.disclaimer")}</p>
    <div class="composer"><textarea rows="2" placeholder="${t("ch.ph")}"></textarea><button class="btn ghost">🎤 ${t("ch.speak")}</button></div>
  </div>`,
};

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

S.check = {
  back: () => "create",
  title: () => t("ck.title"),
  render: ([done]) => `<div class="stack">
    <label for="ckt"><b>${t("ck.label")}</b></label>
    <textarea id="ckt" class="field" rows="4">${t("ck.sample")}</textarea>
    ${
      !done
        ? `<button class="btn primary" data-go="check/1">🔍 ${t("ck.go")}</button>`
        : `
    <div class="feedback no"><p class="h">⚠️ ${t("ck.verdict")}</p>
      <p style="margin-top:.5rem"><b>${t("ck.signs")}:</b></p><ul class="why">${["ck.s1", "ck.s2", "ck.s3"].map((k) => `<li>${t(k)}</li>`).join("")}</ul>
      <span class="claude-tag">✦ ${t("c.byClaude")}</span></div>
    <div class="card"><p><b>${t("ck.todo")}:</b></p><ul class="why">${["ck.t1", "ck.t2", "ck.t3"].map((k) => `<li>${t(k)}</li>`).join("")}</ul></div>
    <button class="btn ghost" data-go="lesson/report">🚩 ${t("ck.report")}</button>
    <button class="btn wa" data-go="wa">📣 ${t("ck.warn")}</button>
    <p class="muted small">${t("c.disclaimer")}</p>`
    }
  </div>`,
};

S.rank = {
  tab: "rank",
  render: ([scope = "group", metric = "points"]) => {
    const list = [...PEOPLE[scope]].sort((a, b) => (metric === "points" ? b[1] - a[1] : b[2] - a[2]));
    return `<div class="stack">
      <h1 class="h1">${t("rk.title")} 🏆</h1>
      <div class="seg"><button aria-pressed="${scope === "group"}" data-go="rank/group/${metric}">${t("rk.group")}</button><button aria-pressed="${scope === "all"}" data-go="rank/all/${metric}">${t("rk.all")}</button></div>
      <div class="seg"><button aria-pressed="${metric === "points"}" data-go="rank/${scope}/points">⭐ ${t("rk.points")}</button><button aria-pressed="${metric === "streak"}" data-go="rank/${scope}/streak">🔥 ${t("rk.streak")}</button></div>
      <div>${list
        .map(([n, p, s, col], i) => {
          const me = n === "ME";
          return `<div class="row ${me ? "me" : ""}"><span class="rank">${["🥇", "🥈", "🥉"][i] || i + 1}</span><div class="avatar" style="background:${col}">${(me ? state.name : n)[0]}</div><span class="name">${me ? state.name + " (" + t("c.you") + ")" : n}</span><span class="val">${metric === "points" ? p : t("rk.days", { n: s })}</span></div>`;
        })
        .join("")}</div>
      <p class="muted small">${t("rk.reset")}</p>
    </div>`;
  },
};

S.me = {
  tab: "me",
  render: () => `<div class="stack">
    <div style="display:flex;gap:1rem;align-items:center"><div class="avatar" style="width:4rem;height:4rem;font-size:1.6rem">${state.name[0]}</div><div><h1 class="h1">${state.name}</h1><p class="muted">${t("me.level")}</p></div></div>
    <div class="bar"><i style="width:68%"></i></div><p class="muted small">${t("me.next")}</p>
    <h2 class="h2">${t("me.badges")}</h2>
    <div class="badges">${[
      ["🎮", "b.first"],
      ["🔥", "b.streak"],
      ["🕵️", "b.spotter"],
      ["🎨", "b.artist", 1],
      ["🎓", "b.teacher", 1],
    ]
      .map(
        ([i, k, locked]) => `<div class="badge ${locked ? "locked" : ""}"><span class="ico">${i}</span>${t(k)}</div>`,
      )
      .join("")}</div>
    <h2 class="h2">${t("me.groups")}</h2>
    <div class="card feed"><div class="avatar">👨‍👩‍👧</div><span style="flex:1"><b>${t("me.g1")}</b><br><span class="small muted">${t("me.members", { n: 5 })}</span></span></div>
    <div class="card feed"><div class="avatar" style="background:#7A4FA0">🎵</div><span style="flex:1"><b>${t("me.g2")}</b><br><span class="small muted">${t("me.members", { n: 12 })}</span></span></div>
    <button class="btn ghost">${t("me.newGroup")}</button>
    <button class="btn wa" data-go="wa">${t("me.invite")}</button>
    <h2 class="h2">${t("me.settings")}</h2>
    <div class="card" style="padding:.2rem 1rem">
      <div class="setting"><b>${t("me.lang")}</b>${langToggle()}</div>
      <div class="setting"><b>${t("me.size")}</b><div class="lang"><button data-act="big" data-v="0" aria-pressed="${!state.big}">${t("me.normal")}</button><button data-act="big" data-v="1" aria-pressed="${state.big}">${t("me.large")}</button></div></div>
      <div class="setting"><b>${t("me.remind")}</b><span class="muted">${t("me.remindV")}</span></div>
    </div>
  </div>`,
};

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

function parse() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "game") parts[0] = "home"; // old links
  const name = S[parts[0]] ? parts[0] : "wa";
  return { name, args: parts.slice(1) };
}

function render() {
  const { name, args } = parse();
  const scr = S[name];
  document.documentElement.lang = state.lang;
  document.documentElement.classList.toggle("big", state.big);
  document.body.classList.toggle("wa", !!scr.bare);

  const top = document.getElementById("topbar");
  top.hidden = !!(scr.bare || scr.immersive);
  if (scr.back) {
    top.innerHTML = `<button class="back" data-go="${scr.back(args)}">‹ ${t("c.back")}</button><span class="title">${scr.title ? scr.title(args) : ""}</span>${langToggle()}`;
  } else {
    top.innerHTML = `<span class="logo">Fenster</span>${langToggle()}`;
  }

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

  // prototype side panel (desktop only)
  document.querySelectorAll("[data-t]").forEach((el) => {
    el.textContent = t(el.dataset.t);
  });
  const here = location.hash.replace(/^#\/?/, "") || "wa";
  document.getElementById("proto-links").innerHTML = PROTO_LINKS.map(
    ([p, label]) => `<a href="#/${p}" class="${here === p ? "on" : ""}">${label}</a>`,
  ).join("");
}

const PROTO_LINKS = [
  ["wa", "0 · WhatsApp invite"],
  ["ob/1", "1 · Language & text size"],
  ["ob/2", "2 · About you"],
  ["ob/3", "3 · Permissions → intro"],
  ["home/1", "4 · Feed: AI bunny video"],
  ["home/2", "5 · Feed: fake newspaper"],
  ["home/3", "6 · Feed: scam email"],
  ["home/4/fake", "7 · Feed: real photo (wrong answer)"],
  ["home/5", "8 · Feed: AI image (dataset)"],
  ["home/6", "9 · Feed: cloned voice note"],
  ["home/7/real", "10 · Feed: real library news"],
  ["home/8", "11 · Feed: result & share"],
  ["tasks", "12 · Tasks & group"],
  ["learn", "13 · Learn library"],
  ["lesson/safety", "14 · Lesson cards"],
  ["lesson/safety/4", "15 · Lesson quiz"],
  ["create", "16 · Try AI"],
  ["chat", "17 · AI helper chat"],
  ["image", "18 · Make a picture"],
  ["check", "19 · Scam checker"],
  ["check/1", "20 · Scam checker result"],
  ["rank", "21 · Weekly ranking"],
  ["me", "22 · Profile & groups"],
  ["evening", "23 · Evening game"],
];

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-go],[data-act]");
  if (!el) return;
  if (el.dataset.go) {
    go(el.dataset.go);
    return;
  }
  if (el.dataset.act === "splash") {
    showSplash();
    return;
  }
  // Onboarding done → the window opens onto the Home feed.
  if (el.dataset.act === "start") {
    go("home");
    showSplash();
    return;
  }
  if (el.dataset.act === "answer") {
    answer(+el.dataset.i, el.dataset.v);
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
      store.set("lang", v);
      break;
    case "big":
      state.big = v === "1";
      store.set("big", v);
      break;
    case "level":
      state.level = v;
      break;
    case "wa":
      state.wa = el.checked;
      return;
    case "group":
      state.group = el.checked;
      return;
  }
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

window.addEventListener("hashchange", render);
import("../dataset/loader.js")
  .then(({ loadDataset }) => loadDataset())
  .then((items) =>
    items.forEach((i) => {
      DS[i.id] = i;
    }),
  )
  .catch((err) => console.warn("Dataset not loaded, using drawn fallbacks:", err.message))
  .finally(render);
// The intro plays when onboarding finishes. ?splash=1 forces it (used by the journey map).
if (params.get("splash") && !matchMedia("(prefers-reduced-motion: reduce)").matches) showSplash();
