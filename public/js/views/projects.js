import { html, useState, useEffect, useRef, Avatar, Spinner, Empty, Modal, fmtDate, timeAgo } from '../ui.js';
import { api } from '../api.js';
import { onEvent } from '../socket.js';

const ITEM_TYPES = [
  { key: 'frist', label: 'Frist' },
  { key: 'case', label: 'Case' },
  { key: 'aufgabe', label: 'Aufgabe' },
  { key: 'notiz', label: 'Notiz' },
];
const TYPE_LABEL = { frist: 'Frist', case: 'Case', dokument: 'Dokument', notiz: 'Notiz', aufgabe: 'Aufgabe', ordner: 'Ordner' };
const TYPE_CLASS = { frist: 'tag--frist', case: 'tag--case', dokument: 'tag--dokument', notiz: '', aufgabe: '', ordner: 'tag--dokument' };

function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

// ---- Projekt anlegen -------------------------------------------------------
function NewProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try { await api.createProject({ name: name.trim(), description: description.trim() }); onCreated(); onClose(); }
    finally { setBusy(false); }
  }
  return html`
    <${Modal} title="Neues Projekt" onClose=${onClose}
      footer=${html`
        <button class="btn btn--ghost btn--sm" onClick=${onClose}>Abbrechen</button>
        <button class="btn btn--sm" onClick=${submit} disabled=${busy}>Projekt anlegen</button>`}>
      <div class="form-row">
        <label>Projektname</label>
        <input class="input" value=${name} onInput=${e => setName(e.target.value)} placeholder="z. B. Muster GmbH ./. Bau AG" autoFocus />
      </div>
      <div class="form-row">
        <label>Kurzbeschreibung</label>
        <textarea class="textarea" value=${description} onInput=${e => setDescription(e.target.value)}
                  placeholder="Worum geht es in diesem Projekt / Akt?"></textarea>
      </div>
    <//>`;
}

// ---- Eintrag hinzufügen ----------------------------------------------------
function NewItemModal({ projectId, onClose, onCreated }) {
  const [type, setType] = useState('frist');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await api.addItem(projectId, { type, title: title.trim(), content: content.trim(), dueDate: dueDate || null });
      onCreated(); onClose();
    } finally { setBusy(false); }
  }
  return html`
    <${Modal} title="Eintrag hinzufügen" onClose=${onClose}
      footer=${html`
        <button class="btn btn--ghost btn--sm" onClick=${onClose}>Abbrechen</button>
        <button class="btn btn--sm" onClick=${submit} disabled=${busy}>Hinzufügen</button>`}>
      <div class="form-row">
        <label>Art des Eintrags</label>
        <div class="pin__types">
          ${ITEM_TYPES.map(t => html`
            <button key=${t.key} class=${'pin__type' + (type === t.key ? ' active' : '')}
                    onClick=${() => setType(t.key)}>${t.label}</button>`)}
        </div>
      </div>
      <div class="form-row">
        <label>Titel</label>
        <input class="input" value=${title} onInput=${e => setTitle(e.target.value)}
               placeholder=${type === 'frist' ? 'z. B. Berufungsfrist' : 'Kurzer Titel'} autoFocus />
      </div>
      ${type === 'frist' ? html`
        <div class="form-row">
          <label>Fällig am</label>
          <input class="input" type="date" value=${dueDate} onInput=${e => setDueDate(e.target.value)} />
        </div>` : null}
      <div class="form-row">
        <label>Details</label>
        <textarea class="textarea" value=${content} onInput=${e => setContent(e.target.value)}
                  placeholder="Weitere Informationen …"></textarea>
      </div>
    <//>`;
}

