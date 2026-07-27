import { createRoot } from 'react-dom/client';
import { html, React, useState, useEffect, Avatar } from './ui.js';
import { api, getToken, setToken } from './api.js';
import { connectSocket } from './socket.js';

import { Dashboard } from './views/dashboard.js';
import { Pinboard } from './views/pinboard.js';
import { Projects } from './views/projects.js';
import { Calendar } from './views/calendar.js';
import { Chat } from './views/chat.js';
import { Video } from './views/video.js';
import { Team } from './views/team.js';
import { Honorar } from './views/honorar.js';

const NAV = [
  { key: 'dashboard', label: 'Übersicht', section: 'Kanzlei' },
  { key: 'pinboard',  label: 'Pinnwand' },
  { key: 'projects',  label: 'Projekte' },
  { key: 'calendar',  label: 'Terminkalender' },
  { key: 'honorar',   label: 'Honorarnoten' },
  { key: 'chat',      label: 'Chat', section: 'Kommunikation' },
  { key: 'video',     label: 'Videokonferenz' },
  { key: 'team',      label: 'Team' },
];

const TITLES = {
  dashboard: 'Übersicht', pinboard: 'Pinnwand', projects: 'Projekte',
  calendar: 'Terminkalender', honorar: 'Honorarnoten', chat: 'Chat',
  video: 'Videokonferenz', team: 'Team',
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.config().then(setCfg).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { token, user } = await api.login(email.trim(), name.trim());
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return html`
    <div class="login">
      <div class="login__wordmark"><span>WESTTOR LEX</span></div>
      <div class="login__topbrand">
        <div class="name">WESTTOR LEX</div>
        <div class="sub">Rechtsanwalt GmbH · Wien</div>
      </div>
      <form class="login__card" onSubmit=${submit}>
        <img class="login__logo" src="/assets/logo.png" alt="WESTTOR LEX" />
        <h2>Interner Bereich</h2>
        <p class="lead">Zugang zum Kanzlei-Portal von WESTTOR LEX.</p>
        ${error ? html`<div class="login__error">${error}</div>` : null}
        <div class="field">
          <label>Kanzlei-E-Mail</label>
          <input type="email" required placeholder="vorname.nachname@westtorlex.com"
                 value=${email} onInput=${e => setEmail(e.target.value)} />
          ${cfg && !cfg.demoLogin ? html`<div class="login__hint">Nur Adressen @${cfg.firmDomains.join(', @')}</div>` : null}
        </div>
        <div class="field">
          <label>Name <span class="muted" style=${{ textTransform: 'none', letterSpacing: 0 }}>(bei erster Anmeldung)</span></label>
          <input type="text" placeholder="Dr. Vorname Nachname"
                 value=${name} onInput=${e => setName(e.target.value)} />
        </div>
        <button class="btn-primary" type="submit" disabled=${busy}>
          ${busy ? 'Anmelden …' : 'Anmelden'}
        </button>
        ${cfg && cfg.demoLogin
          ? html`<div class="login__demo">Demo-Modus aktiv · jede E-Mail wird akzeptiert.<br/>Für den Echtbetrieb auf Kanzlei-Domain beschränken.</div>`
          : null}
      </form>
    </div>`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
function Layout({ user, view, setView, onLogout }) {
  const grouped = [];
  let currentSection = null;
  for (const item of NAV) {
    if (item.section && item.section !== currentSection) {
      currentSection = item.section;
      grouped.push(html`<div class="nav__section" key=${'s-' + item.section}>${item.section}</div>`);
    }
    grouped.push(html`
      <button key=${item.key} class=${'nav__item' + (view === item.key ? ' active' : '')}
              onClick=${() => setView(item.key)}>
        <span>${item.label}</span>
      </button>`);
  }

  const View = { dashboard: Dashboard, pinboard: Pinboard, projects: Projects,
                 calendar: Calendar, honorar: Honorar, chat: Chat, video: Video, team: Team }[view];
  const flush = (view === 'chat');

  return html`
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar__brand">
          <div class="name">WESTTOR LEX</div>
          <div class="sub">Interner Bereich</div>
        </div>
        <nav class="nav">${grouped}</nav>
        <div class="sidebar__foot">
          <div class="sidebar__user">
            <${Avatar} user=${user} />
            <div>
              <div class="name">${user.name}</div>
              <div class="role">${user.role}</div>
            </div>
          </div>
          <button class="sidebar__logout" onClick=${onLogout}>Abmelden</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <h1>${TITLES[view]}</h1>
          <div class="topbar__meta">${new Date().toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
        <div class=${'content' + (flush ? ' content--flush' : '')}>
          <${View} user=${user} setView=${setView} />
        </div>
      </main>
    </div>`;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.me()
      .then(({ user }) => { setUser(user); connectSocket(); })
      .catch(() => setToken(''))
      .finally(() => setReady(true));
  }, []);

  function handleLogin(u) { setUser(u); connectSocket(); }
  async function handleLogout() {
    try { await api.logout(); } catch {}
    setToken(''); setUser(null); setView('dashboard');
  }

  if (!ready) return html`<div style=${{ minHeight: '100vh' }}></div>`;
  if (!user) return html`<${Login} onLogin=${handleLogin} />`;
  return html`<${Layout} user=${user} view=${view} setView=${setView} onLogout=${handleLogout} />`;
}

createRoot(document.getElementById('root')).render(html`<${App} />`);
