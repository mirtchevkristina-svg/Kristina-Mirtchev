/* ================================================================
   Kolibri — ADHS App
   Gesamte Logik. Speichert alles lokal im Browser (localStorage).
   Keine Server, kein Login, keine Abhängigkeiten.
================================================================ */

// ---------- 1. Zustand laden / speichern ----------
const STORE_KEY = "kolibri_state_v1";

const defaultState = {
  dumps: [],      // { id, text }
  todos: [],      // { id, text, prio: 'jetzt'|'später', done }
  events: [],     // { id, title, date: 'YYYY-MM-DD', time: 'HH:MM' }
  focusId: null,  // id des aktuellen Fokus-Todos
  points: 0,
  streak: 0,
  lastDoneDate: null, // 'YYYY-MM-DD' für Streak-Berechnung
  theme: "light",
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch (e) {
    return structuredClone(defaultState);
  }
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// eindeutige ID (kein Math.random-Problem – Zeit + Zähler)
let _counter = 0;
function uid() {
  _counter += 1;
  return Date.now().toString(36) + "-" + _counter;
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const todayStr = () => new Date().toISOString().slice(0, 10);

// ---------- 2. Navigation zwischen Views ----------
$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("active"));
    $$(".view").forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    $("#view-" + tab.dataset.view).classList.add("active");
  });
});

// ---------- 3. Theme (hell/dunkel) ----------
function applyTheme() {
  document.body.classList.toggle("dark", state.theme === "dark");
  $("#themeBtn").textContent = state.theme === "dark" ? "☀️" : "🌙";
}
$("#themeBtn").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  save();
  applyTheme();
});

// ---------- 4. Punkte & Streak ----------
function addPoints(n) {
  state.points += n;
  // Streak: einmal pro Tag hochzählen, wenn heute etwas erledigt wurde
  const today = todayStr();
  if (state.lastDoneDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak = state.lastDoneDate === yesterday ? state.streak + 1 : 1;
    state.lastDoneDate = today;
  }
  save();
  renderScore();
}
function renderScore() {
  $("#points").textContent = state.points;
  $("#streak").textContent = "🔥 " + state.streak;
}

// ---------- 5. Brain Dump ----------
function addDump(text) {
  text = text.trim();
  if (!text) return;
  state.dumps.unshift({ id: uid(), text });
  save();
  renderDump();
}

$("#quickAdd").addEventListener("click", quickAdd);
$("#quickInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") quickAdd();
});
function quickAdd() {
  const input = $("#quickInput");
  addDump(input.value);
  input.value = "";
  input.focus();
}

function renderDump() {
  const list = $("#dumpList");
  list.innerHTML = "";
  $("#dumpEmpty").style.display = state.dumps.length ? "none" : "block";
  state.dumps.forEach((d) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = d.text;
    const actions = document.createElement("div");
    actions.className = "item-actions";

    const toTodo = mkBtn("→ To-Do", "item-btn", () => {
      state.todos.unshift({ id: uid(), text: d.text, prio: "später", done: false });
      state.dumps = state.dumps.filter((x) => x.id !== d.id);
      save(); renderDump(); renderTodos(); renderHeute();
    });
    const del = mkBtn("🗑", "item-btn del", () => {
      state.dumps = state.dumps.filter((x) => x.id !== d.id);
      save(); renderDump();
    });
    actions.append(toTodo, del);
    li.append(span, actions);
    list.append(li);
  });
}

// ---------- 6. To-Dos ----------
let todoFilter = "offen";

$("#todoAdd").addEventListener("click", addTodoFromInput);
$("#todoInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTodoFromInput();
});
function addTodoFromInput() {
  const input = $("#todoInput");
  const text = input.value.trim();
  if (!text) return;
  state.todos.unshift({ id: uid(), text, prio: $("#todoPrio").value, done: false });
  input.value = "";
  save();
  renderTodos();
  renderHeute();
}

$$(".filters .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $$(".filters .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    todoFilter = chip.dataset.filter;
    renderTodos();
  });
});

function toggleTodo(id) {
  const t = state.todos.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  if (t.done) {
    addPoints(10);
    celebrate();
    if (state.focusId === id) state.focusId = null;
  }
  save();
  renderTodos();
  renderHeute();
}

