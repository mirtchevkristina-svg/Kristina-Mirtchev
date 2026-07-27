import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { Server as SocketServer } from 'socket.io';
import { db_, save, uid } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

// ----------------------------------------------------------------------------
// Konfiguration
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
// Erlaubte Kanzlei-E-Mail-Domains (nur diese dürfen sich registrieren/anmelden)
const FIRM_DOMAINS = (process.env.FIRM_EMAIL_DOMAINS || 'westtorlex.com')
  .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
// DEMO_LOGIN=true erlaubt beliebige E-Mail-Adressen (nur zum Ausprobieren!).
// Für den Echtbetrieb auf "false" setzen -> dann sind nur Kanzlei-Adressen erlaubt.
const DEMO_LOGIN = (process.env.DEMO_LOGIN || 'true').toLowerCase() !== 'false';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

const db = db_();

// ----------------------------------------------------------------------------
// Hilfsfunktionen
// ----------------------------------------------------------------------------
const now = () => new Date().toISOString();

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role || 'Mitglied', color: u.color, initials: initials(u.name) };
}
function initials(name = '') {
  return name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}
// Reduzierte, elegante Palette – gedeckte Blau-/Grautöne (keine bunten Farben)
const COLORS = ['#0a1f3c', '#1c3a5e', '#2c3e50', '#334155', '#3a4a5a', '#243b53', '#1f2d3d', '#42556b'];
function pickColor() { return COLORS[Math.floor((db.users.length) % COLORS.length)]; }

function findUserByToken(token) {
  if (!token) return null;
  const session = db.sessions.find(s => s.token === token);
  if (!session) return null;
  return db.users.find(u => u.id === session.userId) || null;
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || '');
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
  req.user = user;
  req.token = token;
  next();
}

function broadcast(event, payload) {
  io.emit(event, payload);
}

// ----------------------------------------------------------------------------
// Auth
// ----------------------------------------------------------------------------
app.get('/api/config', (req, res) => {
  res.json({ firmDomains: FIRM_DOMAINS, demoLogin: DEMO_LOGIN, firmName: 'WESTTOR LEX' });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  let name = String(req.body.name || '').trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
  }
  const domain = email.split('@')[1];
  if (!DEMO_LOGIN && !FIRM_DOMAINS.includes(domain)) {
    return res.status(403).json({
      error: `Zugang nur mit Kanzlei-E-Mail-Adresse (@${FIRM_DOMAINS.join(', @')}).`
    });
  }

  let user = db.users.find(u => u.email === email);
  if (!user) {
    if (!name) name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    user = {
      id: uid('u_'), email, name,
      role: db.users.length === 0 ? 'Administrator' : 'Mitglied',
      color: pickColor(), createdAt: now()
    };
    db.users.push(user);
  } else if (name && name !== user.name) {
    user.name = name;
  }

  const token = uid('t_') + uid('');
  db.sessions.push({ token, userId: user.id });
  save();
  broadcast('team:changed', {});
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/logout', auth, (req, res) => {
  db.sessions = db.sessions.filter(s => s.token !== req.token);
  save();
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/users', auth, (req, res) => {
  res.json({ users: db.users.map(publicUser) });
});

// ----------------------------------------------------------------------------
// Chat (Team + Direktnachrichten)
// ----------------------------------------------------------------------------
function canSeeChannel(user, channel) {
  if (channel === 'team') return true;
  if (channel.startsWith('dm:')) {
    const ids = channel.slice(3).split('__');
    return ids.includes(user.id);
  }
  return false;
}
export function dmChannel(a, b) { return 'dm:' + [a, b].sort().join('__'); }

app.get('/api/messages', auth, (req, res) => {
  const channel = String(req.query.channel || 'team');
  if (!canSeeChannel(req.user, channel)) return res.status(403).json({ error: 'Kein Zugriff' });
  const messages = db.messages
    .filter(m => m.channel === channel)
    .slice(-200)
    .map(m => ({ ...m, author: publicUser(db.users.find(u => u.id === m.authorId)) }));
  res.json({ messages });
});

