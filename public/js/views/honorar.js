import { html, useState, useEffect, Spinner, Empty, fmtDate } from '../ui.js';
import { api } from '../api.js';

// ---- Formatierungshelfer ---------------------------------------------------
export function eur(n) {
  return 'EUR ' + Number(n || 0).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h && !m) return '—';
  return `${h ? h + 'Std' : ''}${m ? (h ? ' ' : '') + m + ' Min' : ''}`.trim();
}
function amountOf(p, rate) {
  const h = Number(p.hours) || 0, m = Number(p.minutes) || 0;
  return Math.round((h + m / 60) * Number(rate) * 100) / 100;
}

const EMPTY_POS = () => ({ leistung: '', mitarbeiter: '', hours: '', minutes: '' });

// ===========================================================================
// Druckbare Vorschau – exakt nach Kanzlei-Vorlage
// ===========================================================================
function Preview({ note, onBack }) {
  const rate = note.rate;
  return html`
    <div>
      <div class="row between honorar-toolbar" style=${{ marginBottom: '18px' }}>
        <button class="proj-detail__back" onClick=${onBack}>← Zurück</button>
        <button class="btn btn--sm" onClick=${() => window.print()}>Drucken / Als PDF speichern</button>
      </div>

      <div class="honorar-doc" id="honorar-print">
        <div class="hd__top">
          <img class="hd__logo" src="/assets/logo.png" alt="WESTTOR LEX" />
          <div class="hd__firm">
            <div class="hd__firm-name">${note.firm.name}</div>
            <div>${note.firm.subtitle}</div>
            <div>${note.firm.address}</div>
            <div>${note.firm.register}</div>
          </div>
        </div>

        <div class="hd__date">${fmtDate(note.date)}</div>

        <div class="hd__client">
          <div style=${{ fontWeight: 600 }}>${note.clientName}</div>
          ${(note.clientAddress || '').split('\n').map((l, i) => html`<div key=${i}>${l}</div>`)}
        </div>

        <div class="hd__title">HONORARNOTE N°${note.number}</div>

        <p class="hd__intro">
          Für die anwaltliche Vertretung der ${note.clientName} ${note.matter} wird folgendes Honorar nach Zeitaufwand verzeichnet:
        </p>

        <div class="hd__akt">
          <span>Aktenzeichen:</span><span>${note.aktenzeichen || '—'}</span>
        </div>

        <p style=${{ margin: '14px 0 2px' }}>An Honorar wird verzeichnet:</p>
        <p style=${{ margin: '0 0 14px', fontWeight: 600 }}>Zeithonorar (Stundensatz ${eur(rate)} netto)</p>

        <table class="hd__table">
          <thead>
            <tr>
              <th style=${{ width: '54%' }}>Leistung</th>
              <th style=${{ width: '12%' }}>Mitarbeiter</th>
              <th style=${{ width: '18%' }}>Zeitaufwand</th>
              <th style=${{ width: '16%', textAlign: 'right' }}>Betrag netto</th>
            </tr>
          </thead>
          <tbody>
            ${note.positions.map((p, i) => html`
              <tr key=${i}>
                <td>${p.leistung}</td>
                <td>${p.mitarbeiter}</td>
                <td>${fmtDuration((Number(p.hours) || 0) * 60 + (Number(p.minutes) || 0))}</td>
                <td style=${{ textAlign: 'right' }}>${eur(p.amount)}</td>
              </tr>`)}
          </tbody>
        </table>

        <div class="hd__totals">
          <div class="row between"><span>Honorar netto (${fmtDuration(note.totalMinutes)})</span><span>${eur(note.net)}</span></div>
          <div class="row between"><span>20% USt.</span><span>${eur(note.vat)}</span></div>
          <div class="row between hd__gesamt"><span>GESAMT:</span><span>${eur(note.gross)}</span></div>
        </div>

        <div class="hd__bank">
          <p style=${{ marginBottom: '6px' }}>Bitte überweisen Sie den Betrag auf folgendes Konto:</p>
          <div>Kontoinhaber: ${note.bank.holder}</div>
          <div>IBAN: ${note.bank.iban}</div>
          <div>BIC: ${note.bank.bic}</div>
          <div>Bank: ${note.bank.bank}</div>
        </div>

        <div class="hd__sign">${note.signature}</div>
      </div>
    </div>`;
}

