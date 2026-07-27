/* ============================================================
   EINS — v1
   Vier Bewegungen: Leeren · Ordnen · Eins · Los.
   Keine Punkte, keine Streaks, kein Konfetti. Absicht.
   Alles lokal im Browser (localStorage). Keine Abhängigkeiten.
============================================================ */

const KEY = "eins_v1";

/* ---------- Zustand ---------- */
// item = { id, text, bucket, day, done, snoozeUntil, createdAt }
// bucket: 'inbox' | 'jetzt' | 'woche' | 'irgendwann' | 'notiz'
let state = loadState();
let seq = state._seq || 0;
let oneOffset = 0;                 // "Andere": rotiert durch die Kandidaten (nur Session)
let defaultMin = state._defaultMin || 15;
let zerlegeBusy = false;           // "Zerleg das" läuft gerade
let zerlegeErr = "";               // letzte Fehlermeldung von "Zerleg das"

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { items: [] };
    const s = JSON.parse(raw);
    if (!Array.isArray(s.items)) s.items = [];
    return s;
  } catch (e) {
    return { items: [] };
  }
}
function persist() {
  state._seq = seq;
  state._defaultMin = defaultMin;
  localStorage.setItem(KEY, JSON.stringify(state));
}

/* ---------- Helfer ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const uid = () => { seq += 1; return "i" + Date.now().toString(36) + seq; };
const items = () => state.items;

function todayStr() { return isoDay(new Date()); }
function isoDay(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}
function addDays(base, n) {
  const d = new Date(base + "T00:00");
  d.setDate(d.getDate() + n);
  return isoDay(d);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Navigation ---------- */
$$(".nav-btn").forEach((b) => {
  b.addEventListener("click", () => show(b.dataset.view));
});
function show(view) {
  $$(".nav-btn").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  $$(".view").forEach((v) => v.classList.remove("active"));
  $("#view-" + view).classList.add("active");
  if (view === "eins") renderOne();
  if (view === "ordnen") renderOrdnen();
  if (view === "woche") renderWoche();
  if (view === "suche") renderSearch();
}

/* ---------- Leeren (Erfassung) ---------- */
const cap = $("#capture");
cap.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && cap.value.trim()) {
    items().unshift({
      id: uid(), text: cap.value.trim(), bucket: "inbox",
      day: null, done: false, snoozeUntil: null, createdAt: Date.now(),
    });
    cap.value = "";
    persist();
    refreshBadges();
    // ruhige Rückmeldung: Feld kurz bestätigen
    cap.placeholder = "Notiert.";
    setTimeout(() => (cap.placeholder = "Gedanke rein — Enter genügt"), 900);
  }
});

/* Spracheingabe (falls der Browser sie kann) */
(function voice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $("#micBtn");
  if (!SR) return;
  btn.hidden = false;
  const rec = new SR();
  rec.lang = "de-DE"; rec.interimResults = false; rec.maxAlternatives = 1;
  btn.addEventListener("click", () => {
    try { rec.start(); btn.classList.add("listening"); } catch (e) {}
  });
  rec.onresult = (ev) => {
    const t = ev.results[0][0].transcript;
    cap.value = cap.value ? cap.value + " " + t : t;
    cap.focus();
  };
  rec.onend = () => btn.classList.remove("listening");
  rec.onerror = () => btn.classList.remove("listening");
})();

function refreshBadges() {
  const n = items().filter((i) => i.bucket === "inbox").length;
  $("#inboxBadge").textContent = n ? "(" + n + ")" : "";
}

/* ============================================================
   EINS — die eine Sache
============================================================ */
function candidates() {
  const today = todayStr();
  const awake = (i) => !i.done && (!i.snoozeUntil || i.snoozeUntil <= today);
  // 1. was auf "Jetzt" liegt
  let c = items().filter((i) => i.bucket === "jetzt" && awake(i));
  // 2. sonst: Wochen-Aufgaben, die für heute (oder früher) vorgesehen sind
  if (!c.length)
    c = items().filter((i) => i.bucket === "woche" && awake(i) && i.day && i.day <= today);
  // 3. sonst: irgendeine Wochen-Aufgabe
  if (!c.length)
    c = items().filter((i) => i.bucket === "woche" && awake(i));
  c.sort((a, b) => a.createdAt - b.createdAt); // stabil, ältestes zuerst
  return c;
}

