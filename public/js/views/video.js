import { html, useState, useEffect, useRef } from '../ui.js';

// Videokonferenz über Jitsi Meet (Einbettung, kein eigener Server nötig).
// Hinweis: meet.jit.si ist ein öffentlicher Dienst. Für vertrauliche Mandate
// empfiehlt sich eine selbst gehostete Jitsi-Instanz (siehe KONZEPT.md).
const JITSI_DOMAIN = 'meet.jit.si';
const ROOM_PREFIX = 'WesttorLexKanzlei-';
const SUGGESTED = ['Besprechungsraum', 'Verhandlungsvorbereitung', 'Mandantengespräch', 'Teammeeting'];

let scriptPromise = null;
function loadJitsi() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://${JITSI_DOMAIN}/external_api.js`;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Jitsi konnte nicht geladen werden'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function Video({ user }) {
  const [room, setRoom] = useState('');
  const [active, setActive] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setError('');
    loadJitsi().then(() => {
      if (cancelled || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: ROOM_PREFIX + active.replace(/[^a-zA-Z0-9]/g, ''),
        parentNode: containerRef.current,
        width: '100%', height: '100%',
        userInfo: { displayName: user.name, email: user.email },
        configOverwrite: { prejoinPageEnabled: true, disableDeepLinking: true },
        interfaceConfigOverwrite: { DEFAULT_BACKGROUND: '#0a1f3c', TOOLBAR_ALWAYS_VISIBLE: false },
      });
    }).catch(err => setError(err.message));
    return () => {
      cancelled = true;
      if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
    };
  }, [active]);

  function join(name) {
    const r = (name || room).trim();
    if (!r) return;
    setActive(r);
  }
  function leave() { setActive(''); setRoom(''); }

  if (active) {
    return html`
      <div>
        <div class="row between" style=${{ marginBottom: '16px' }}>
          <div>
            <div class="eyebrow">Laufende Konferenz</div>
            <h2 style=${{ fontSize: '24px' }}>${active}</h2>
          </div>
          <button class="btn btn--danger btn--sm" onClick=${leave}>Konferenz verlassen</button>
        </div>
        <div class="video__stage">
          ${error ? html`<div class="video__placeholder"><h2>Verbindung fehlgeschlagen</h2><p>${error}</p></div>`
            : html`<div ref=${containerRef} class="video__frame"></div>`}
        </div>
      </div>`;
  }

  return html`
    <div class="video__stage">
      <div class="video__placeholder">
        <div class="eyebrow" style=${{ color: 'rgba(255,255,255,.5)' }}>WESTTOR LEX · Video</div>
        <h2>Videokonferenz</h2>
        <p>Starten Sie eine verschlüsselte Videobesprechung oder treten Sie einem bestehenden Raum bei. Teilen Sie den Raumnamen mit Ihren Kolleginnen und Kollegen.</p>
        <div class="row" style=${{ gap: '10px', marginBottom: '18px' }}>
          <input class="input" style=${{ width: '280px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)', color: '#fff' }}
                 placeholder="Raumname eingeben …" value=${room}
                 onInput=${e => setRoom(e.target.value)}
                 onKeyDown=${e => { if (e.key === 'Enter') join(); }} />
          <button class="btn" onClick=${() => join()}>Beitreten</button>
        </div>
        <div class="video__rooms">
          ${SUGGESTED.map(r => html`<button class="video__room" key=${r} onClick=${() => join(r)}>${r}</button>`)}
        </div>
      </div>
    </div>`;
}