// ===========================================================================
// Editor
// ===========================================================================
function Editor({ settings, onSaved, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [number, setNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [matter, setMatter] = useState('');
  const [aktenzeichen, setAktenzeichen] = useState('');
  const [rate, setRate] = useState(settings.defaultRate || 350);
  const [positions, setPositions] = useState([EMPTY_POS()]);
  const [busy, setBusy] = useState(false);

  function setPos(i, key, val) { setPositions(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: val } : p)); }
  function addPos() { setPositions(ps => [...ps, EMPTY_POS()]); }
  function delPos(i) { setPositions(ps => ps.filter((_, idx) => idx !== i)); }

  const net = positions.reduce((s, p) => s + amountOf(p, rate), 0);
  const vat = net * 0.2;
  const totalMin = positions.reduce((s, p) => s + (Number(p.hours) || 0) * 60 + (Number(p.minutes) || 0), 0);

  async function save() {
    if (!clientName.trim()) { alert('Bitte den Namen des Mandanten angeben.'); return; }
    setBusy(true);
    try {
      const { honorarnote } = await api.createHonorarnote({
        date, number: number ? Number(number) : undefined,
        clientName: clientName.trim(), clientAddress: clientAddress.trim(),
        matter: matter.trim(), aktenzeichen: aktenzeichen.trim(), rate: Number(rate),
        positions: positions.filter(p => p.leistung.trim()),
      });
      onSaved(honorarnote);
    } catch (e) { alert('Fehler: ' + e.message); }
    finally { setBusy(false); }
  }

  return html`
    <div style=${{ maxWidth: '860px' }}>
      <button class="proj-detail__back" onClick=${onCancel}>← Zurück zur Übersicht</button>
      <div class="card">
        <div class="card__head"><h3>Neue Honorarnote</h3></div>
        <div class="card__body">
          <div class="form-grid">
            <div class="form-row"><label>Datum</label><input class="input" type="date" value=${date} onInput=${e => setDate(e.target.value)} /></div>
            <div class="form-row"><label>Nummer (leer = automatisch)</label><input class="input" type="number" placeholder="automatisch" value=${number} onInput=${e => setNumber(e.target.value)} /></div>
          </div>
          <div class="form-row"><label>Mandant / Mandantin</label><input class="input" value=${clientName} onInput=${e => setClientName(e.target.value)} placeholder="z. B. Muster GmbH" /></div>
          <div class="form-row"><label>Anschrift des Mandanten</label><textarea class="textarea" style=${{ minHeight: '70px' }} value=${clientAddress} onInput=${e => setClientAddress(e.target.value)} placeholder=${'Handelskai 348\n1020 Wien'}></textarea></div>
          <div class="form-row">
            <label>Angelegenheit (wird in den Einleitungssatz eingesetzt)</label>
            <textarea class="textarea" value=${matter} onInput=${e => setMatter(e.target.value)}
              placeholder="in der medienrechtlichen Angelegenheit betreffend …"></textarea>
            <div class="muted small" style=${{ marginTop: '6px' }}>Vorschau: „Für die anwaltliche Vertretung der ${clientName || '[Mandant]'} ${matter || '…'} wird folgendes Honorar nach Zeitaufwand verzeichnet."</div>
          </div>
          <div class="form-grid">
            <div class="form-row"><label>Aktenzeichen</label><input class="input" value=${aktenzeichen} onInput=${e => setAktenzeichen(e.target.value)} placeholder="z. B. DDSG-1/26" /></div>
            <div class="form-row"><label>Stundensatz (netto, EUR)</label><input class="input" type="number" value=${rate} onInput=${e => setRate(e.target.value)} /></div>
          </div>

          <div class="eyebrow" style=${{ margin: '18px 0 10px' }}>Leistungen</div>
          ${positions.map((p, i) => html`
            <div class="honorar-pos" key=${i}>
              <div style=${{ flex: 1 }}>
                <textarea class="textarea" style=${{ minHeight: '58px' }} placeholder="Beschreibung der Leistung"
                  value=${p.leistung} onInput=${e => setPos(i, 'leistung', e.target.value)}></textarea>
              </div>
              <div class="honorar-pos__meta">
                <input class="input" style=${{ width: '70px' }} placeholder="MA" value=${p.mitarbeiter} onInput=${e => setPos(i, 'mitarbeiter', e.target.value)} />
                <input class="input" style=${{ width: '64px' }} type="number" placeholder="Std" value=${p.hours} onInput=${e => setPos(i, 'hours', e.target.value)} />
                <input class="input" style=${{ width: '64px' }} type="number" placeholder="Min" value=${p.minutes} onInput=${e => setPos(i, 'minutes', e.target.value)} />
                <span class="honorar-pos__amount">${eur(amountOf(p, rate))}</span>
                <button class="btn--text" onClick=${() => delPos(i)} title="Zeile entfernen">✕</button>
              </div>
            </div>`)}
          <button class="btn btn--ghost btn--sm" onClick=${addPos} style=${{ marginTop: '6px' }}>+ Leistung hinzufügen</button>

          <div class="hd__totals" style=${{ marginTop: '22px' }}>
            <div class="row between"><span>Honorar netto (${fmtDuration(totalMin)})</span><span>${eur(net)}</span></div>
            <div class="row between"><span>20% USt.</span><span>${eur(vat)}</span></div>
            <div class="row between hd__gesamt"><span>GESAMT:</span><span>${eur(net + vat)}</span></div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost btn--sm" onClick=${onCancel}>Abbrechen</button>
          <button class="btn btn--sm" onClick=${save} disabled=${busy}>${busy ? 'Wird erstellt …' : 'Honorarnote erstellen'}</button>
        </div>
      </div>
    </div>`;
}