app.post('/api/messages', auth, (req, res) => {
  const channel = String(req.body.channel || 'team');
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Leere Nachricht' });
  if (!canSeeChannel(req.user, channel)) return res.status(403).json({ error: 'Kein Zugriff' });
  const msg = { id: uid('m_'), channel, authorId: req.user.id, text, createdAt: now() };
  db.messages.push(msg);
  save();
  const payload = { ...msg, author: publicUser(req.user) };
  broadcast('chat:new', payload);
  res.json({ message: payload });
});

// ----------------------------------------------------------------------------
// Projekte
// ----------------------------------------------------------------------------
app.get('/api/projects', auth, (req, res) => {
  const projects = db.projects.map(p => ({
    ...p,
    creator: publicUser(db.users.find(u => u.id === p.createdBy)),
    itemCount: db.projectItems.filter(i => i.projectId === p.id).length,
    openDeadlines: db.projectItems.filter(i => i.projectId === p.id && i.type === 'frist' && i.status !== 'erledigt').length,
  }));
  res.json({ projects });
});

app.post('/api/projects', auth, (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name fehlt' });
  const project = {
    id: uid('p_'), name,
    description: String(req.body.description || '').trim(),
    color: req.body.color || COLORS[db.projects.length % COLORS.length],
    createdBy: req.user.id, createdAt: now()
  };
  db.projects.push(project);
  save();
  broadcast('projects:changed', {});
  res.json({ project });
});

app.get('/api/projects/:id', auth, (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
  const items = db.projectItems
    .filter(i => i.projectId === project.id)
    .map(i => ({ ...i, creator: publicUser(db.users.find(u => u.id === i.createdBy)) }));
  res.json({
    project: { ...project, creator: publicUser(db.users.find(u => u.id === project.createdBy)) },
    items
  });
});

app.delete('/api/projects/:id', auth, (req, res) => {
  db.projects = db.projects.filter(p => p.id !== req.params.id);
  db.projectItems = db.projectItems.filter(i => i.projectId !== req.params.id);
  save();
  broadcast('projects:changed', {});
  res.json({ ok: true });
});

const VALID_ITEM_TYPES = ['frist', 'case', 'dokument', 'notiz', 'aufgabe', 'ordner'];
app.post('/api/projects/:id/items', auth, (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
  const type = VALID_ITEM_TYPES.includes(req.body.type) ? req.body.type : 'notiz';
  const item = {
    id: uid('it_'), projectId: project.id, type,
    title: String(req.body.title || '').trim() || '(ohne Titel)',
    content: String(req.body.content || '').trim(),
    dueDate: req.body.dueDate || null,
    status: req.body.status || 'offen',
    fileName: null, fileUrl: null,
    createdBy: req.user.id, createdAt: now()
  };
  db.projectItems.push(item);
  save();
  broadcast('projects:changed', { projectId: project.id });
  res.json({ item: { ...item, creator: publicUser(req.user) } });
});

app.patch('/api/projects/:id/items/:itemId', auth, (req, res) => {
  const item = db.projectItems.find(i => i.id === req.params.itemId && i.projectId === req.params.id);
  if (!item) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
  for (const key of ['title', 'content', 'dueDate', 'status', 'type']) {
    if (key in req.body) item[key] = req.body[key];
  }
  save();
  broadcast('projects:changed', { projectId: item.projectId });
  res.json({ item: { ...item, creator: publicUser(db.users.find(u => u.id === item.createdBy)) } });
});

app.delete('/api/projects/:id/items/:itemId', auth, (req, res) => {
  db.projectItems = db.projectItems.filter(i => !(i.id === req.params.itemId && i.projectId === req.params.id));
  save();
  broadcast('projects:changed', { projectId: req.params.id });
  res.json({ ok: true });
});

// Datei-Upload -> erzeugt automatisch einen "Dokument"-Eintrag im Projekt
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, uid('') + '__' + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.post('/api/projects/:id/upload', auth, upload.single('file'), (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const item = {
    id: uid('it_'), projectId: project.id, type: 'dokument',
    title: req.file.originalname,
    content: String(req.body.content || '').trim(),
    dueDate: null, status: 'offen',
    fileName: req.file.originalname,
    fileUrl: '/uploads/' + req.file.filename,
    createdBy: req.user.id, createdAt: now()
  };
  db.projectItems.push(item);
  save();
  broadcast('projects:changed', { projectId: project.id });
  res.json({ item: { ...item, creator: publicUser(req.user) } });
});

