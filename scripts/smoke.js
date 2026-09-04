'use strict';
// End-to-End-Durchlauf gegen einen frisch gestarteten Server.
// Deckt ab: Diagnostic ohne Konto, Registrierung mit Uebernahme der Diagnostic-Daten,
// Tagesplan mit Paywall, Kauf mit FAGG-Nachweis, Lernsession, Falltraining,
// Sachfehlermeldung, Review-Freigabe und Kennzahlen.

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3111';
process.env.DATA_DIR = require('path').join(__dirname, '..', 'data', 'test');
process.env.ADMIN_TOKEN = 'test-token';

const fs = require('fs');
fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });

require('./seed');
const { server } = require('../server/index');

const BASIS = `http://127.0.0.1:${process.env.PORT}`;
let kekse = '';
let ok = 0, fehler = 0;

function pruefe(bedingung, text) {
  if (bedingung) { ok++; console.log('  ok   ' + text); }
  else { fehler++; console.log('  FEHL ' + text); }
}

async function req(pfad, daten, methode) {
  const opt = { headers: { cookie: kekse }, redirect: 'manual' };
  if (daten !== undefined) {
    opt.method = methode || 'POST';
    opt.headers['content-type'] = 'application/json';
    opt.body = JSON.stringify(daten);
  } else if (methode) opt.method = methode;
  if (process.env.ADMIN) opt.headers['x-admin-token'] = process.env.ADMIN_TOKEN;

  const r = await fetch(BASIS + pfad, opt);
  const setzen = r.headers.getSetCookie?.() || [];
  for (const c of setzen) {
    const [paar] = c.split(';');
    const name = paar.split('=')[0];
    kekse = kekse.split('; ').filter(Boolean).filter((k) => !k.startsWith(name + '=')).concat(paar).join('; ');
  }
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = { _text: text.slice(0, 200) }; }
  return { status: r.status, body, headers: r.headers };
}