function renderTodos() {
  const list = $("#todoList");
  list.innerHTML = "";
  let items = state.todos;
  if (todoFilter === "offen") items = items.filter((t) => !t.done);
  if (todoFilter === "erledigt") items = items.filter((t) => t.done);

  $("#todoEmpty").style.display = items.length ? "none" : "block";

  items.forEach((t) => {
    const li = document.createElement("li");
    if (t.done) li.classList.add("done");

    const check = document.createElement("button");
    check.className = "todo-check" + (t.done ? " checked" : "");
    check.textContent = t.done ? "✓" : "";
    check.title = "Erledigt markieren";
    check.addEventListener("click", () => toggleTodo(t.id));

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = t.text;

    const badge = document.createElement("span");
    badge.className = "badge " + (t.prio === "jetzt" ? "jetzt" : "");
    badge.textContent = t.prio === "jetzt" ? "⚡ Jetzt" : "🌱 Später";

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const focusBtn = mkBtn("🎯", "item-btn", () => {
      state.focusId = t.id;
      save(); renderHeute();
      // zur Heute-Ansicht springen
      $$(".tab").forEach((x) => x.classList.remove("active"));
      $$(".view").forEach((v) => v.classList.remove("active"));
      document.querySelector('.tab[data-view="heute"]').classList.add("active");
      $("#view-heute").classList.add("active");
    });
    focusBtn.title = "Als Fokus wählen";
    const del = mkBtn("🗑", "item-btn del", () => {
      state.todos = state.todos.filter((x) => x.id !== t.id);
      if (state.focusId === t.id) state.focusId = null;
      save(); renderTodos(); renderHeute();
    });
    actions.append(focusBtn, del);

    li.append(check, span, badge, actions);
    list.append(li);
  });
}

// ---------- 7. Kalender ----------
$("#evtAdd").addEventListener("click", () => {
  const title = $("#evtTitle").value.trim();
  const date = $("#evtDate").value;
  const time = $("#evtTime").value;
  if (!title || !date) {
    alert("Bitte mindestens einen Titel und ein Datum eingeben. 🙂");
    return;
  }
  state.events.push({ id: uid(), title, date, time: time || "" });
  $("#evtTitle").value = "";
  $("#evtTime").value = "";
  save();
  renderCalendar();
  renderHeute();
});

function sortedEvents() {
  return [...state.events].sort((a, b) => {
    const A = a.date + "T" + (a.time || "00:00");
    const B = b.date + "T" + (b.time || "00:00");
    return A.localeCompare(B);
  });
}

function fmtDate(d) {
  const date = new Date(d + "T00:00");
  return date.toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function renderCalendar() {
  const wrap = $("#calList");
  wrap.innerHTML = "";
  const evts = sortedEvents();
  $("#calEmpty").style.display = evts.length ? "none" : "block";

  // nach Tag gruppieren
  const byDay = {};
  evts.forEach((e) => (byDay[e.date] = byDay[e.date] || []).push(e));

  Object.keys(byDay).sort().forEach((day) => {
    const dayDiv = document.createElement("div");
    dayDiv.className = "cal-day";
    const h = document.createElement("h4");
    h.textContent = fmtDate(day) + (day === todayStr() ? "  ·  Heute" : "");
    dayDiv.append(h);

    byDay[day].forEach((e) => {
      const row = document.createElement("div");
      row.className = "cal-evt";
      const left = document.createElement("div");
      left.innerHTML = `<span class="cal-time">${e.time || "—"}</span> &nbsp; ${escapeHtml(e.title)}`;
      const del = mkBtn("🗑", "item-btn del", () => {
        state.events = state.events.filter((x) => x.id !== e.id);
        save(); renderCalendar(); renderHeute();
      });
      row.append(left, del);
      dayDiv.append(row);
    });
    wrap.append(dayDiv);
  });
}

// ---------- 8. Heute / Dashboard ----------
function renderHeute() {
  // Fokus-Karte
  const focus = state.todos.find((t) => t.id === state.focusId && !t.done);
  if (!focus) {
    // automatisch die erste "jetzt"-Aufgabe vorschlagen
    const auto = state.todos.find((t) => !t.done && t.prio === "jetzt")
      || state.todos.find((t) => !t.done);
    state.focusId = auto ? auto.id : null;
  }
  const cur = state.todos.find((t) => t.id === state.focusId && !t.done);
  $("#focusTitle").textContent = cur ? cur.text : "Noch nichts ausgewählt 🌱";

  // "Als Nächstes"-Liste (offene Todos, max 5, ohne aktuellen Fokus)
  const nextList = $("#nextList");
  nextList.innerHTML = "";
  const open = state.todos.filter((t) => !t.done && t.id !== state.focusId).slice(0, 5);
  if (!open.length) {
    nextList.innerHTML = '<li style="color:var(--text-soft)">Nichts offen. 🎉</li>';
  } else {
    open.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = (t.prio === "jetzt" ? "⚡ " : "🌱 ") + t.text;
      nextList.append(li);
    });
  }

  // heutige Termine
  const evList = $("#todayEvents");
  evList.innerHTML = "";
  const today = todayStr();
  const todays = sortedEvents().filter((e) => e.date === today);
  if (!todays.length) {
    evList.innerHTML = '<li style="color:var(--text-soft)">Keine Termine heute. 🌤️</li>';
  } else {
    todays.forEach((e) => {
      const li = document.createElement("li");
      li.textContent = (e.time ? e.time + " · " : "") + e.title;
      evList.append(li);
    });
  }
}