// Ordner-Upload -> erzeugt EINEN "Ordner"-Eintrag mit allen enthaltenen Dateien
// (Unterordner-Struktur bleibt über die relativen Pfade erhalten).
app.post('/api/projects/:id/upload-folder', auth, upload.array('files', 500), (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Keine Dateien' });

  let relPaths = [];
  try { relPaths = JSON.parse(req.body.paths || '[]'); } catch { relPaths = []; }
  const folderName = String(req.body.folderName || 'Ordner').trim() || 'Ordner';

  const files = req.files.map((f, idx) => ({
    id: uid('f_'),
    name: f.originalname,
    relPath: relPaths[idx] || f.originalname,
    fileUrl: '/uploads/' + f.filename,
    size: f.size,
  }));

  const item = {
    id: uid('it_'), projectId: project.id, type: 'ordner',
    title: folderName,
    content: '', dueDate: null, status: 'offen',
    fileName: null, fileUrl: null,
    files,
    createdBy: req.user.id, createdAt: now()
  };
  db.projectItems.push(item);
  save();
  broadcast('projects:changed', { projectId: project.id });
  res.json({ item: { ...item, creator: publicUser(req.user) } });
});

// ----------------------------------------------------------------------------
// Terminkalender
// ----------------------------------------------------------------------------
app.get('/api/events', auth, (req, res) => {
  const events = db.events.map(e => ({
    ...e,
    creator: publicUser(db.users.find(u => u.id === e.createdBy)),
    project: e.projectId ? db.projects.find(p => p.id === e.projectId) || null : null
  }));
  res.json({ events });
});

app.post('/api/events', auth, (req, res) => {
  const title = String(req.body.title || '').trim();
  const start = req.body.start;
  if (!title || !start) return res.status(400).json({ error: 'Titel und Startzeit erforderlich' });
  const event = {
    id: uid('ev_'), title,
    description: String(req.body.description || '').trim(),
    start, end: req.body.end || start,
    allDay: !!req.body.allDay,
    projectId: req.body.projectId || null,
    createdBy: req.user.id, createdAt: now()
  };
  db.events.push(event);
  save();
  broadcast('calendar:changed', {});
  res.json({ event });
});

app.patch('/api/events/:id', auth, (req, res) => {
  const event = db.events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Termin nicht gefunden' });
  for (const key of ['title', 'description', 'start', 'end', 'allDay', 'projectId']) {
    if (key in req.body) event[key] = req.body[key];
  }
  save();
  broadcast('calendar:changed', {});
  res.json({ event });
});

app.delete('/api/events/:id', auth, (req, res) => {
  db.events = db.events.filter(e => e.id !== req.params.id);
  save();
  broadcast('calendar:changed', {});
  res.json({ ok: true });
});

// ----------------------------------------------------------------------------
// Pinnwand (Announcements & Fragen)
// ----------------------------------------------------------------------------
function decorateAnnouncement(a) {
  return {
    ...a,
    author: publicUser(db.users.find(u => u.id === a.authorId)),
    likeCount: (a.likes || []).length,
    comments: (a.comments || []).map(c => ({
      ...c, author: publicUser(db.users.find(u => u.id === c.authorId))
    }))
  };
}

app.get('/api/announcements', auth, (req, res) => {
  const items = [...db.announcements]
    .sort((a, b) => (b.pinned - a.pinned) || (b.createdAt < a.createdAt ? -1 : 1))
    .map(decorateAnnouncement);
  res.json({ announcements: items });
});

