'use strict';
const path = require('path');
const express = require('express');
const config = require('./config');
const db = require('./db');
const auth = require('./lib/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);          // Replit terminiert TLS vorgelagert

app.use(express.json({ limit: '64kb' }));

/** Schlanker Cookie-Parser - eine Abhängigkeit weniger auf einem freien Plan. */
app.use((req, res, next) => {
  req.cookies = {};
  const raw = req.headers.cookie;
  if (raw) for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) req.cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  res.cookie = (name, value, opts = {}) => {
    const bits = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path || '/'}`];
    if (opts.maxAge) bits.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
    if (opts.httpOnly) bits.push('HttpOnly');
    if (opts.secure) bits.push('Secure');
    bits.push(`SameSite=${opts.sameSite || 'Lax'}`);
    const prev = res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie', (Array.isArray(prev) ? prev : prev ? [prev] : []).concat(bits.join('; ')));
    return res;
  };
  res.clearCookie = (name, opts = {}) =>
    res.cookie(name, '', { ...opts, maxAge: 0 });
  next();
});

// Sicherheitskopfzeilen. Bewusst streng: die App lädt nichts von fremden Hosts.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'");
  next();
});

/** Einfache Ratenbegrenzung im Speicher. Für eine Kohorte von 1.700 ausreichend. */
const treffer = new Map();
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') return next();
  const key = req.ip + '|' + req.path;
  const jetzt = Date.now();
  const eintrag = treffer.get(key) || { n: 0, bis: jetzt + 60000 };
  if (jetzt > eintrag.bis) { eintrag.n = 0; eintrag.bis = jetzt + 60000; }
  eintrag.n++; treffer.set(key, eintrag);
  if (treffer.size > 5000) treffer.clear();
  if (eintrag.n > 120) return res.status(429).json({ error: 'zu_viele_anfragen' });
  next();
});

app.use(auth.attach);

app.use('/api/diagnostic', require('./routes/diagnostic'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lernen', require('./routes/learn'));
app.use('/api/kasse', require('./routes/checkout'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/meta'));

app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: config.isProd ? '1h' : 0,
  setHeaders: (res, p) => {
    if (p.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Geteilte Ergebniskarte: eigene Route, damit der Link ohne App-Shell funktioniert.
app.get('/k/:token', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'karte.html')));

app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

// SPA-Fallback für alles, was keine API und keine Datei ist.
app.get(/^(?!\/api\/).*/, (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error('[Fehler]', err.message);
  res.status(500).json({ error: 'serverfehler' });
});

// Erststart auf Replit: Wer auf "Run" drückt, soll nicht erst seed ausführen müssen.
if (db.prepare('SELECT COUNT(*) c FROM questions').get().c === 0) {
  console.log('Leere Datenbank - Content wird geladen.');
  require('../scripts/seed');
}

const server = app.listen(config.port, '0.0.0.0', () => {
  const fragen = db.prepare('SELECT COUNT(*) c FROM questions').get().c;
  console.log(`SUBSUMO läuft auf Port ${config.port} (${config.env})`);
  if (!fragen) console.log('  Kein Content geladen. "npm run seed" ausführen.');
  if (config.allowUnreviewed)
    console.log('  CONTENT_ALLOW_UNREVIEWED=true - ungeprüftes Material wird ausgeliefert. ' +
                'Vor Verkauf abschalten.');
  if (config.sessionSecret.startsWith('dev-') || config.sessionSecret === 'bitte-ändern-vor-launch')
    console.log('  SESSION_SECRET ist der Standardwert. Vor Launch ändern.');
});

module.exports = { app, server };
