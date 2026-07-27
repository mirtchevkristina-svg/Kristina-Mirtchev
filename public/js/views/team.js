import { html, useState, useEffect, Avatar, Spinner } from '../ui.js';
import { api } from '../api.js';
import { onEvent, getSocket } from '../socket.js';

export function Team({ user, setView }) {
  const [users, setUsers] = useState(null);
  const [online, setOnline] = useState([]);

  const load = () => api.users().then(d => setUsers(d.users)).catch(() => setUsers([]));
  useEffect(() => {
    load();
    getSocket(); // stellt sicher, dass Präsenz-Events kommen
    const offTeam = onEvent('team:changed', load);
    const offPres = onEvent('presence', (d) => setOnline(d.online || []));
    return () => { offTeam(); offPres(); };
  }, []);

  function message(u) {
    sessionStorage.setItem('openDm', u.id);
    setView('chat');
  }

  if (!users) return html`<${Spinner} />`;

  return html`
    <div style=${{ maxWidth: '720px' }}>
      <p class="muted" style=${{ marginBottom: '20px' }}>
        Alle Mitglieder, die sich mit ihrer Kanzlei-E-Mail-Adresse angemeldet haben, sind automatisch Teil des internen Teams.
      </p>
      <div class="card">
        <div class="card__body" style=${{ padding: '6px 24px' }}>
          <ul class="list">
            ${users.map(u => {
              const isOnline = online.includes(u.id);
              return html`
                <li key=${u.id} style=${{ alignItems: 'center' }}>
                  <${Avatar} user=${u} size="lg" />
                  <div style=${{ flex: 1 }}>
                    <div class="row" style=${{ gap: '10px' }}>
                      <span style=${{ fontWeight: 500, fontSize: '15px' }}>${u.name}</span>
                      ${u.id === user.id ? html`<span class="tag">Sie</span>` : null}
                      <span class="tag">${u.role}</span>
                    </div>
                    <div class="meta">${u.email}</div>
                  </div>
                  <div class="row" style=${{ gap: '14px' }}>
                    <span class="row small muted" style=${{ gap: '6px' }}>
                      <span class=${'presence-dot' + (isOnline ? '' : ' presence-dot--off')}></span>
                      ${isOnline ? 'Online' : 'Offline'}
                    </span>
                    ${u.id !== user.id ? html`<button class="btn btn--ghost btn--sm" onClick=${() => message(u)}>Nachricht</button>` : null}
                  </div>
                </li>`;
            })}
          </ul>
        </div>
      </div>
    </div>`;
}