// ---- Ordner-Eintrag (aufklappbar, mit Unterordner-Struktur) ----------------
function FolderItem({ item, onDelete }) {
  const [open, setOpen] = useState(false);
  const files = item.files || [];
  // Nach Unterordner gruppieren
  const byDir = {};
  files.forEach(f => {
    const parts = (f.relPath || f.name).split('/');
    const dir = parts.length > 1 ? parts.slice(1, -1).join('/') || '/' : '/';
    (byDir[dir] ||= []).push(f);
  });
  const dirs = Object.keys(byDir).sort();

  return html`
    <div class="item">
      <span class="tag tag--dokument">Ordner</span>
      <div class="item__main">
        <div class="item__title">
          <button class="btn--text" style=${{ padding: 0, fontWeight: 500 }} onClick=${() => setOpen(o => !o)}>
            ${open ? '▾' : '▸'} ${item.title}
          </button>
        </div>
        <div class="item__meta">
          <span>${files.length} Datei${files.length === 1 ? '' : 'en'}</span>
          <span>${item.creator ? item.creator.name : ''}</span>
          <span>${timeAgo(item.createdAt)}</span>
        </div>
        ${open ? html`
          <div style=${{ marginTop: '10px', borderLeft: '2px solid var(--line)', paddingLeft: '14px' }}>
            ${dirs.map(dir => html`
              <div key=${dir} style=${{ marginBottom: '8px' }}>
                ${dir !== '/' ? html`<div class="eyebrow" style=${{ margin: '6px 0 4px' }}>${dir}/</div>` : null}
                ${byDir[dir].map(f => html`
                  <div key=${f.id} style=${{ padding: '3px 0' }}>
                    <a class="file" href=${f.fileUrl} target="_blank" rel="noopener">${f.name}</a>
                    <span class="muted small"> · ${fmtBytes(f.size)}</span>
                  </div>`)}
              </div>`)}
          </div>` : null}
      </div>
      <div class="row" style=${{ gap: '4px' }}>
        <button class="btn--text" onClick=${() => onDelete(item)}>Löschen</button>
      </div>
    </div>`;
}

// ---- Projekt-Detailansicht -------------------------------------------------
function ProjectDetail({ projectId, user, onBack }) {
  const [data, setData] = useState(null);
  const [showItem, setShowItem] = useState(false);
  const [uploading, setUploading] = useState('');
  const fileRef = useRef(null);
  const folderRef = useRef(null);

  const load = () => api.project(projectId).then(setData).catch(() => {});
  useEffect(() => {
    load();
    const off = onEvent('projects:changed', (p) => { if (!p || !p.projectId || p.projectId === projectId) load(); });
    return off;
  }, [projectId]);
  // Ordner-Auswahl im Browser ermöglichen (webkitdirectory ist nicht als JSX-Attribut setzbar)
  useEffect(() => {
    if (folderRef.current) {
      folderRef.current.setAttribute('webkitdirectory', '');
      folderRef.current.setAttribute('directory', '');
      folderRef.current.setAttribute('mozdirectory', '');
    }
  }, [data]);

  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading('Datei');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.uploadFile(projectId, fd);
      load();
    } catch (err) { alert('Upload fehlgeschlagen: ' + err.message); }
    finally { setUploading(''); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function uploadFolder(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const folderName = (files[0].webkitRelativePath || files[0].name).split('/')[0] || 'Ordner';
    setUploading('Ordner „' + folderName + '“');
    try {
      const fd = new FormData();
      const paths = [];
      files.forEach(f => { fd.append('files', f); paths.push(f.webkitRelativePath || f.name); });
      fd.append('paths', JSON.stringify(paths));
      fd.append('folderName', folderName);
      await api.uploadFolder(projectId, fd);
      load();
    } catch (err) { alert('Ordner-Upload fehlgeschlagen: ' + err.message); }
    finally { setUploading(''); if (folderRef.current) folderRef.current.value = ''; }
  }

  async function toggleStatus(item) {
    await api.updateItem(projectId, item.id, { status: item.status === 'erledigt' ? 'offen' : 'erledigt' });
    load();
  }
  async function delItem(item) {
    if (confirm('Eintrag löschen?')) { await api.deleteItem(projectId, item.id); load(); }
  }

  if (!data) return html`<${Spinner} />`;
  const { project, items } = data;
  const grouped = {};
  for (const it of items) (grouped[it.type] ||= []).push(it);
  const order = ['frist', 'case', 'aufgabe', 'ordner', 'dokument', 'notiz'];

  return html`
    <div>
      <button class="proj-detail__back" onClick=${onBack}>← Alle Projekte</button>
      <div class="section-head">
        <div>
          <div class="proj-card__rule"></div>
          <h2>${project.name}</h2>
          ${project.description ? html`<p class="muted" style=${{ maxWidth: '640px', marginTop: '6px' }}>${project.description}</p>` : null}
          <div class="meta muted small" style=${{ marginTop: '8px' }}>
            Angelegt von ${project.creator ? project.creator.name : '—'} · ${timeAgo(project.createdAt)}
          </div>
        </div>
        <div class="row">
          <button class="btn btn--ghost btn--sm" onClick=${() => fileRef.current && fileRef.current.click()} disabled=${!!uploading}>
            Dokument
          </button>
          <button class="btn btn--ghost btn--sm" onClick=${() => folderRef.current && folderRef.current.click()} disabled=${!!uploading}>
            ${uploading ? uploading + ' lädt …' : 'Ganzen Ordner'}
          </button>
          <button class="btn btn--sm" onClick=${() => setShowItem(true)}>Eintrag hinzufügen</button>
          <input ref=${fileRef} type="file" style=${{ display: 'none' }} onChange=${upload} />
          <input ref=${folderRef} type="file" multiple style=${{ display: 'none' }} onChange=${uploadFolder} />
        </div>
      </div>

      ${items.length === 0 ? html`<div class="card"><div class="card__body"><${Empty}>Noch keine Einträge. Füge Fristen, Cases oder Dokumente hinzu.<//></div></div>` : html`
        <div class="card">
          <div class="card__body">
            ${order.filter(t => grouped[t]).map(t => html`
              <div key=${t} style=${{ marginBottom: '10px' }}>
                <div class="eyebrow" style=${{ margin: '10px 0 4px' }}>${TYPE_LABEL[t]}${grouped[t].length > 1 ? (t === 'case' ? 's' : t === 'ordner' ? '' : 'e') : ''}</div>
                ${grouped[t].map(it => it.type === 'ordner'
                  ? html`<${FolderItem} key=${it.id} item=${it} onDelete=${delItem} />`
                  : html`
                  <div class="item" key=${it.id}>
                    <span class=${'tag ' + (TYPE_CLASS[it.type] || '')}>${TYPE_LABEL[it.type]}</span>
                    <div class="item__main">
                      <div class=${'item__title' + (it.status === 'erledigt' ? ' done' : '')}>${it.title}</div>
                      ${it.content ? html`<div class="item__content">${it.content}</div>` : null}
                      ${it.fileUrl ? html`<div style=${{ marginTop: '4px' }}><a class="file" href=${it.fileUrl} target="_blank" rel="noopener">Datei öffnen · ${it.fileName}</a></div>` : null}
                      <div class="item__meta">
                        ${it.dueDate ? html`<span>fällig ${fmtDate(it.dueDate)}</span>` : null}
                        <span>${it.creator ? it.creator.name : ''}</span>
                        <span>${timeAgo(it.createdAt)}</span>
                      </div>
                    </div>
                    <div class="row" style=${{ gap: '4px' }}>
                      ${(it.type === 'frist' || it.type === 'aufgabe') ? html`
                        <button class="btn--text" onClick=${() => toggleStatus(it)}>${it.status === 'erledigt' ? 'Wieder öffnen' : 'Erledigt'}</button>` : null}
                      <button class="btn--text" onClick=${() => delItem(it)}>Löschen</button>
                    </div>
                  </div>`)}
              </div>`)}
          </div>
        </div>`}

      ${showItem ? html`<${NewItemModal} projectId=${projectId} onClose=${() => setShowItem(false)} onCreated=${load} />` : null}
    </div>`;
}