function renderOne() {
  const wrap = $("#oneWrap");
  const c = candidates();
  if (!c.length) {
    wrap.innerHTML = `
      <div class="calm">
        <div class="big">Nichts steht an.</div>
        <p>Das ist erlaubt. Wenn dir etwas einfällt, wirf es oben ins Feld —
        sortieren kannst du es später in Ruhe.</p>
      </div>`;
    return;
  }
  if (oneOffset >= c.length) oneOffset = 0;
  const it = c[oneOffset];
  const bucketLabel = it.bucket === "jetzt" ? "Jetzt" : "Diese Woche";
  const steps = Array.isArray(it.steps) ? it.steps : [];
  wrap.innerHTML = `
    <div class="onecard">
      <span class="eyebrow">${bucketLabel} · <span id="oneDur">${defaultMin} Min</span></span>
      <h2>${esc(it.text)}</h2>

      ${steps.length ? `
      <ol class="steps">
        ${steps.map((s, i) => `
          <li class="step ${s.done ? "done" : ""} ${i === 0 && !s.done ? "first" : ""}" data-i="${i}">
            <button class="check step-check ${s.done ? "on" : ""}">${s.done ? "✓" : ""}</button>
            <span class="step-text">${esc(s.text)}</span>
            ${s.min ? `<span class="step-min">${s.min} Min</span>` : ""}
          </li>`).join("")}
      </ol>` : ""}

      ${zerlegeErr ? `<p class="zerr">${esc(zerlegeErr)}</p>` : ""}

      <div class="dur" id="durPick">
        ${[15, 25, 45].map((m) =>
          `<button data-min="${m}" class="${m === defaultMin ? "on" : ""}">${m} Min</button>`).join("")}
      </div>
      <div class="one-actions">
        <button class="btn" id="oneStart">Los</button>
        <button class="check" id="oneDone" title="ohne Timer erledigt"></button>
        <button class="link" id="oneNot">Nicht heute</button>
        ${c.length > 1 ? '<button class="link" id="oneOther">Andere</button>' : ""}
        ${steps.length ? "" :
          `<button class="link zerlege" id="oneZerlege" ${zerlegeBusy ? "disabled" : ""}>${zerlegeBusy ? "… zerlege" : "✨ Zerleg das"}</button>`}
      </div>
    </div>`;

  $("#durPick").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      defaultMin = parseInt(b.dataset.min, 10);
      persist();
      renderOne();
    });
  });
  $("#oneStart").addEventListener("click", () => startTimer(it.id, defaultMin));
  $("#oneDone").addEventListener("click", () => complete(it.id));
  $("#oneNot").addEventListener("click", () => {
    // kostet nichts, kein Dialog: bis morgen aus dem Blick
    it.snoozeUntil = addDays(todayStr(), 1);
    persist();
    oneOffset = 0;
    renderOne();
  });
  const other = $("#oneOther");
  if (other) other.addEventListener("click", () => { oneOffset += 1; renderOne(); });

  // Schritte abhaken; alle erledigt → Aufgabe erledigt
  wrap.querySelectorAll(".step").forEach((li) => {
    li.querySelector(".step-check").addEventListener("click", () => {
      const s = it.steps[parseInt(li.dataset.i, 10)];
      if (!s) return;
      s.done = !s.done;
      persist();
      if (it.steps.every((x) => x.done)) complete(it.id);
      else renderOne();
    });
  });

  // "Zerleg das" — ein Sprachmodell macht aus Nebel einen ersten Schritt
  const zb = $("#oneZerlege");
  if (zb) zb.addEventListener("click", async () => {
    zerlegeErr = "";
    if (!getApiKey()) { showKeyForm(it.id); return; }
    zerlegeBusy = true; renderOne();
    try {
      it.steps = await zerlege(it.text);
      persist();
    } catch (e) {
      zerlegeErr = friendlyError(e);
    } finally {
      zerlegeBusy = false;
      renderOne();
    }
  });
}

function complete(id) {
  const it = items().find((x) => x.id === id);
  if (!it) return;
  it.done = true;
  persist();
  refreshBadges();
  showTick();
  oneOffset = 0;
  setTimeout(renderOne, 700);
}