app.post('/api/announcements', auth, (req, res) => {
  const text = String(req.body.text || '').trim();
  const title = String(req.body.title || '').trim();
  if (!text && !title) return res.status(400).json({ error: 'Inhalt fehlt' });
  const type = ['announcement', 'frage', 'ereignis'].includes(req.body.type) ? req.body.type : 'announcement';
  const item = {
    id: uid('an_'), type, title, text,
    authorId: req.user.id, pinned: false,
    likes: [], comments: [], createdAt: now()
  };
  db.announcements.push(item);
  save();
  broadcast('pinboard:changed', {});
  res.json({ announcement: decorateAnnouncement(item) });
});

app.post('/api/announcements/:id/comment', auth, (req, res) => {
  const a = db.announcements.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Nicht gefunden' });
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Leerer Kommentar' });
  a.comments = a.comments || [];
  a.comments.push({ id: uid('c_'), authorId: req.user.id, text, createdAt: now() });
  save();
  broadcast('pinboard:changed', {});
  res.json({ announcement: decorateAnnouncement(a) });
});

app.post('/api/announcements/:id/like', auth, (req, res) => {
  const a = db.announcements.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Nicht gefunden' });
  a.likes = a.likes || [];
  const idx = a.likes.indexOf(req.user.id);
  if (idx === -1) a.likes.push(req.user.id); else a.likes.splice(idx, 1);
  save();
  broadcast('pinboard:changed', {});
  res.json({ announcement: decorateAnnouncement(a) });
});

app.patch('/api/announcements/:id', auth, (req, res) => {
  const a = db.announcements.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Nicht gefunden' });
  if ('pinned' in req.body) a.pinned = !!req.body.pinned;
  save();
  broadcast('pinboard:changed', {});
  res.json({ announcement: decorateAnnouncement(a) });
});

app.delete('/api/announcements/:id', auth, (req, res) => {
  const a = db.announcements.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Nicht gefunden' });
  if (a.authorId !== req.user.id && (req.user.role !== 'Administrator')) {
    return res.status(403).json({ error: 'Nur der Autor oder ein Administrator darf löschen.' });
  }
  db.announcements = db.announcements.filter(x => x.id !== req.params.id);
  save();
  broadcast('pinboard:changed', {});
  res.json({ ok: true });
});

// ----------------------------------------------------------------------------
// Kanzlei-Stammdaten (für Honorarnoten) – Standardwerte aus der Vorlage
// ----------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  firmName: 'WESTTOR HEHENBERGER LEX',
  firmSubtitle: 'Rechtsanwalt GmbH',
  firmAddress: 'Elisabethstraße 13/6, 1010 Wien, Österreich',
  firmRegister: 'Firmenbuchnummer FN 657196 s',
  defaultRate: 350,
  bankHolder: 'WESTTOR Hehenberger LEX Rechtsanwalt GmbH',
  iban: 'AT13 2011 1854 5115 1800',
  bic: 'GIBAATWWXXX',
  bank: 'Erste Bank der oesterreichischen Sparkassen AG',
  signature: 'WESTTOR Hehenberger LEX Rechtsanwalt GmbH',
};
function getSettings() {
  if (!db.settings) { db.settings = { ...DEFAULT_SETTINGS }; save(); }
  return db.settings;
}

app.get('/api/settings', auth, (req, res) => res.json({ settings: getSettings() }));
app.put('/api/settings', auth, (req, res) => {
  db.settings = { ...getSettings(), ...(req.body || {}) };
  save();
  res.json({ settings: db.settings });
});

// ----------------------------------------------------------------------------
// Honorarnoten
// ----------------------------------------------------------------------------
function computeHonorar(positions, rate) {
  let net = 0, minutes = 0;
  const pos = (positions || []).map(p => {
    const h = Number(p.hours) || 0, m = Number(p.minutes) || 0;
    minutes += h * 60 + m;
    const amount = (p.amount != null && p.amount !== '')
      ? Number(p.amount)
      : Math.round((h + m / 60) * Number(rate) * 100) / 100;
    net += amount;
    return { ...p, hours: h, minutes: m, amount };
  });
  const vat = Math.round(net * 0.20 * 100) / 100;
  return { positions: pos, net: Math.round(net * 100) / 100, vat, gross: Math.round((net + vat) * 100) / 100, totalMinutes: minutes };
}

