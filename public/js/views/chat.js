import { html, useState, useEffect, useRef, Avatar, fmtTime } from '../ui.js';
import { api } from '../api.js';
import { onEvent, getSocket } from '../socket.js';

function dmId(a, b) { return 'dm:' + [a, b].sort().join('__'); }

export function Chat({ user }) {
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState([]);
  const [channel, setChannel] = useState('team');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState('');
  const endRef = useRef(null);
  const typingTimer = useRef(null);

  // Team laden + evtl. vorausgewählten DM öffnen
  useEffect(() => {
    api.users().then(d => setUsers(d.users)).catch(() => {});
    const pending = sessionStorage.getItem('openDm');
    if (pending) { setChannel(dmId(user.id, pending)); sessionStorage.removeItem('openDm'); }
    getSocket();
    const offPres = onEvent('presence', d => setOnline(d.online || []));
    return offPres;
  }, []);

  // Nachrichten des aktiven Kanals laden
  useEffect(() => {
    let active = true;
    api.messages(channel).then(d => { if (active) setMessages(d.messages); }).catch(() => setMessages([]));
    return () => { active = false; };
  }, [channel]);

  // Echtzeit: neue Nachrichten + Tippen
  useEffect(() => {
    const offMsg = onEvent('chat:new', (m) => {
      if (m.channel === channel) setMessages(prev => [...prev, m]);
    });
    const offTyping = onEvent('typing', (d) => {
      if (d.channel === channel && d.userId !== user.id) {
        setTyping(d.name);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(''), 2200);
      }
    });
    return () => { offMsg(); offTyping(); };
  }, [channel]);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setText('');
    try { await api.sendMessage(channel, t); } catch (e) { alert(e.message); }
  }
  function onType(e) {
    setText(e.target.value);
    getSocket().emit('typing', { channel, name: user.name, userId: user.id });
  }

  const others = users.filter(u => u.id !== user.id);
  const isTeam = channel === 'team';
  const dmOther = isTeam ? null : users.find(u => channel.includes(u.id) && u.id !== user.id);
  const headName = isTeam ? 'Team-Chat' : (dmOther ? dmOther.name : 'Direktnachricht');

  return html`
    <div class="chat">
      <div class="chat__sidebar">
        <h4>Kanäle</h4>
        <button class=${'chat__channel' + (isTeam ? ' active' : '')} onClick=${() => setChannel('team')}>
          <span class="name">Team-Chat</span>
        </button>
        <h4>Direktnachrichten</h4>
        ${others.map(u => {
          const cid = dmId(user.id, u.id);
          return html`
            <button key=${u.id} class=${'chat__channel' + (channel === cid ? ' active' : '')} onClick=${() => setChannel(cid)}>
              <${Avatar} user=${u} size="sm" />
              <span class="name">${u.name}</span>
              ${online.includes(u.id) ? html`<span class="presence-dot" style=${{ marginLeft: 'auto' }}></span>` : null}
            </button>`;
        })}
        ${others.length === 0 ? html`<div class="muted small" style=${{ padding: '4px 20px' }}>Noch keine weiteren Mitglieder.</div>` : null}
      </div>

      <div class="chat__main">
        <div class="chat__head"><span class="name">${headName}</span></div>
        <div class="chat__messages">
          ${messages.length === 0 ? html`<div class="empty">Noch keine Nachrichten. Schreib die erste Nachricht.</div>` : null}
          ${messages.map(m => html`
            <div class=${'msg' + (m.authorId === user.id ? ' msg--mine' : '')} key=${m.id}>
              <${Avatar} user=${m.author} size="sm" />
              <div class="msg__body">
                <div class="head">
                  <span class="who">${m.author ? m.author.name : 'Unbekannt'}</span>
                  <span class="time">${fmtTime(m.createdAt)}</span>
                </div>
                <div class="text">${m.text}</div>
              </div>
            </div>`)}
          <div ref=${endRef}></div>
        </div>
        <div class="typing">${typing ? typing + ' schreibt …' : ''}</div>
        <div class="chat__compose">
          <textarea placeholder="Nachricht schreiben … (Enter zum Senden)" value=${text}
                    onInput=${onType}
                    onKeyDown=${e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}></textarea>
          <button class="btn" onClick=${send}>Senden</button>
        </div>
      </div>
    </div>`;
}