/* ruhiges Häkchen statt Konfetti */
function showTick() {
  const t = document.createElement("div");
  t.className = "tick";
  t.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44"/>
    <path d="M32 52 L45 65 L70 36"/></svg>`;
  document.body.append(t);
  setTimeout(() => t.remove(), 1150);
}

/* ============================================================
   ORDNEN — einer nach dem anderen, vier Knöpfe
============================================================ */
function renderOrdnen() {
  const wrap = $("#ordnenWrap");
  const inbox = items().filter((i) => i.bucket === "inbox");
  if (!inbox.length) {
    wrap.innerHTML = `
      <div class="calm">
        <div class="big">Nichts zu ordnen.</div>
        <p>Der Kopf ist leer, der Posteingang auch. Genau so soll es sein.</p>
      </div>`;
    return;
  }
  inbox.sort((a, b) => a.createdAt - b.createdAt); // ältestes zuerst, nichts rottet
  const it = inbox[0];
  const left = inbox.length;
  wrap.innerHTML = `
    <div class="sortcard">
      <span class="count">Noch ${left} ${left === 1 ? "Eintrag" : "Einträge"}</span>
      <div class="text">${esc(it.text)}</div>
      <div class="sort-btns">
        <button class="jetzt" data-b="jetzt">Jetzt<span class="k">heute dran</span></button>
        <button data-b="woche">Diese Woche<span class="k">bald</span></button>
        <button data-b="irgendwann">Irgendwann<span class="k">schuldfrei</span></button>
        <button data-b="notiz">Notiz<span class="k">nur merken</span></button>
      </div>
    </div>`;
  wrap.querySelectorAll(".sort-btns button").forEach((b) => {
    b.addEventListener("click", () => {
      it.bucket = b.dataset.b;
      if (it.bucket === "woche") it.day = null; // Tag später in der Woche
      persist();
      refreshBadges();
      renderOrdnen();
    });
  });
}

/* ============================================================
   WOCHE — sieben Tage, nichts wird rot
============================================================ */
function renderWoche() {
  const today = todayStr();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Ablage: Wochen-Aufgaben ohne Tag
  const tray = items().filter((i) => i.bucket === "woche" && !i.day && !i.done);
  const trayWrap = $("#trayWrap");
  if (tray.length) {
    trayWrap.innerHTML = `
      <div class="tray">
        <span class="eyebrow">Diese Woche · noch kein Tag</span>
        ${tray.map((it) => `
          <div class="tray-item" data-id="${it.id}">
            <span class="t">${esc(it.text)}</span>
            <div class="daychips">
              ${days.map((d) => `<button data-id="${it.id}" data-day="${d}">${dayShort(d)}</button>`).join("")}
            </div>
          </div>`).join("")}
      </div>`;
    trayWrap.querySelectorAll(".daychips button").forEach((b) => {
      b.addEventListener("click", () => {
        const it = items().find((x) => x.id === b.dataset.id);
        if (it) { it.day = b.dataset.day; persist(); renderWoche(); }
      });
    });
  } else {
    trayWrap.innerHTML = "";
  }

  // Sieben-Tage-Raster
  const week = $("#weekWrap");
  week.innerHTML = days.map((d) => {
    const dayItems = items().filter((i) =>
      !i.done && ((i.bucket === "woche" && i.day === d) ||
                  (i.bucket === "jetzt" && d === today)));
    return `
      <div class="day ${d === today ? "today" : ""}">
        <h4>${dayLong(d)}</h4>
        ${dayItems.map((it) => `
          <div class="day-item ${d < today ? "past" : ""}" data-id="${it.id}" title="Antippen: erledigt">
            <span class="dot">·</span><span>${esc(it.text)}</span>
          </div>`).join("") || '<div class="day-item" style="opacity:.35">—</div>'}
      </div>`;
  }).join("");
  week.querySelectorAll(".day-item[data-id]").forEach((el) => {
    el.addEventListener("click", () => {
      const it = items().find((x) => x.id === el.dataset.id);
      if (it) { it.done = true; persist(); refreshBadges(); showTick(); setTimeout(renderWoche, 700); }
    });
  });
}
function dayShort(d) {
  return new Date(d + "T00:00").toLocaleDateString("de-DE", { weekday: "short" });
}
function dayLong(d) {
  const dt = new Date(d + "T00:00");
  const wd = dt.toLocaleDateString("de-DE", { weekday: "short" });
  return d === todayStr() ? "Heute" : wd + " " + dt.getDate() + ".";
}

/* ============================================================
   SUCHE
============================================================ */
const searchInput = $("#searchInput");
searchInput.addEventListener("input", renderSearch);
function renderSearch() {
  const q = searchInput.value.trim().toLowerCase();
  const wrap = $("#searchWrap");
  if (!q) { wrap.innerHTML = '<p class="empty">Tipp einen Suchbegriff ein.</p>'; return; }
  const hits = items().filter((i) => i.text.toLowerCase().includes(q));
  if (!hits.length) { wrap.innerHTML = '<p class="empty">Nichts gefunden.</p>'; return; }
  const label = { inbox: "Posteingang", jetzt: "Jetzt", woche: "Woche", irgendwann: "Irgendwann", notiz: "Notiz" };
  wrap.innerHTML = hits.map((it) => `
    <div class="result ${it.done ? "done" : ""}">
      <button class="check ${it.done ? "on" : ""}" data-id="${it.id}">${it.done ? "✓" : ""}</button>
      <span class="t">${esc(it.text)}</span>
      <span class="tagpill">${it.done ? "erledigt" : label[it.bucket] || it.bucket}</span>
    </div>`).join("");
  wrap.querySelectorAll(".check").forEach((b) => {
    b.addEventListener("click", () => {
      const it = items().find((x) => x.id === b.dataset.id);
      if (it) { it.done = !it.done; persist(); refreshBadges(); renderSearch(); }
    });
  });
}

/* ============================================================
   LOS — der Ring, der sich leert (Zeit als Fläche)
============================================================ */
const R = 130, CIRC = 2 * Math.PI * R;
$("#ringFill").style.strokeDasharray = CIRC;

let timer = { id: null, total: 0, left: 0, running: false, tick: null, endAt: 0 };

function startTimer(taskId, minutes) {
  const it = items().find((x) => x.id === taskId);
  timer.id = taskId;
  timer.total = minutes * 60;
  timer.left = timer.total;
  timer.running = true;
  timer.endAt = Date.now() + timer.total * 1000;
  $("#timerTask").textContent = it ? it.text : "";
  $("#timerToggle").textContent = "Pause";
  $("#timerOverlay").hidden = false;
  drawRing();
  clearInterval(timer.tick);
  timer.tick = setInterval(loop, 250);
}
function loop() {
  if (!timer.running) return;
  timer.left = Math.max(0, Math.round((timer.endAt - Date.now()) / 1000));
  drawRing();
  if (timer.left <= 0) {
    clearInterval(timer.tick);
    timer.running = false;
    closeTimer();
    complete(timer.id);         // erledigt: ein Häkchen, kein Konfetti
    show("eins");
  }
}
function drawRing() {
  const frac = timer.total ? timer.left / timer.total : 0; // voll → leer
  $("#ringFill").style.strokeDashoffset = CIRC * (1 - frac);
  const m = Math.floor(timer.left / 60), s = timer.left % 60;
  $("#timerRemain").textContent = m + ":" + String(s).padStart(2, "0");
}
$("#timerToggle").addEventListener("click", () => {
  if (timer.running) {
    timer.running = false;
    $("#timerToggle").textContent = "Weiter";
  } else {
    timer.running = true;
    timer.endAt = Date.now() + timer.left * 1000;
    $("#timerToggle").textContent = "Pause";
  }
});
$("#timerDone").addEventListener("click", () => {
  clearInterval(timer.tick); timer.running = false;
  closeTimer(); complete(timer.id); show("eins");
});
$("#timerClose").addEventListener("click", () => {
  clearInterval(timer.tick); timer.running = false;
  closeTimer(); renderOne();
});
function closeTimer() { $("#timerOverlay").hidden = true; }

/* ============================================================
   ZERLEG DAS (v2) — ein Sprachmodell (Claude API) macht aus einer
   vagen Aufgabe einen lächerlich kleinen ersten Schritt.
   Läuft direkt im Browser mit deinem eigenen Anthropic-Key
   (lokal gespeichert, nur für den Eigengebrauch gedacht).
============================================================ */
const API_KEY_STORE = "eins_anthropic_key";
// Standardmodell. Schneller & günstiger: "claude-haiku-4-5".
const MODEL = "claude-opus-5";

const getApiKey = () => localStorage.getItem(API_KEY_STORE) || "";
const setApiKey = (k) => localStorage.setItem(API_KEY_STORE, k.trim());
const clearApiKey = () => localStorage.removeItem(API_KEY_STORE);

async function zerlege(text) {
  const key = getApiKey();
  if (!key) throw new Error("no-key");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system:
        "Du zerlegst eine Aufgabe in 3 bis 5 winzige, konkrete Schritte für ein ADHS-Gehirn. " +
        "Der ERSTE Schritt ist absichtlich lächerlich klein und sofort machbar (z. B. 'Ordner öffnen'). " +
        "Antworte AUSSCHLIESSLICH mit einem JSON-Array. Jedes Element: " +
        '{"text": "der Schritt", "min": Zahl}  (min = grobe Minutenschätzung). ' +
        "Kein Fließtext, keine Erklärung, kein Markdown — nur das JSON-Array.",
      messages: [{ role: "user", content: "Aufgabe: " + text }],
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = JSON.stringify((await res.json()).error || {}); } catch (e) {}
    throw new Error("http-" + res.status + (detail ? " " + detail : ""));
  }
  const data = await res.json();
  const out = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return parseSteps(out);
}

function parseSteps(s) {
  const m = s.match(/\[[\s\S]*\]/); // JSON-Array aus dem Text schneiden
  const arr = JSON.parse(m ? m[0] : s);
  if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
  return arr.slice(0, 6).map((x) => ({
    text: String(typeof x === "string" ? x : x.text || "").trim(),
    min: Number(x && x.min) || null,
    done: false,
  })).filter((x) => x.text);
}

function friendlyError(e) {
  const msg = String(e && e.message || e);
  if (msg === "no-key") return "Kein API-Key hinterlegt.";
  if (msg === "empty") return "Konnte die Aufgabe nicht zerlegen — versuch es nochmal.";
  if (msg.startsWith("http-401")) return "API-Key ungültig — unten über den Key-Link neu eintragen.";
  if (msg.startsWith("http-429")) return "Zu viele Anfragen — kurz warten und nochmal.";
  if (msg.startsWith("http-")) return "Fehler von der API (" + msg.slice(5, 8) + "). Nochmal versuchen.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Keine Verbindung zur API (Netz/CORS). Später nochmal.";
  return "Etwas ist schiefgelaufen. Nochmal versuchen.";
}

// Kleines Formular zum Eintragen/Ändern des API-Keys
function showKeyForm(retryId) {
  const wrap = document.createElement("div");
  wrap.className = "overlay keyform";
  const have = getApiKey();
  wrap.innerHTML = `
    <div class="keycard">
      <span class="eyebrow">Anthropic API-Key</span>
      <h3>„Zerleg das" braucht deinen Key</h3>
      <p>Wird <b>nur lokal in diesem Browser</b> gespeichert und direkt an Anthropic
      geschickt — nur für den Eigengebrauch. Key holen:
      <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a></p>
      <input id="keyInput" type="password" placeholder="sk-ant-…" value="${have ? "" : ""}" />
      <div class="keyactions">
        <button class="btn" id="keySave">Speichern</button>
        ${have ? '<button class="link" id="keyClear">Key löschen</button>' : ""}
        <button class="link" id="keyCancel">Abbrechen</button>
      </div>
    </div>`;
  document.body.append(wrap);
  const input = wrap.querySelector("#keyInput");
  input.focus();
  const close = () => wrap.remove();
  wrap.querySelector("#keyCancel").addEventListener("click", close);
  const clear = wrap.querySelector("#keyClear");
  if (clear) clear.addEventListener("click", () => { clearApiKey(); close(); });
  wrap.querySelector("#keySave").addEventListener("click", () => {
    const v = input.value.trim();
    if (!v) { input.focus(); return; }
    setApiKey(v);
    close();
    // direkt weitermachen, falls aus "Zerleg das" heraus geöffnet
    const it = retryId && items().find((x) => x.id === retryId);
    if (it) { const zb = $("#oneZerlege"); if (zb) zb.click(); }
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") wrap.querySelector("#keySave").click(); });
}

// Fußzeilen-Link zum Verwalten des Keys
const keyLink = document.getElementById("keyManage");
if (keyLink) keyLink.addEventListener("click", (e) => { e.preventDefault(); showKeyForm(null); });

/* ---------- Start ---------- */
refreshBadges();
renderOne();
cap.focus();