app.get('/api/honorarnotes', auth, (req, res) => {
  const items = [...db.honorarnotes]
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1))
    .map(h => ({ ...h, creator: publicUser(db.users.find(u => u.id === h.createdBy)) }));
  res.json({ honorarnotes: items });
});

app.get('/api/honorarnotes/:id', auth, (req, res) => {
  const h = db.honorarnotes.find(x => x.id === req.params.id);
  if (!h) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ honorarnote: { ...h, creator: publicUser(db.users.find(u => u.id === h.createdBy)) } });
});

app.post('/api/honorarnotes', auth, (req, res) => {
  const b = req.body || {};
  const settings = getSettings();
  const rate = Number(b.rate) || settings.defaultRate || 350;
  const totals = computeHonorar(b.positions, rate);

  let number = Number(b.number);
  if (!number) { db.counters.honorar = (db.counters.honorar || 0) + 1; number = db.counters.honorar; }
  else { db.counters.honorar = Math.max(db.counters.honorar || 0, number); }

  const hn = {
    id: uid('hn_'), number,
    date: b.date || now().slice(0, 10),
    clientName: String(b.clientName || '').trim(),
    clientAddress: String(b.clientAddress || '').trim(),
    matter: String(b.matter || '').trim(),
    aktenzeichen: String(b.aktenzeichen || '').trim(),
    rate,
    ...totals,
    firm: { name: settings.firmName, subtitle: settings.firmSubtitle, address: settings.firmAddress, register: settings.firmRegister },
    bank: { holder: settings.bankHolder, iban: settings.iban, bic: settings.bic, bank: settings.bank },
    signature: settings.signature,
    createdBy: req.user.id, createdAt: now(),
  };
  db.honorarnotes.push(hn);
  save();
  res.json({ honorarnote: { ...hn, creator: publicUser(req.user) } });
});

app.delete('/api/honorarnotes/:id', auth, (req, res) => {
  db.honorarnotes = db.honorarnotes.filter(x => x.id !== req.params.id);
  save();
  res.json({ ok: true });
});

// ----------------------------------------------------------------------------
// Dashboard-Übersicht (aggregierte Daten für die Startseite)
// ----------------------------------------------------------------------------
app.get('/api/overview', auth, (req, res) => {
  const upcoming = [...db.events]
    .filter(e => new Date(e.end || e.start) >= new Date(Date.now() - 3600e3))
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, 5)
    .map(e => ({ ...e, creator: publicUser(db.users.find(u => u.id === e.createdBy)) }));
  const deadlines = db.projectItems
    .filter(i => i.type === 'frist' && i.status !== 'erledigt' && i.dueDate)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 5)
    .map(i => ({ ...i, project: db.projects.find(p => p.id === i.projectId) || null }));
  const latestPosts = [...db.announcements]
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : 1))
    .slice(0, 4)
    .map(decorateAnnouncement);
  res.json({
    stats: {
      members: db.users.length,
      projects: db.projects.length,
      events: db.events.length,
      documents: db.projectItems.filter(i => i.type === 'dokument').length,
    },
    upcoming, deadlines, latestPosts
  });
});

// ----------------------------------------------------------------------------
// Socket.IO – Echtzeit & Präsenz
// ----------------------------------------------------------------------------
const online = new Map(); // socketId -> userId
function emitPresence() {
  const ids = [...new Set([...online.values()])];
  io.emit('presence', { online: ids });
}
io.on('connection', (socket) => {
  socket.on('identify', (token) => {
    const user = findUserByToken(token);
    if (user) { online.set(socket.id, user.id); emitPresence(); }
  });
  socket.on('typing', (data) => socket.broadcast.emit('typing', data));
  socket.on('disconnect', () => { online.delete(socket.id); emitPresence(); });
});

// SPA-Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`\n  WESTTOR LEX Dashboard läuft auf  http://localhost:${PORT}`);
  console.log(`  Erlaubte Domains: ${FIRM_DOMAINS.join(', ')}`);
  console.log(`  DEMO-Login (beliebige E-Mail): ${DEMO_LOGIN ? 'AN (zum Testen)' : 'AUS'}\n`);
});
