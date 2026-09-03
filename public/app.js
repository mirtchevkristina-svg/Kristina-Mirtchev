'use strict';
/* SUBSUMO - Frontend.
   Bewusst ohne Framework und ohne Build-Schritt: auf Replit läuft das Projekt
   damit sofort, und bei einem Zweipersonenteam ist das der Unterschied zwischen
   liefern und nicht liefern (Kapitel 6). */

const app  = document.getElementById('app');
const navi = document.getElementById('nav');
const kontextEl = document.getElementById('kontext');

const S = { config: null, ich: null, lauf: null, session: null };

// ---------------------------------------------------------------- Werkzeuge
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const euro = (cents) => (cents / 100).toLocaleString('de-AT',
  { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 });

async function api(pfad, daten, methode) {
  const opt = { headers: {}, credentials: 'same-origin' };
  if (daten !== undefined) {
    opt.method = methode || 'POST';
    opt.headers['content-type'] = 'application/json';
    opt.body = JSON.stringify(daten);
  } else if (methode) opt.method = methode;
  const r = await fetch(pfad, opt);
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = { error: 'antwort_unlesbar' }; }
  if (!r.ok) throw Object.assign(new Error(body.error || 'fehler'), { status: r.status, body });
  return body;
}

const zeige = (html) => { app.innerHTML = html; window.scrollTo(0, 0); };
const laden = () => zeige('<div class="lade">Einen Moment&hellip;</div>');

function warnbanner(w) {
  return w ? `<div class="warnbanner"><b>Hinweis zum Inhalt.</b> ${esc(w.text)}</div>` : '';
}

function fehlerAnzeigen(e) {
  const text = e.body?.hinweis || {
    anmeldung_erforderlich: 'Dafür musst du angemeldet sein.',
    zahlung_erforderlich: 'Dieser Teil gehört zum Prüfungspass.',
    offline: 'Keine Verbindung. Was du bereits geladen hast, bleibt nutzbar.'
  }[e.body?.error] || 'Da ist etwas schiefgegangen.';
  zeige(`<div class="karte"><h2>${esc(text)}</h2>
    <button class="knopf sekundaer" onclick="location.hash='#/'">Zur Startseite</button></div>`);
}

function tageBis(datum) {
  return Math.max(0, Math.ceil((new Date(datum) - new Date()) / 86400000));
}