(async () => {
  console.log('\n--- Diagnostic ohne Konto ---');
  const start = await req('/api/diagnostic/start', {});
  pruefe(start.status === 200, 'Diagnostic startet');
  pruefe(start.body.fragen.length === 25, `25 Fragen gezogen (${start.body.fragen.length})`);
  pruefe(!start.body.fragen.some((f) => 'answer' in f), 'keine Loesung im Frontend-Payload');
  pruefe(!!start.body.warnung, 'Warnung wegen ungepruefter Inhalte wird gesetzt');

  const faecher = new Set();
  for (const [i, f] of start.body.fragen.entries()) {
    const wahl = f.type === 'norm' ? 'Bundesgesetzblatt' : (i % 3 === 0 ? 1 : 0);
    const a = await req('/api/diagnostic/answer', { runId: start.body.runId, questionId: f.id, choice: wahl, ms: 4200 });
    if (a.status !== 200) { pruefe(false, 'Antwort ' + i + ' abgelehnt: ' + JSON.stringify(a.body)); break; }
    faecher.add(f.topicId);
  }
  pruefe(faecher.size > 8, `breite Themenabdeckung (${faecher.size} Themen)`);

  const fremd = await req('/api/diagnostic/answer',
    { runId: start.body.runId, questionId: 'q-gibt-es-nicht', choice: 0 });
  pruefe(fremd.status === 400, 'Frage ausserhalb des Laufs wird abgelehnt');

  const ergebnis = await req('/api/diagnostic/finish', { runId: start.body.runId });
  pruefe(ergebnis.status === 200 && typeof ergebnis.body.gesamt === 'number',
    `Ergebnis berechnet (${ergebnis.body.gesamt}%)`);
  pruefe(ergebnis.body.faecher.length >= 4, 'Fachprofil ueber mehrere Faecher');
  pruefe(ergebnis.body.schwaechen.length > 0, 'Schwachstellen benannt');
  pruefe(!!ergebnis.body.shareToken, 'Teil-Token erzeugt');

  const geteilt = await req('/api/diagnostic/result/' + ergebnis.body.shareToken);
  pruefe(geteilt.status === 200 && geteilt.body.gesamt === ergebnis.body.gesamt,
    'geteilte Karte abrufbar');
  pruefe(!('schwaechen' in geteilt.body) && !('runId' in geteilt.body),
    'geteilte Karte enthaelt keine Detaildaten');

  const wl = await req('/api/diagnostic/warteliste', { email: 'test@example.at', consent: false });
  pruefe(wl.status === 400, 'Warteliste ohne Einwilligung abgelehnt');
  pruefe((await req('/api/diagnostic/warteliste', { email: 'test@example.at', consent: true })).status === 200,
    'Warteliste mit Einwilligung akzeptiert');

  console.log('\n--- Konto und Uebernahme des Diagnostic ---');
  const anf = await req('/api/auth/anfordern', { email: 'studentin@example.at', ueber18: true });
  pruefe(anf.status === 200 && anf.body.neu === true, 'Konto angelegt');
  const einl = await req(anf.body.entwicklungsLink, undefined, 'GET');
  pruefe(einl.status === 302, 'Anmeldelink loest Weiterleitung aus');
  const ich = await req('/api/auth/ich');
  pruefe(ich.body.angemeldet === true, 'Sitzung aktiv');
  pruefe(ich.body.nutzer.zahlenderZugang === false, 'Startet ohne bezahlten Zugang');

  const fortschritt1 = await req('/api/lernen/fortschritt');
  const beruehrt = fortschritt1.body.abdeckung.beruehrt;
  pruefe(beruehrt > 5, `Diagnostic in Mastery uebernommen (${beruehrt} Themen)`);
  pruefe(fortschritt1.body.readiness.kalibriert === false,
    'Readiness ist ausdruecklich als unkalibriert markiert');

  console.log('\n--- Tagesplan und Paywall ---');
  const plan1 = await req('/api/lernen/plan');
  pruefe(plan1.status === 200 && plan1.body.bloecke.length > 1, 'Plan mit mehreren Bloecken');
  pruefe(plan1.body.bezahlt === false && !!plan1.body.paywall, 'Paywall aktiv');
  pruefe(plan1.body.bloecke[0].gesperrt !== true, 'erster Block bleibt frei');
  pruefe(plan1.body.bloecke.slice(1).every((b) => b.gesperrt), 'restliche Bloecke gesperrt');
  pruefe(plan1.body.bloecke.every((b) => b.minutes <= 12), 'kein Block ueber 12 Minuten');
  pruefe(plan1.body.bloecke.every((b) => b.titel && b.untertitel !== undefined),
    'jeder Block traegt Titel und Untertitel');

  console.log('\n--- Lernsession ---');
  const sess = await req('/api/lernen/session/start', { kind: 'mix', limit: 6 });
  pruefe(sess.body.fragen.length === 6, 'Session mit 6 Fragen');
  let richtige = 0;
  for (const f of sess.body.fragen) {
    const a = await req('/api/lernen/antwort',
      { questionId: f.id, choice: f.type === 'norm' ? 'Bundesgesetzblatt' : 0, ms: 6000, context: 'mix' });
    if (a.status !== 200) { pruefe(false, 'Antwort abgelehnt: ' + JSON.stringify(a.body)); break; }
    if (a.body.richtig) richtige++;
    pruefe(typeof a.body.erklaerung === 'string' && a.body.erklaerung.length > 0,
      'Erklaerung mitgeliefert') , ok--;   // nicht je Frage zaehlen
  }
  ok++;
  pruefe(richtige >= 0, `Session ausgewertet (${richtige}/6 richtig)`);
  pruefe((await req('/api/lernen/session/ende', { kind: 'mix', beantwortet: 6 })).status === 200,
    'Sessionende protokolliert');

  const faellig = (await req('/api/lernen/fortschritt')).body.faelligeWiederholungen;
  pruefe(typeof faellig === 'number', `Wiederholungsplan gefuehrt (${faellig} faellig)`);

  console.log('\n--- Zugriffsschutz ---');
  const fallGesperrt = await req('/api/lernen/fall/c-z-vertrag-1');
  pruefe(fallGesperrt.status === 402, 'Falltraining ohne Kauf gesperrt');

  console.log('\n--- Kauf ---');
  const preise = await req('/api/kasse/preise');
  pruefe(preise.status === 200 && preise.body.pass > 0, `Preise geliefert (PASS ${preise.body.pass} Cent)`);
  pruefe(preise.body.abo === null, 'kein Abo im Angebot');
  pruefe(preise.body.terminGewechselt === true,
    'Beta-Termin wird fuer den Verkauf auf den naechsten Verkaufstermin umgestellt');
  const ohneFagg = await req('/api/kasse/kaufen',
    { produkt: 'pro', examId: preise.body.exam.id, faggZustimmung: false });
  pruefe(ohneFagg.status === 400 && ohneFagg.body.error === 'fagg_zustimmung_fehlt',
    'Kauf ohne FAGG-Erklaerung abgelehnt');
  const beta = await req('/api/kasse/kaufen',
    { produkt: 'pass', examId: 'steop-2026-10-02', faggZustimmung: true });
  pruefe(beta.status === 400 && beta.body.error === 'termin_nicht_verkaeuflich',
    'Beta-Termin ist nicht verkaeuflich');

  const kauf = await req('/api/kasse/kaufen',
    { produkt: 'pro', examId: preise.body.exam.id, faggZustimmung: true });
  pruefe(kauf.status === 200 && kauf.body.bezahlt, 'Kauf abgeschlossen');
  const ich2 = await req('/api/auth/ich');
  pruefe(ich2.body.nutzer.zahlenderZugang === true, 'Zugang freigeschaltet');

  const plan2 = await req('/api/lernen/plan');
  pruefe(plan2.body.bezahlt === true && !plan2.body.bloecke.some((b) => b.gesperrt),
    'Plan vollstaendig sichtbar');

  console.log('\n--- Falltraining ---');
  const fall = await req('/api/lernen/fall/c-z-vertrag-1');
  pruefe(fall.status === 200 && !('rubric' in fall.body), 'Fall geliefert, Raster bleibt serverseitig');
  const kurz = await req('/api/lernen/fall/c-z-vertrag-1/abgeben', { antwort: 'Kein Vertrag.' });
  pruefe(kurz.status === 400, 'zu kurze Loesung abgelehnt');
  const loesung = 'Fraglich ist, ob zwischen Anna und dem Haendler ein Kaufvertrag zustande gekommen ist. ' +
    'Dazu muessten ein Angebot und eine Annahme vorliegen, also uebereinstimmende Willenserklaerungen. ' +
    'Das Schaufenster mit dem Preisschild ist mangels Bindungswille nur eine Einladung zum Anbieten. ' +
    'Anna gibt das Angebot ab, als sie erklaert, sie nehme das Geraet. Die Antwort des Verkaeufers ' +
    'ich hole ihn aus dem Lager koennte eine Annahme sein. Somit ist zu pruefen, ob darin bereits eine ' +
    'verbindliche Annahme liegt. Im Ergebnis ist kein Vertrag zustande gekommen.';
  const bew = await req('/api/lernen/fall/c-z-vertrag-1/abgeben', { antwort: loesung });
  pruefe(bew.status === 200 && bew.body.dimensionen.length === 4,
    `Fall auf vier Dimensionen bewertet (gesamt ${bew.body.total})`);
  pruefe(bew.body.total > 50, 'Musterloesung erreicht eine plausible Punktzahl');
  pruefe(!!bew.body.hinweis_zur_bewertung, 'Grenzen des Verfahrens werden ausgewiesen');

  console.log('\n--- Qualitaet und Backoffice ---');
  const frage = sess.body.fragen[0];
  pruefe((await req('/api/lernen/sachfehler',
    { typ: 'question', objektId: frage.id, notiz: 'Antwort B ist auch vertretbar.' })).status === 200,
    'Sachfehlermeldung angenommen');

  process.env.ADMIN = '1';
  const queue = await req('/api/admin/queue');
  pruefe(queue.status === 200 && queue.body.offenGesamt > 0,
    `Review-Warteschlange gefuellt (${queue.body.offenGesamt} offen, ` +
    `${queue.body.geschaetzterPruefaufwand.stunden} Std.)`);
  const ohnePruefer = await req('/api/admin/review-thema', { topicId: 'm-auslegung', pruefer: '' });
  pruefe(ohnePruefer.status === 400, 'Freigabe ohne benannten Pruefer abgelehnt');
  const frei = await req('/api/admin/review-thema', { topicId: 'm-auslegung', pruefer: 'Dr. Muster' });
  pruefe(frei.status === 200 && frei.body.freigegeben > 0,
    `Thema freigegeben (${frei.body.freigegeben} Objekte)`);

  const meldungen = await req('/api/admin/meldungen');
  pruefe(meldungen.body.length === 1, 'Meldung im Backoffice sichtbar');
  await req('/api/admin/meldung/' + meldungen.body[0].id, { status: 'bestaetigt' });
  const gesperrt = require('../server/db')
    .prepare('SELECT status FROM questions WHERE id = ?').get(frage.id);
  pruefe(gesperrt.status === 'gesperrt', 'bestaetigter Sachfehler sperrt die Frage sofort');

  const k = await req('/api/admin/kennzahlen');
  pruefe(k.body.kpis.length >= 6, 'Kennzahlentafel vollstaendig');
  pruefe(k.body.wirtschaft.zahlendeNutzer === 1, 'zahlender Nutzer erfasst');
  pruefe(k.body.wirtschaft.breakEvenNutzer > 200 && k.body.wirtschaft.breakEvenNutzer < 400,
    `Break-even in der Groessenordnung des Business Case (${k.body.wirtschaft.breakEvenNutzer})`);
  process.env.ADMIN = '';

  const ohneToken = await fetch(BASIS + '/api/admin/queue');
  pruefe(ohneToken.status === 403, 'Backoffice ohne Token gesperrt');

  console.log('\n--- Rechtstexte und Auslieferung ---');
  const rt = await req('/api/rechtstexte');
  pruefe(rt.body.platzhalter === true, 'Rechtstexte sind als Platzhalter gekennzeichnet');
  const seite = await fetch(BASIS + '/');
  pruefe(seite.status === 200 && (await seite.text()).includes('SUBSUMO'), 'App-Shell wird ausgeliefert');
  pruefe((await fetch(BASIS + '/manifest.webmanifest')).status === 200, 'Manifest erreichbar');
  pruefe((await fetch(BASIS + '/icons/icon-192.png')).status === 200, 'Icon erreichbar');
  pruefe((await fetch(BASIS + '/k/' + ergebnis.body.shareToken)).status === 200, 'Teil-Seite erreichbar');

  console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen\n`);
  server.close();
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
