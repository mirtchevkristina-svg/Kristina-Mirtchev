import { html, useState, useEffect, Avatar, Spinner, Empty, timeAgo } from '../ui.js';
import { api } from '../api.js';
import { onEvent } from '../socket.js';

const TYPES = [
  { key: 'announcement', label: 'Announcement' },
  { key: 'frage', label: 'Frage' },
  { key: 'ereignis', label: 'Ereignis' },
];

function Composer({ onCreated }) {
  const [type, setType] = useState('announcement');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() && !title.trim()) return;
    setBusy(true);
    try {
      await api.createAnnouncement({ type, title: title.trim(), text: text.trim() });
      setTitle(''); setText(''); onCreated();
    } finally { setBusy(false); }
  }

  return html`
    <div class="pin__composer">
      <div class="pin__types">
        ${TYPES.map(t => html`
          <button key=${t.key} class=${'pin__type' + (type === t.key ? ' active' : '')}
                  onClick=${() => setType(t.key)}>${t.label}</button>`)}
      </div>
      <div class="form-row">
        <input class="input" placeholder="Titel (optional)" value=${title} onInput=${e => setTitle(e.target.value)} />
      </div>
      <div class="form-row">
        <textarea class="textarea" placeholder=${type === 'frage' ? 'Deine Frage an das Team …' : 'Was gibt es Neues?'}
                  value=${text} onInput=${e => setText(e.target.value)}></textarea>
      </div>
      <div class="row between mb0">
        <span class="muted small">Sichtbar für alle Teammitglieder.</span>
        <button class="btn" onClick=${submit} disabled=${busy}>${busy ? 'Wird gepostet …' : 'An Pinnwand posten'}</button>
      </div>
    </div>`;
}

function Post({ post, user, reload }) {
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const liked = (post.likes || []).includes(user.id);
  const canDelete = post.author && (post.author.id === user.id || user.role === 'Administrator');

  const like = async () => { await api.likeAnnouncement(post.id); reload(); };
  const pin = async () => { await api.pinAnnouncement(post.id, !post.pinned); reload(); };
  const del = async () => { if (confirm('Beitrag löschen?')) { await api.deleteAnnouncement(post.id); reload(); } };
  const send = async () => { if (!comment.trim()) return; await api.commentAnnouncement(post.id, comment.trim()); setComment(''); reload(); };

  return html`
    <div class=${'post' + (post.pinned ? ' pinned' : '')}>
      <div class="post__head">
        <${Avatar} user=${post.author} />
        <div style=${{ flex: 1 }}>
          <div class="who">${post.author ? post.author.name : 'Unbekannt'}</div>
          <div class="time">${TYPES.find(t => t.key === post.type)?.label || 'Beitrag'} · ${timeAgo(post.createdAt)}${post.pinned ? ' · angeheftet' : ''}</div>
        </div>
      </div>
      ${post.title ? html`<h3>${post.title}</h3>` : null}
      ${post.text ? html`<div class="post__text">${post.text}</div>` : null}
      <div class="post__foot">
        <button class=${'post__act' + (liked ? ' liked' : '')} onClick=${like}>
          Zustimmen${post.likeCount ? ' · ' + post.likeCount : ''}
        </button>
        <button class="post__act" onClick=${() => setShowComments(s => !s)}>
          Kommentare${post.comments.length ? ' · ' + post.comments.length : ''}
        </button>
        <button class="post__act" onClick=${pin}>${post.pinned ? 'Lösen' : 'Anheften'}</button>
        ${canDelete ? html`<button class="post__act" onClick=${del}>Löschen</button>` : null}
      </div>
      ${showComments ? html`
        <div style=${{ marginTop: '14px' }}>
          ${post.comments.map(c => html`
            <div class="comment" key=${c.id}>
              <${Avatar} user=${c.author} size="sm" />
              <div>
                <div class="who">${c.author ? c.author.name : 'Unbekannt'} <span class="time muted">· ${timeAgo(c.createdAt)}</span></div>
                <div class="text">${c.text}</div>
              </div>
            </div>`)}
          <div class="row" style=${{ marginTop: '12px', gap: '8px' }}>
            <input class="input" placeholder="Kommentar schreiben …" value=${comment}
                   onInput=${e => setComment(e.target.value)}
                   onKeyDown=${e => { if (e.key === 'Enter') send(); }} />
            <button class="btn btn--sm" onClick=${send}>Senden</button>
          </div>
        </div>` : null}
    </div>`;
}

export function Pinboard({ user }) {
  const [posts, setPosts] = useState(null);
  const load = () => api.announcements().then(d => setPosts(d.announcements)).catch(() => setPosts([]));
  useEffect(() => { load(); const off = onEvent('pinboard:changed', load); return off; }, []);

  return html`
    <div style=${{ maxWidth: '760px' }}>
      <${Composer} onCreated=${load} />
      ${posts === null ? html`<${Spinner} />`
        : posts.length === 0 ? html`<${Empty}>Die Pinnwand ist noch leer. Poste das erste Announcement.<//>`
        : posts.map(p => html`<${Post} key=${p.id} post=${p} user=${user} reload=${load} />`)}
    </div>`;
}