// ===========================================================================
// Hauptansicht
// ===========================================================================
export function Honorar({ user }) {
  const [settings, setSettings] = useState(null);
  const [list, setList] = useState(null);
  const [mode, setMode] = useState('list'); // list | editor | preview
  const [current, setCurrent] = useState(null);

  const load = () => api.honorarnotes().then(d => setList(d.honorarnotes)).catch(() => setList([]));
  useEffect(() => {
    api.settings().then(d => setSettings(d.settings)).catch(() => setSettings({}));
    load();
  }, []);

  async function openNote(id) {
    const { honorarnote } = await api.honorarnote(id);
    setCurrent(honorarnote); setMode('preview');
  }
  async function del(id, e) {
    e.stopPropagation();
    if (confirm('Honorarnote löschen?')) { await api.deleteHonorarnote(id); load(); }
  }

  if (!settings || list === null) return html`<${Spinner} />`;

  if (mode === 'editor')
    return html`<${Editor} settings=${settings} onCancel=${() => setMode('list')}
      onSaved=${(hn) => { setCurrent(hn); setMode('preview'); load(); }} />`;

  if (mode === 'preview' && current)
    return html`<${Preview} note=${current} onBack=${() => setMode('list')} />`;

  return html`
    <div style=${{ maxWidth: '860px' }}>
      <div class="section-head">
        <p class="muted" style=${{ maxWidth: '540px' }}>Honorarnoten im Kanzlei-Layout erstellen, speichern und als PDF ausgeben. Stammdaten und Bankverbindung sind aus der Kanzlei-Vorlage übernommen.</p>
        <button class="btn" onClick=${() => setMode('editor')}>Neue Honorarnote</button>
      </div>
      ${list.length === 0 ? html`<div class="card"><div class="card__body"><${Empty}>Noch keine Honorarnoten erstellt.<//></div></div>` : html`
        <div class="card">
          <div class="card__body" style=${{ padding: '6px 24px' }}>
            <ul class="list">
              ${list.map(h => html`
                <li key=${h.id} style=${{ cursor: 'pointer', alignItems: 'center' }} onClick=${() => openNote(h.id)}>
                  <div style=${{ flex: 1 }}>
                    <div style=${{ fontWeight: 500 }}>N°${h.number} · ${h.clientName || 'Ohne Mandant'}</div>
                    <div class="meta">${fmtDate(h.date)}${h.aktenzeichen ? ' · ' + h.aktenzeichen : ''} · erstellt von ${h.creator ? h.creator.name : '—'}</div>
                  </div>
                  <div style=${{ fontWeight: 500, marginRight: '16px' }}>${eur(h.gross)}</div>
                  <button class="btn--text" onClick=${(e) => del(h.id, e)}>Löschen</button>
                </li>`)}
            </ul>
          </div>
        </div>`}
    </div>`;
}
