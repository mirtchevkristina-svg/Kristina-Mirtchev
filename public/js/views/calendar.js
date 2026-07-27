import { html, useState, useEffect, Modal, Spinner, fmtDateTime, fmtTime } from '../ui.js';
import { api } from '../api.js';
import { onEvent } from '../socket.js';

const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function EventModal({ date, event, projects, onClose, onSaved }) {
  const editing = !!event;
  const [title, setTitle] = useState(event ? event.title : '');
  const [description, setDescription] = useState(event ? event.description : '');
  const [start, setStart] = useState(event ? event.start.slice(0, 16) : (date ? date + 'T09:00' : ''));
  const [end, setEnd] = useState(event ? (event.end || event.start).slice(0, 16) : (date ? date + 'T10:00' : ''));
  const [projectId, setProjectId] = useState(event ? (event.projectId || '') : '');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !start) return;
    setBusy(true);
    try {
      const payload = { title: title.trim(), description: description.trim(), start, end: end || start, projectId: projectId || null };
      if (editing) await api.updateEvent(event.id, payload);
      else await api.createEvent(payload);
      onSaved(); onClose();
    } finally { setBusy(false); }
  }
  async function del() {
    if (confirm('Termin löschen?')) { await api.deleteEvent(event.id); onSaved(); onClose(); }
  }

  return html`
    <${Modal} title=${editing ? 'Termin' : 'Neuer Termin'} onClose=${onClose}
      footer=${html`
        ${editing ? html`<button class="btn btn--danger btn--sm" onClick=${del} style=${{ marginRight: 'auto' }}>Löschen</button>` : null}
        <button class="btn btn--ghost btn--sm" onClick=${onClose}>Abbrechen</button>
        <button class="btn btn--sm" onClick=${save} disabled=${busy}>${editing ? 'Speichern' : 'Eintragen'}</button>`}>
      <div class="form-row">
        <label>Titel</label>
        <input class="input" value=${title} onInput=${e => setTitle(e.target.value)} placeholder="Besprechung, Verhandlung, Frist …" autoFocus />
      </div>
      <div class="form-grid">
        <div class="form-row"><label>Beginn</label><input class="input" type="datetime-local" value=${start} onInput=${e => setStart(e.target.value)} /></div>
        <div class="form-row"><label>Ende</label><input class="input" type="datetime-local" value=${end} onInput=${e => setEnd(e.target.value)} /></div>
      </div>
      <div class="form-row">
        <label>Projekt (optional)</label>
        <select class="select" value=${projectId} onChange=${e => setProjectId(e.target.value)}>
          <option value="">— kein Projekt —</option>
          ${projects.map(p => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="form-row">
        <label>Notiz</label>
        <textarea class="textarea" value=${description} onInput=${e => setDescription(e.target.value)}></textarea>
      </div>
    <//>`;
}

export function Calendar({ user }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState(null);
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(null); // { date } oder { event }

  const load = () => api.events().then(d => setEvents(d.events)).catch(() => setEvents([]));
  useEffect(() => {
    load();
    api.projects().then(d => setProjects(d.projects)).catch(() => {});
    const off = onEvent('calendar:changed', load);
    return off;
  }, []);

  // Kalender-Raster (Montag-Start)
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first); gridStart.setDate(first.getDate() - startOffset);
  const cells = [];
  for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); cells.push(d); }

  const eventsByDay = {};
  (events || []).forEach(e => { const k = e.start.slice(0, 10); (eventsByDay[k] ||= []).push(e); });

  return html`
    <div>
      <div class="cal__head">
        <div class="cal__nav">
          <button class="btn btn--ghost btn--sm" onClick=${() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹ Zurück</button>
          <button class="btn btn--ghost btn--sm" onClick=${() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Heute</button>
          <button class="btn btn--ghost btn--sm" onClick=${() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Weiter ›</button>
        </div>
        <div class="cal__title">${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}</div>
        <button class="btn btn--sm" onClick=${() => setModal({ date: ymd(today) })}>Termin eintragen</button>
      </div>

      ${events === null ? html`<${Spinner} />` : html`
        <div class="cal__grid">
          ${DOW.map(d => html`<div class="cal__dow" key=${d}>${d}</div>`)}
          ${cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const dayEvents = eventsByDay[ymd(d)] || [];
            return html`
              <button class=${'cal__cell' + (inMonth ? '' : ' other') + (isToday ? ' today' : '')} key=${i}
                      onClick=${() => setModal({ date: ymd(d) })}>
                <span class="date">${d.getDate()}</span>
                ${dayEvents.slice(0, 3).map(e => html`
                  <span class=${'cal__event' + (e.projectId ? ' proj' : '')} key=${e.id}
                        onClick=${(ev) => { ev.stopPropagation(); setModal({ event: e }); }}
                        title=${e.title}>
                    ${e.allDay ? '' : fmtTime(e.start) + ' '}${e.title}
                  </span>`)}
                ${dayEvents.length > 3 ? html`<span class="meta small muted">+${dayEvents.length - 3} weitere</span>` : null}
              </button>`;
          })}
        </div>`}

      ${modal ? html`<${EventModal} date=${modal.date} event=${modal.event} projects=${projects}
                       onClose=${() => setModal(null)} onSaved=${load} />` : null}
    </div>`;
}
