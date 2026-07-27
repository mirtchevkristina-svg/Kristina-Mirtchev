import { html, useState, useEffect, Avatar, Spinner, Empty, fmtDateTime, fmtDate, timeAgo } from '../ui.js';
import { api } from '../api.js';
import { onEvent } from '../socket.js';

const POST_LABEL = { announcement: 'Announcement', frage: 'Frage', ereignis: 'Ereignis' };

export function Dashboard({ user, setView }) {
  const [data, setData] = useState(null);

  const load = () => api.overview().then(setData).catch(() => {});
  useEffect(() => {
    load();
    const offs = ['pinboard:changed', 'calendar:changed', 'projects:changed', 'team:changed']
      .map(ev => onEvent(ev, load));
    return () => offs.forEach(off => off());
  }, []);

  if (!data) return html`<${Spinner} />`;
  const { stats, upcoming, deadlines, latestPosts } = data;

  return html`
    <div>
      <div class="grid grid--stats" style=${{ marginBottom: '28px' }}>
        <div class="stat"><div class="num">${stats.members}</div><div class="lbl">Teammitglieder</div></div>
        <div class="stat"><div class="num">${stats.projects}</div><div class="lbl">Projekte</div></div>
        <div class="stat"><div class="num">${stats.events}</div><div class="lbl">Termine</div></div>
        <div class="stat"><div class="num">${stats.documents}</div><div class="lbl">Dokumente</div></div>
      </div>

      <div class="grid grid--2">
        <div>
          <div class="card" style=${{ marginBottom: '22px' }}>
            <div class="card__head">
              <h3>Nächste Termine</h3>
              <button class="card__link" onClick=${() => setView('calendar')}>Kalender</button>
            </div>
            <div class="card__body">
              ${upcoming.length === 0 ? html`<${Empty}>Keine anstehenden Termine.<//>` : html`
                <ul class="list">
                  ${upcoming.map(e => html`
                    <li key=${e.id}>
                      <div style=${{ flex: 1 }}>
                        <div style=${{ fontWeight: 500 }}>${e.title}</div>
                        <div class="meta">${fmtDateTime(e.start)}${e.creator ? ' · ' + e.creator.name : ''}</div>
                      </div>
                    </li>`)}
                </ul>`}
            </div>
          </div>

          <div class="card">
            <div class="card__head">
              <h3>Offene Fristen</h3>
              <button class="card__link" onClick=${() => setView('projects')}>Projekte</button>
            </div>
            <div class="card__body">
              ${deadlines.length === 0 ? html`<${Empty}>Keine offenen Fristen.<//>` : html`
                <ul class="list">
                  ${deadlines.map(d => html`
                    <li key=${d.id}>
                      <span class="tag tag--frist">Frist</span>
                      <div style=${{ flex: 1 }}>
                        <div style=${{ fontWeight: 500 }}>${d.title}</div>
                        <div class="meta">${d.dueDate ? 'fällig ' + fmtDate(d.dueDate) : ''}${d.project ? ' · ' + d.project.name : ''}</div>
                      </div>
                    </li>`)}
                </ul>`}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__head">
            <h3>Von der Pinnwand</h3>
            <button class="card__link" onClick=${() => setView('pinboard')}>Alle</button>
          </div>
          <div class="card__body">
            ${latestPosts.length === 0 ? html`<${Empty}>Noch keine Beiträge.<//>` : html`
              <ul class="list">
                ${latestPosts.map(p => html`
                  <li key=${p.id}>
                    <${Avatar} user=${p.author} size="sm" />
                    <div style=${{ flex: 1 }}>
                      <div class="small"><span style=${{ fontWeight: 600 }}>${p.author ? p.author.name : 'Unbekannt'}</span>
                        <span class="muted"> · ${POST_LABEL[p.type]} · ${timeAgo(p.createdAt)}</span></div>
                      ${p.title ? html`<div style=${{ fontWeight: 500, marginTop: '2px' }}>${p.title}</div>` : null}
                      <div class="muted small" style=${{ marginTop: '2px' }}>${(p.text || '').slice(0, 120)}${(p.text || '').length > 120 ? '…' : ''}</div>
                    </div>
                  </li>`)}
              </ul>`}
          </div>
        </div>
      </div>
    </div>`;
}