/** Sehr kleiner Markdown-Teilsatz: Überschriften, Listen, Tabellen, fett. */
function md(text) {
  const zeilen = String(text).split('\n');
  let out = '', inListe = false, inTabelle = false;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                              .replace(/`(.+?)`/g, '<code>$1</code>');
  for (const z of zeilen) {
    const t = z.trim();
    if (/^\|/.test(t)) {
      const zellen = t.split('|').slice(1, -1).map((c) => c.trim());
      if (/^[-: ]+$/.test(zellen.join(''))) continue;
      if (!inTabelle) { out += '<table>'; inTabelle = true; out += '<tr>' + zellen.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr>'; continue; }
      out += '<tr>' + zellen.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
      continue;
    }
    if (inTabelle) { out += '</table>'; inTabelle = false; }
    if (/^[-*] /.test(t)) { if (!inListe) { out += '<ul>'; inListe = true; } out += `<li>${inline(t.slice(2))}</li>`; continue; }
    if (/^\d+\. /.test(t)) { if (!inListe) { out += '<ol>'; inListe = true; } out += `<li>${inline(t.replace(/^\d+\. /, ''))}</li>`; continue; }
    if (inListe) { out += out.includes('<ol>') && !out.includes('</ol>') ? '</ol>' : '</ul>'; inListe = false; }
    if (/^## /.test(t)) { out += `<h2>${inline(t.slice(3))}</h2>`; continue; }
    if (/^# /.test(t))  { out += `<h2>${inline(t.slice(2))}</h2>`; continue; }
    if (t) out += `<p>${inline(t)}</p>`;
  }
  if (inListe) out += '</ul>';
  if (inTabelle) out += '</table>';
  return out;
}

// ---------------------------------------------------------------- Ansichten

async function ansichtStart() {
  laden();
  const nächster = S.config.termine.find((t) => new Date(t.date) > new Date()) || S.config.termine[0];
  const tage = tageBis(nächster.date);
  const angemeldet = S.ich?.angemeldet;

  zeige(`
    ${warnbanner(S.config.warnung)}
    <h1>Du weißt nicht, wo du stehst.<br>Finde es in sechs Minuten heraus.</h1>
    <p>25 Fragen quer durch die StEOP. Kein Konto, keine Zahlung, kein Newsletter-Zwang.
       Am Ende siehst du dein Fachprofil und wo dein größter Hebel liegt.</p>

    <div class="karte">
      <div class="countdown">
        <span class="tage zahl">${tage}</span>
        <span class="label">Tage bis<br>${esc(nächster.label)}</span>
      </div>
      <button class="knopf" id="start">Diagnostic starten</button>
      <p class="hinweis" style="margin-top:12px">Dauer etwa sechs Minuten. Du kannst jederzeit abbrechen,
         dein Zwischenstand bleibt auf diesem Gerät erhalten.</p>
    </div>

    ${angemeldet ? `<button class="knopf sekundaer" onclick="location.hash='#/plan'">Weiter zu deinem Tagesplan</button>`
                 : `<button class="knopf leise" onclick="location.hash='#/konto'">Ich habe schon ein Konto</button>`}

    <h2>Was hier anders ist</h2>
    <div class="karte flach">
      <p><strong>Das System entscheidet, nicht du.</strong> Aus Prüftermin, deinen verfügbaren
         Minuten und deinem Fehlerprofil entsteht ein Tagesplan. Du öffnest die App und fängst an.</p>
      <p><strong>Jede Session passt in eine U-Bahn-Fahrt.</strong> Nichts dauert länger als zwölf Minuten.</p>
      <p><strong>Jedes Lernobjekt trägt seinen Freigabestatus.</strong> Du siehst an jeder Frage,
         ob sie juristisch geprueft wurde und von wem.</p>
    </div>
    <p class="hinweis">Kein Abo. Einmalzahlung mit Zugang bis zu deinem Prüftermin.
       ${S.config.bestand.fragen} Fragen im Bestand, davon ${S.config.bestand.gepruefteFragen} freigegeben.</p>
  `);

  document.getElementById('start').onclick = async () => {
    try {
      S.lauf = await api('/api/diagnostic/start', { examId: nächster.id });
      S.lauf.index = 0; S.lauf.begonnen = Date.now();
      location.hash = '#/diagnostic';
    } catch (e) { fehlerAnzeigen(e); }
  };
}

// ------------------------------------------------- Diagnostic (Wischkarten)
function ansichtDiagnostic() {
  if (!S.lauf) return (location.hash = '#/');
  const { fragen } = S.lauf;
  const i = S.lauf.index;
  if (i >= fragen.length) return diagnosticAbschliessen();

  const f = fragen[i];
  const istTF = f.type === 'tf';

  zeige(`
    <div class="sessionkopf">
      <div class="balken"><i style="width:${(i / fragen.length) * 100}%"></i></div>
      <span class="zaehler">${i + 1}/${fragen.length}</span>
    </div>
    <div class="stapel">
      <div class="fragekarte" id="karte">
        <div class="thema">Frage ${i + 1}${istTF ? ' &middot; Richtig oder falsch' : ''}</div>
        <div class="frage">${esc(f.stem)}</div>
        ${f.type === 'norm'
          ? `<div class="optionen"><input type="text" id="freitext" placeholder="Antwort eingeben" autocomplete="off" enterkeyhint="go">
             <button class="knopf" id="absenden">Weiter</button></div>`
          : `<div class="optionen">${f.options.map((o, k) =>
              `<button class="option" data-k="${k}"><span class="marker">${istTF ? (k ? '✕' : '✓') : String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></button>`).join('')}</div>`}
      </div>
    </div>
    ${istTF ? '<p class="hinweis" style="text-align:center">Tippen oder wischen: rechts = richtig, links = falsch.</p>' : ''}
    <button class="knopf leise" id="abbrechen" style="margin-top:14px">Abbrechen</button>
  `);

  const start = Date.now();
  const weiter = async (choice, richtung) => {
    const karte = document.getElementById('karte');
    karte.classList.add(richtung === 'links' ? 'raus-links' : 'raus-rechts');
    try {
      await api('/api/diagnostic/answer', {
        runId: S.lauf.runId, questionId: f.id, choice, ms: Date.now() - start
      });
    } catch (e) { /* offline: Antwort geht verloren, Lauf läuft weiter */ }
    setTimeout(() => { S.lauf.index++; ansichtDiagnostic(); }, 220);
  };

  app.querySelectorAll('.option').forEach((b) => {
    b.onclick = () => weiter(Number(b.dataset.k), Number(b.dataset.k) === 0 ? 'rechts' : 'links');
  });
  const freitext = document.getElementById('freitext');
  if (freitext) {
    const senden = () => weiter(freitext.value, 'rechts');
    document.getElementById('absenden').onclick = senden;
    freitext.onkeydown = (e) => { if (e.key === 'Enter') senden(); };
    freitext.focus();
  }
  document.getElementById('abbrechen').onclick = () => {
    if (confirm('Diagnostic abbrechen? Dein Zwischenstand geht verloren.')) {
      S.lauf = null; location.hash = '#/';
    }
  };

  if (istTF) wischen(document.getElementById('karte'), (r) => weiter(r === 'rechts' ? 0 : 1, r));
}

/** Horizontale Wischgeste. Vertikales Scrollen bleibt unangetastet. */
function wischen(el, fertig) {
  let x0 = null, y0 = null, dx = 0, aktiv = false;
  el.addEventListener('touchstart', (e) => {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; aktiv = false;
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (x0 === null) return;
    const cx = e.touches[0].clientX - x0, cy = e.touches[0].clientY - y0;
    if (!aktiv && Math.abs(cx) < 12 && Math.abs(cy) < 12) return;
    if (!aktiv) { aktiv = Math.abs(cx) > Math.abs(cy); if (!aktiv) { x0 = null; return; } }
    dx = cx;
    el.style.transform = `translateX(${dx}px) rotate(${dx / 26}deg)`;
    el.style.opacity = String(1 - Math.min(Math.abs(dx) / 320, 0.45));
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (x0 === null) return;
    el.style.transform = ''; el.style.opacity = '';
    if (Math.abs(dx) > 90) fertig(dx > 0 ? 'rechts' : 'links');
    x0 = null;
  });
}

async function diagnosticAbschliessen() {
  laden();
  try {
    const r = await api('/api/diagnostic/finish', { runId: S.lauf.runId });
    S.lauf = null;
    sessionStorage.setItem('ergebnis', JSON.stringify(r));
    location.hash = '#/ergebnis';
  } catch (e) { fehlerAnzeigen(e); }
}

async function ansichtErgebnis() {
  const r = JSON.parse(sessionStorage.getItem('ergebnis') || 'null');
  if (!r) return (location.hash = '#/');

  zeige(`
    <h1>Dein Ausgangswert</h1>
    <div class="karte">
      <div class="countdown">
        <span class="tage zahl">${r.gesamt}<small style="font-size:22px">%</small></span>
        <span class="label">richtig<br>bei ${r.beantwortet} Fragen</span>
      </div>
      <p class="hinweis">${esc(r.hinweis)}</p>
    </div>

    <h2>Dein Fachprofil</h2>
    <div class="karte">
      ${r.faecher.map((f) => `
        <div class="fach">
          <div class="kopf"><span>${esc(f.label)}</span><b class="zahl">${f.prozent}%</b></div>
          <div class="balken"><i style="width:${f.prozent}%"></i></div>
        </div>`).join('')}
    </div>

    <h2>Wo du anfangen solltest</h2>
    <div class="karte">
      <p>${esc(r.empfehlung)}</p>
      ${r.schwaechen.map((s, k) => `<div class="zwischen" style="padding:8px 0;border-top:1px solid var(--line)">
          <span>${k + 1}. ${esc(s.name)}</span><b class="zahl" style="color:var(--fg-3)">${s.prozent}%</b></div>`).join('')}
    </div>

    <h2>Ergebnis teilen</h2>
    <div class="karte">
      <canvas id="karte-canvas" width="540" height="960"></canvas>
      <div class="reihe">
        <button class="knopf" id="teilen">Teilen</button>
        <button class="knopf sekundaer" id="speichern">Speichern</button>
      </div>
      <p class="hinweis" style="margin-top:10px">Die Karte zeigt nur deine Prozentwerte, keine Einzelantworten.</p>
    </div>

    <h2>Wenn es soweit ist</h2>
    <div class="karte">
      <p>Der vollständige Kurs startet zum Termin im Jänner. Trag dich ein, dann meldet
         sich SUBSUMO einmal - nicht öfter.</p>
      <input type="email" id="email" placeholder="deine@email.at" autocomplete="email" inputmode="email">
      <label class="zeile"><input type="checkbox" id="consent">
        <span>Ich willige ein, dass meine E-Mail-Adresse zur Benachrichtigung über den Kursstart
        gespeichert wird. Die Einwilligung kann ich jederzeit widerrufen.</span></label>
      <button class="knopf" id="eintragen">Benachrichtigt werden</button>
      <p class="hinweis" id="wl-hinweis"></p>
    </div>
  `);

  zeichneKarte(r);
  document.getElementById('teilen').onclick = () => teileKarte(r);
  document.getElementById('speichern').onclick = () => {
    const a = document.createElement('a');
    a.download = 'subsumo-ergebnis.png';
    a.href = document.getElementById('karte-canvas').toDataURL('image/png');
    a.click();
  };
  document.getElementById('eintragen').onclick = async () => {
    const hinweis = document.getElementById('wl-hinweis');
    try {
      await api('/api/diagnostic/warteliste', {
        email: document.getElementById('email').value,
        consent: document.getElementById('consent').checked,
        examId: r.exam?.id
      });
      hinweis.textContent = 'Eingetragen. Bis im Jänner.';
    } catch (e) {
      hinweis.textContent = e.body?.hinweis || 'Bitte E-Mail-Adresse und Einwilligung prüfen.';
    }
  };
}

/** Ergebniskarte im 9:16-Format - der eigentliche Vertriebsmotor (Kapitel 17). */
function zeichneKarte(r) {
  const c = document.getElementById('karte-canvas');
  const g = c.getContext('2d');
  const W = c.width, H = c.height;

  g.fillStyle = '#0f1115'; g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, 'rgba(200,162,74,.16)'); grad.addColorStop(1, 'rgba(200,162,74,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);

  g.fillStyle = '#c8a24a'; g.font = '700 24px system-ui, sans-serif';
  g.letterSpacing = '4px';
  g.fillText('SUBSUMO', 48, 84);
  g.letterSpacing = '0px';

  g.fillStyle = '#a4adbe'; g.font = '400 22px system-ui, sans-serif';
  g.fillText('StEOP-Diagnostic', 48, 124);

  g.fillStyle = '#eef1f6'; g.font = '800 150px system-ui, sans-serif';
  g.fillText(r.gesamt + '%', 44, 300);
  g.fillStyle = '#6f7a8f'; g.font = '400 22px system-ui, sans-serif';
  g.fillText(`richtig bei ${r.beantwortet} Fragen`, 48, 340);

  let y = 430;
  for (const f of r.faecher) {
    g.fillStyle = '#eef1f6'; g.font = '600 24px system-ui, sans-serif';
    g.fillText(f.label, 48, y);
    g.fillStyle = '#a4adbe'; g.font = '600 24px system-ui, sans-serif';
    g.textAlign = 'right'; g.fillText(f.prozent + '%', W - 48, y); g.textAlign = 'left';
    g.fillStyle = '#1f2430'; runde(g, 48, y + 14, W - 96, 12, 6); g.fill();
    g.fillStyle = '#c8a24a'; runde(g, 48, y + 14, (W - 96) * (f.prozent / 100), 12, 6); g.fill();
    y += 76;
  }

  if (r.tageBisPruefung !== null) {
    g.fillStyle = '#c8a24a'; g.font = '800 44px system-ui, sans-serif';
    g.fillText(r.tageBisPruefung + ' Tage', 48, H - 150);
    g.fillStyle = '#6f7a8f'; g.font = '400 22px system-ui, sans-serif';
    g.fillText('bis zur Prüfung', 48, H - 116);
  }
  g.fillStyle = '#6f7a8f'; g.font = '400 20px system-ui, sans-serif';
  g.fillText('Mach den Test: ' + location.host, 48, H - 56);
}

function runde(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r); g.closePath();
}

async function teileKarte(r) {
  const c = document.getElementById('karte-canvas');
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const datei = new File([blob], 'subsumo.png', { type: 'image/png' });
  const text = `Ich habe ${r.gesamt}% im StEOP-Diagnostic. Wie viel schaffst du?`;
  const url = r.shareToken ? location.origin + '/k/' + r.shareToken : location.origin;
  try {
    if (navigator.canShare?.({ files: [datei] })) {
      await navigator.share({ files: [datei], text, url });
    } else if (navigator.share) {
      await navigator.share({ text, url });
    } else {
      await navigator.clipboard.writeText(text + ' ' + url);
      alert('Link kopiert.');
    }
    api('/api/diagnostic/shared', { kanal: 'web-share' }).catch(() => {});
  } catch { /* Nutzerin hat abgebrochen */ }
}

// ------------------------------------------------------------------- Plan
async function ansichtPlan() {
  laden();
  if (!S.ich?.angemeldet) return ansichtKonto('Melde dich an, dann baut SUBSUMO deinen Tagesplan.');
  let p;
  try { p = await api('/api/lernen/plan'); } catch (e) { return fehlerAnzeigen(e); }

  const ICON = { wiederholung: '&#8635;', schwachstelle: '&#9888;', lektion: '&#9998;', fall: '&#9878;', mix: '&#9673;' };

  zeige(`
    ${warnbanner(p.warnung)}
    <h1>Heute</h1>
    ${p.exam ? `<div class="countdown">
        <span class="tage zahl">${p.tageBisPruefung}</span>
        <span class="label">Tage bis<br>${esc(p.exam.label)}</span></div>` : ''}
    <p class="hinweis">Geplant für ${p.tagesminuten} Minuten. Alles darunter ist besser als nichts.</p>

    ${p.bloecke.map((b, i) => `
      <button class="block ${b.gesperrt ? 'gesperrt' : ''}" data-i="${i}">
        <span class="icon">${ICON[b.kind] || '&#9679;'}</span>
        <span><span class="titel">${esc(b.titel)}</span><br><span class="unter">${esc(b.untertitel || '')}</span></span>
        <span class="dauer">${b.gesperrt ? '&#128274;' : b.minutes + ' Min'}</span>
      </button>`).join('')}

    ${p.paywall ? `<div class="karte" style="border-color:var(--akzent)">
        <h3 style="color:var(--fg)">${esc(p.paywall.titel)}</h3>
        <p>${esc(p.paywall.text)}</p>
        <button class="knopf" onclick="location.hash='#/pass'">${esc(p.paywall.cta)}</button>
      </div>` : ''}

    <button class="knopf leise" onclick="location.hash='#/fortschritt'">Fortschritt ansehen</button>
  `);

  app.querySelectorAll('.block').forEach((b) => {
    b.onclick = () => {
      const block = p.bloecke[Number(b.dataset.i)];
      if (block.gesperrt) return (location.hash = '#/pass');
      if (block.kind === 'lektion') return (location.hash = '#/lektion/' + block.payload.lessonId);
      if (block.kind === 'fall') return (location.hash = '#/fall/' + block.payload.caseId);
      starteSession(block);
    };
  });
}

// --------------------------------------------------------------- Lernsession
async function starteSession(block) {
  laden();
  try {
    const s = await api('/api/lernen/session/start', {
      kind: block.kind, limit: block.payload?.limit || 10, topicId: block.payload?.topicId
    });
    if (!s.fragen.length) {
      return zeige(`<div class="karte"><h2>${esc(s.hinweis || 'Nichts zu tun.')}</h2>
        <button class="knopf sekundaer" onclick="location.hash='#/plan'">Zurück zum Plan</button></div>`);
    }
    S.session = { ...s, index: 0, richtig: 0, kind: block.kind };
    location.hash = '#/lernen';
    ansichtSession();
  } catch (e) { fehlerAnzeigen(e); }
}

function ansichtSession() {
  const s = S.session;
  if (!s) {
    return zeige(`<div class="karte"><h2>Keine laufende Session</h2>
      <p>Starte sie über deinen Tagesplan.</p>
      <button class="knopf" onclick="location.hash='#/plan'">Zum Tagesplan</button></div>`);
  }
  if (s.index >= s.fragen.length) return sessionEnde();

  const f = s.fragen[s.index];
  zeige(`
    <div class="sessionkopf">
      <div class="balken"><i style="width:${(s.index / s.fragen.length) * 100}%"></i></div>
      <span class="zaehler">${s.index + 1}/${s.fragen.length}</span>
    </div>
    <div class="fragekarte">
      <div class="thema">${f.geprueft
        ? '<span class="plakette geprueft">geprüft' + (f.pruefer ? ' &middot; ' + esc(f.pruefer) : '') + '</span>'
        : '<span class="plakette ungeprueft">nicht freigegeben</span>'}</div>
      <div class="frage">${esc(f.stem)}</div>
      ${f.type === 'norm'
        ? `<div class="optionen"><input type="text" id="freitext" placeholder="Antwort eingeben" autocomplete="off">
           <button class="knopf" id="absenden">Prüfen</button></div>`
        : `<div class="optionen" id="opts">${f.options.map((o, k) =>
            `<button class="option" data-k="${k}"><span class="marker">${String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></button>`).join('')}</div>`}
      <div id="aufloesung"></div>
    </div>
    <button class="knopf leise" id="melden" style="margin-top:12px">Inhaltlichen Fehler melden</button>
  `);

  const start = Date.now();
  const prüfen = async (choice, knopf) => {
    app.querySelectorAll('.option').forEach((b) => (b.disabled = true));
    let r;
    try {
      r = await api('/api/lernen/antwort', {
        questionId: f.id, choice, ms: Date.now() - start, context: s.kind
      });
    } catch (e) { return fehlerAnzeigen(e); }

    if (r.richtig) s.richtig++;
    if (knopf) knopf.classList.add(r.richtig ? 'richtig' : 'falsch');
    if (!r.richtig && typeof r.loesung === 'number') {
      app.querySelector(`.option[data-k="${r.loesung}"]`)?.classList.add('richtig');
    }
    document.getElementById('aufloesung').innerHTML = `
      <div class="aufloesung ${r.richtig ? 'gut' : 'schlecht'}">
        <b>${r.richtig ? 'Richtig.' : 'Nicht ganz.'}</b> ${esc(r.erklaerung)}
        ${r.mastery !== null ? `<div class="hinweis" style="margin-top:8px">Thema-Mastery: ${r.mastery}%</div>` : ''}
      </div>
      <button class="knopf" id="weiter" style="margin-top:12px">Weiter</button>`;
    document.getElementById('weiter').onclick = () => { s.index++; ansichtSession(); };
    document.getElementById('weiter').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  app.querySelectorAll('.option').forEach((b) =>
    (b.onclick = () => prüfen(Number(b.dataset.k), b)));
  const ft = document.getElementById('freitext');
  if (ft) {
    document.getElementById('absenden').onclick = () => prüfen(ft.value, null);
    ft.onkeydown = (e) => { if (e.key === 'Enter') prüfen(ft.value, null); };
  }
  document.getElementById('melden').onclick = async () => {
    const notiz = prompt('Was stimmt an dieser Frage nicht?');
    if (!notiz) return;
    await api('/api/lernen/sachfehler', { typ: 'question', objektId: f.id, grund: 'sachfehler', notiz });
    alert('Danke. Die Meldung geht in die fachliche Prüfung.');
  };
}

async function sessionEnde() {
  const s = S.session;
  await api('/api/lernen/session/ende', { kind: s.kind, beantwortet: s.fragen.length }).catch(() => {});
  const quote = Math.round((s.richtig / s.fragen.length) * 100);
  S.session = null;
  zeige(`
    <h1>Block fertig</h1>
    <div class="karte">
      <div class="countdown"><span class="tage zahl">${quote}<small style="font-size:22px">%</small></span>
        <span class="label">richtig<br>${s.richtig} von ${s.fragen.length}</span></div>
      <p class="hinweis">Was du falsch hattest, kommt automatisch wieder - frühestens heute Abend,
         spätestens in ein paar Tagen.</p>
    </div>
    <button class="knopf" onclick="location.hash='#/plan'">Zurück zum Tagesplan</button>
  `);
}

// ------------------------------------------------------------------ Lektion
async function ansichtLektion(id) {
  laden();
  let l;
  try { l = await api('/api/lernen/lektion/' + encodeURIComponent(id)); }
  catch (e) { return fehlerAnzeigen(e); }

  zeige(`
    ${warnbanner(l.warnung)}
    <h1>${esc(l.title)}</h1>
    <p class="hinweis">${l.minutes} Minuten &middot;
      ${l.geprueft ? `<span class="plakette geprueft">geprüft${l.reviewer ? ' &middot; ' + esc(l.reviewer) : ''}</span>`
                   : '<span class="plakette ungeprueft">nicht freigegeben</span>'}</p>
    ${l.audio_script ? `<button class="knopf sekundaer" id="hoeren">Hörfassung abspielen</button>` : ''}
    <div class="karte lektion">${md(l.body)}</div>
    <button class="knopf" onclick="location.hash='#/plan'">Fertig</button>
  `);

  const h = document.getElementById('hoeren');
  if (h) h.onclick = () => {
    // Vorläufig über die Sprachausgabe des Geräts. Produktionsreif wären
    // vorproduzierte Audiodateien - siehe Kapitel 6 (Hörfassung je Lektion).
    if (!('speechSynthesis' in window)) return alert('Dieses Gerät kann keine Sprachausgabe.');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(l.audio_script);
    u.lang = 'de-AT'; u.rate = 1.02;
    speechSynthesis.speak(u);
    h.textContent = 'Hörfassung stoppen';
    h.onclick = () => { speechSynthesis.cancel(); ansichtLektion(id); };
  };
}

// --------------------------------------------------------------------- Fall
async function ansichtFall(id) {
  laden();
  let c;
  try { c = await api('/api/lernen/fall/' + encodeURIComponent(id)); }
  catch (e) { return fehlerAnzeigen(e); }

  zeige(`
    <h1>${esc(c.title)}</h1>
    <p class="hinweis">${c.minutes} Minuten &middot; Falltraining</p>
    <div class="karte lektion">${md(c.facts)}</div>
    <div class="karte"><strong>${esc(c.question)}</strong></div>
    <textarea id="antwort" placeholder="Fraglich ist, ob&hellip;"></textarea>
    <p class="hinweis">Schreib im Gutachtenstil. Obersatz, Definition, Subsumtion, Ergebnis.</p>
    <button class="knopf" id="abgeben">Abgeben</button>
    <div id="bewertung"></div>
  `);

  document.getElementById('abgeben').onclick = async () => {
    const antwort = document.getElementById('antwort').value;
    let b;
    try { b = await api('/api/lernen/fall/' + encodeURIComponent(id) + '/abgeben', { antwort }); }
    catch (e) { return alert(e.body?.hinweis || 'Das hat nicht geklappt.'); }

    document.getElementById('bewertung').innerHTML = `
      <h2>Selbstkontrolle</h2>
      <div class="karte">
        ${b.dimensionen.map((d) => `
          <div class="fach">
            <div class="kopf"><span>${esc(d.label)}</span><b class="zahl">${d.value}%</b></div>
            <div class="balken duenn"><i style="width:${d.value}%"></i></div>
            ${d.fehlt.length ? `<p class="hinweis" style="margin:6px 0 0">Nicht gefunden: ${d.fehlt.map(esc).join(', ')}</p>` : ''}
          </div>`).join('')}
        ${b.hinweise.length ? `<ul class="hinweis">${b.hinweise.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        <p class="hinweis" style="border-top:1px solid var(--line);padding-top:10px">
          ${esc(b.hinweis_zur_bewertung)}</p>
      </div>
      <button class="knopf sekundaer" onclick="location.hash='#/plan'">Zurück zum Plan</button>`;
    document.getElementById('bewertung').scrollIntoView({ behavior: 'smooth' });
  };
}

// -------------------------------------------------------------- Fortschritt
async function ansichtFortschritt() {
  laden();
  if (!S.ich?.angemeldet) return ansichtKonto();
  let f;
  try { f = await api('/api/lernen/fortschritt'); } catch (e) { return fehlerAnzeigen(e); }

  const faecher = {};
  for (const t of f.themen) (faecher[t.subject] ||= []).push(t);
  const LABEL = { methodenlehre: 'Methodenlehre', zivilrecht: 'Zivilrecht',
                  oeffentliches: 'Öffentliches Recht', strafrecht: 'Strafrecht', grundlagen: 'Grundlagen' };

  zeige(`
    <h1>Fortschritt</h1>
    <div class="karte">
      <div class="countdown"><span class="tage zahl">${f.readiness.wert}</span>
        <span class="label">Readiness<br>(intern)</span></div>
      <p class="hinweis">${esc(f.readiness.anzeigehinweis)}</p>
    </div>
    <div class="karte">
      <div class="zwischen"><span>Fällige Wiederholungen</span><b class="zahl">${f.faelligeWiederholungen}</b></div>
      <div class="zwischen" style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px">
        <span>Berührte Themen</span><b class="zahl">${f.abdeckung.beruehrt} / ${f.abdeckung.gesamt}</b></div>
    </div>
    ${Object.entries(faecher).map(([k, ts]) => `
      <h2>${esc(LABEL[k] || k)}</h2>
      <div class="karte">${ts.map((t) => `
        <div class="fach">
          <div class="kopf"><span>${esc(t.name)}</span><b class="zahl">${t.mastery}%</b></div>
          <div class="balken duenn"><i style="width:${t.mastery}%"></i></div>
        </div>`).join('')}</div>`).join('')}
    <div class="karte">
      <h3>Prüfung geschrieben?</h3>
      <p class="hinweis">Dein Ergebnis kalibriert den Score für alle nachfolgenden Jahrgänge.
         Freiwillig, jederzeit löschbar.</p>
      <div class="reihe">
        <button class="knopf sekundaer" data-bestanden="true">Bestanden</button>
        <button class="knopf sekundaer" data-bestanden="false">Nicht bestanden</button>
      </div>
    </div>
  `);

  app.querySelectorAll('[data-bestanden]').forEach((b) => (b.onclick = async () => {
    await api('/api/lernen/pruefungsergebnis', { bestanden: b.dataset.bestanden === 'true' });
    alert('Danke.');
  }));
}

// -------------------------------------------------------------------- Pass
async function ansichtPass() {
  laden();
  if (!S.ich?.angemeldet) return ansichtKonto('Für den Kauf brauchst du ein Konto.');
  let p;
  try { p = await api('/api/kasse/preise'); } catch (e) { return fehlerAnzeigen(e); }

  zeige(`
    <h1>Prüfungspass</h1>
    <p>Zugang bis ${esc(p.exam.label)}. ${esc(p.abohinweis)}</p>
    <p class="hinweis">Aktuelle Preisstufe: <b>${esc(p.stufe)}</b>.
      ${p.naechsteStufe ? `Ab ${p.naechsteStufe.abTagenVorPruefung} Tagen vor der Prüfung
        kostet PASS ${euro(p.naechsteStufe.pass)}.` : ''}</p>

    ${p.produkte.map((pr) => `
      <div class="karte">
        <div class="zwischen"><h2 style="margin:0">${esc(pr.name)}</h2>
          <b style="font-size:22px">${euro(pr.cents)}</b></div>
        <ul class="hinweis" style="margin:10px 0 14px;padding-left:18px">
          ${pr.enthalten.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
        <button class="knopf ${pr.key === 'pro' ? '' : 'sekundaer'}" data-produkt="${pr.key}">${esc(pr.name)} wählen</button>
      </div>`).join('')}

    <div class="karte">
      <h3>Lerngruppe</h3>
      <p class="hinweis">Zu dritt kaufen: je ${euro(p.gruppe.pass)} statt ${euro(p.pass)}.
         Code teilen, alle bekommen den Gruppenpreis.</p>
      <input type="text" id="gruppencode" placeholder="Gruppencode (optional)" autocomplete="off">
    </div>

    <div class="karte">
      <label class="zeile"><input type="checkbox" id="fagg">
        <span>${esc(p.faggText)}</span></label>
      <p class="hinweis">${esc(p.ustHinweis)}</p>
    </div>
    <p class="hinweis" id="kauf-hinweis"></p>
  `);

  app.querySelectorAll('[data-produkt]').forEach((b) => (b.onclick = async () => {
    const hinweis = document.getElementById('kauf-hinweis');
    try {
      const r = await api('/api/kasse/kaufen', {
        produkt: b.dataset.produkt,
        examId: p.exam.id,
        gruppencode: document.getElementById('gruppencode').value.trim() || undefined,
        faggZustimmung: document.getElementById('fagg').checked
      });
      S.ich = await api('/api/auth/ich');
      hinweis.textContent = (r.hinweis ? r.hinweis + ' ' : '') + 'Zugang freigeschaltet.';
      setTimeout(() => (location.hash = '#/plan'), 900);
    } catch (e) {
      hinweis.textContent = e.body?.hinweis || 'Der Kauf konnte nicht abgeschlossen werden.';
    }
  }));
}

// ------------------------------------------------------------------- Konto
async function ansichtKonto(nachricht) {
  const ich = S.ich?.nutzer;
  if (S.ich?.angemeldet) {
    zeige(`
      <h1>Konto</h1>
      <div class="karte">
        <p>${esc(ich.email)}</p>
        <div class="zwischen"><span>Zugang</span><b>${ich.zahlenderZugang ? esc(ich.tier.toUpperCase()) : 'kostenlos'}</b></div>
        ${ich.zugangBis ? `<div class="zwischen" style="margin-top:8px"><span>gültig bis</span>
          <b>${new Date(ich.zugangBis).toLocaleDateString('de-AT')}</b></div>` : ''}
      </div>
      <div class="karte">
        <h3>Tagesbudget</h3>
        <p class="hinweis">Wie viele Minuten willst du an einem normalen Tag investieren?
           Der Plan richtet sich danach.</p>
        <div class="reihe">
          <input type="number" id="minuten" min="5" max="120" step="5" value="${ich.tagesminuten}">
          <button class="knopf sekundaer" id="speichern">Speichern</button>
        </div>
      </div>
      <div class="karte">
        <h3>Prüftermin</h3>
        <select id="termin">${S.config.termine.map((t) =>
          `<option value="${t.id}" ${t.id === ich.examId ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>
      </div>
      <button class="knopf leise" id="abmelden">Abmelden</button>
      <button class="knopf leise" id="loeschen" style="margin-top:10px;color:var(--schlecht)">Konto und Lerndaten löschen</button>
      <p class="hinweis" style="margin-top:16px"><a href="/api/rechtstexte">Rechtstexte</a> &middot;
        <a href="/admin">Backoffice</a></p>
    `);
    document.getElementById('speichern').onclick = async () => {
      await api('/api/auth/einstellungen', {
        tagesminuten: Number(document.getElementById('minuten').value),
        examId: document.getElementById('termin').value
      });
      S.ich = await api('/api/auth/ich');
      alert('Gespeichert.');
    };
    document.getElementById('termin').onchange = () => document.getElementById('speichern').click();
    document.getElementById('abmelden').onclick = async () => {
      await api('/api/auth/abmelden', {}); S.ich = null; location.hash = '#/';
    };
    document.getElementById('loeschen').onclick = async () => {
      if (!confirm('Konto und alle Lerndaten unwiderruflich löschen?')) return;
      await api('/api/auth/konto-loeschen', {}); S.ich = null; location.hash = '#/';
    };
    return;
  }

  zeige(`
    <h1>Anmelden</h1>
    ${nachricht ? `<p>${esc(nachricht)}</p>` : '<p>Kein Passwort. Du bekommst einen Link per E-Mail.</p>'}
    <div class="karte">
      <input type="email" id="email" placeholder="deine@email.at" autocomplete="email" inputmode="email">
      <label class="zeile"><input type="checkbox" id="ueber18">
        <span>Ich bin mindestens 18 Jahre alt.</span></label>
      <button class="knopf" id="senden">Anmeldelink anfordern</button>
      <p class="hinweis" id="auth-hinweis"></p>
    </div>
    <p class="hinweis">Bist du unter 18, brauchen wir die Zustimmung deiner Erziehungsberechtigten,
       bevor du einen kostenpflichtigen Zugang kaufen kannst. Der Diagnostic ist für alle frei.</p>
  `);

  document.getElementById('senden').onclick = async () => {
    const hinweis = document.getElementById('auth-hinweis');
    try {
      const r = await api('/api/auth/anfordern', {
        email: document.getElementById('email').value,
        ueber18: document.getElementById('ueber18').checked
      });
      hinweis.innerHTML = esc(r.hinweis) +
        (r.entwicklungsLink ? ` <a href="${esc(r.entwicklungsLink)}">Link öffnen</a>` : '');
    } catch (e) { hinweis.textContent = 'Bitte gib eine gültige E-Mail-Adresse ein.'; }
  };
}

// ------------------------------------------------------------------ Router
const ROUTEN = {
  '': ansichtStart,
  'diagnostic': ansichtDiagnostic,
  'ergebnis': ansichtErgebnis,
  'plan': ansichtPlan,
  'lernen': ansichtSession,
  'fortschritt': ansichtFortschritt,
  'pass': ansichtPass,
  'konto': ansichtKonto
};

function routen() {
  const teile = location.hash.replace(/^#\/?/, '').split('/');
  const wurzel = teile[0] || '';
  navi.hidden = !S.ich?.angemeldet;
  navi.querySelectorAll('a').forEach((a) =>
    a.classList.toggle('aktiv', a.dataset.route === wurzel));

  if (wurzel === 'lektion') return ansichtLektion(teile[1]);
  if (wurzel === 'fall') return ansichtFall(teile[1]);
  (ROUTEN[wurzel] || ansichtStart)();
}

async function start() {
  try {
    [S.config, S.ich] = await Promise.all([api('/api/config'), api('/api/auth/ich')]);
  } catch {
    return zeige('<div class="karte"><h2>Keine Verbindung</h2><p>Versuch es gleich noch einmal.</p></div>');
  }
  const t = S.config.termine.find((x) => new Date(x.date) > new Date());
  if (t) kontextEl.textContent = tageBis(t.date) + ' Tage';
  window.addEventListener('hashchange', routen);
  routen();
  if ('serviceWorker' in navigator && location.protocol === 'https:')
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

start();