$("#focusDone").addEventListener("click", () => {
  if (state.focusId) toggleTodo(state.focusId);
});
$("#focusSkip").addEventListener("click", () => {
  // nächste offene Aufgabe als Fokus wählen
  const open = state.todos.filter((t) => !t.done);
  if (open.length < 2) return;
  const idx = open.findIndex((t) => t.id === state.focusId);
  const next = open[(idx + 1) % open.length];
  state.focusId = next.id;
  save();
  renderHeute();
});

// ---------- 9. Fokus-Timer (Pomodoro) ----------
let timerTotal = 25 * 60;
let timerLeft = timerTotal;
let timerInt = null;

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return m + ":" + sec;
}
function renderTimer() {
  $("#timerDisplay").textContent = fmtTime(timerLeft);
  const cur = state.todos.find((t) => t.id === state.focusId && !t.done);
  $("#timerTask").textContent = cur ? "🎯 " + cur.text : "Wähle eine Aufgabe zum Fokussieren";
}
$("#timerStart").addEventListener("click", () => {
  if (timerInt) return;
  $("#timerDisplay").classList.add("running");
  timerInt = setInterval(() => {
    timerLeft -= 1;
    if (timerLeft <= 0) {
      clearInterval(timerInt);
      timerInt = null;
      timerLeft = 0;
      renderTimer();
      $("#timerDisplay").classList.remove("running");
      addPoints(15);
      celebrate();
      $("#timerHint").textContent = "🎉 Geschafft! Gönn dir eine Pause.";
      try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play(); } catch (e) {}
      return;
    }
    renderTimer();
  }, 1000);
});
$("#timerPause").addEventListener("click", () => {
  clearInterval(timerInt);
  timerInt = null;
  $("#timerDisplay").classList.remove("running");
});
$("#timerReset").addEventListener("click", () => {
  clearInterval(timerInt);
  timerInt = null;
  timerLeft = timerTotal;
  $("#timerDisplay").classList.remove("running");
  renderTimer();
});
$$(".timer-presets .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    clearInterval(timerInt);
    timerInt = null;
    timerTotal = parseInt(chip.dataset.min, 10) * 60;
    timerLeft = timerTotal;
    $("#timerDisplay").classList.remove("running");
    $("#timerHint").textContent = "Tipp: 25 Min konzentriert, dann 5 Min Pause. 🍅";
    renderTimer();
  });
});

// ---------- 10. Hilfsfunktionen ----------
function mkBtn(label, cls, onClick) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Konfetti bei Erfolg 🎉
function celebrate() {
  const layer = $("#confetti");
  const colors = ["#6c8cff", "#ffb454", "#4cc38a", "#f06a6a", "#a685ff"];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = (5 + i * 2.4) + "%";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = (1.5 + (i % 5) * 0.3) + "s";
    piece.style.animationDelay = (i % 7) * 0.05 + "s";
    layer.append(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

// ---------- 11. Start ----------
function init() {
  applyTheme();
  renderScore();
  renderDump();
  renderTodos();
  renderCalendar();
  renderHeute();
  renderTimer();
  // Datumsfeld standardmäßig auf heute
  $("#evtDate").value = todayStr();
  $("#quickInput").focus();
}
init();