// ---- Projektliste ----------------------------------------------------------
export function Projects({ user }) {
  const [projects, setProjects] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = () => api.projects().then(d => setProjects(d.projects)).catch(() => setProjects([]));
  useEffect(() => { load(); const off = onEvent('projects:changed', load); return off; }, []);

  if (openId) return html`<${ProjectDetail} projectId=${openId} user=${user} onBack=${() => { setOpenId(null); load(); }} />`;

  return html`
    <div>
      <div class="section-head">
        <p class="muted" style=${{ maxWidth: '560px' }}>Jedes Teammitglied kann ein neues Projekt eröffnen und darin Fristen, Cases, Aufgaben und Dokumente verwalten.</p>
        <button class="btn" onClick=${() => setShowNew(true)}>Neues Projekt</button>
      </div>
      ${projects === null ? html`<${Spinner} />`
        : projects.length === 0 ? html`<div class="card"><div class="card__body"><${Empty}>Noch keine Projekte. Eröffne das erste Projekt.<//></div></div>`
        : html`
          <div class="grid grid--cards">
            ${projects.map(p => html`
              <button class="proj-card" key=${p.id} onClick=${() => setOpenId(p.id)}>
                <div class="proj-card__rule"></div>
                <h3>${p.name}</h3>
                <div class="desc">${p.description || 'Keine Beschreibung'}</div>
                <div class="foot">
                  <span>${p.itemCount} Einträge${p.openDeadlines ? ' · ' + p.openDeadlines + ' offene Frist' + (p.openDeadlines > 1 ? 'en' : '') : ''}</span>
                  <span>${p.creator ? p.creator.name : ''}</span>
                </div>
              </button>`)}
          </div>`}
      ${showNew ? html`<${NewProjectModal} onClose=${() => setShowNew(false)} onCreated=${load} />` : null}
    </div>`;
}
