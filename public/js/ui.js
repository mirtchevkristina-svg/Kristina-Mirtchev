import React from 'react';
import htm from 'htm/react';

export const html = htm;
export { React };
export const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ---- Zeit-/Datumsformate (deutsch) ----------------------------------------
export function initials(name = '') {
  return name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  if (s < 604800) return `vor ${Math.floor(s / 86400)} Tg.`;
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDate(iso, opts) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-AT', opts || { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

// ---- Kleine Komponenten ----------------------------------------------------
export function Avatar({ user, size, online }) {
  const cls = 'avatar' + (size === 'sm' ? ' avatar--sm' : size === 'lg' ? ' avatar--lg' : '');
  const style = { background: (user && user.color) || 'var(--navy-800)' };
  return html`
    <span class="row" style=${{ gap: '8px' }}>
      <span class=${cls} style=${style} title=${user ? user.name : ''}>${user ? (user.initials || initials(user.name)) : '?'}</span>
      ${online !== undefined ? html`<span class=${'presence-dot' + (online ? '' : ' presence-dot--off')}></span>` : null}
    </span>`;
}

export function Modal({ title, children, onClose, footer }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return html`
    <div class="modal__overlay" onClick=${(e) => { if (e.target.classList.contains('modal__overlay')) onClose(); }}>
      <div class="modal">
        <div class="modal__head">
          <h3>${title}</h3>
          <button class="modal__close" onClick=${onClose} aria-label="Schließen">×</button>
        </div>
        <div class="modal__body">${children}</div>
        ${footer ? html`<div class="modal__foot">${footer}</div>` : null}
      </div>
    </div>`;
}

export function Spinner() { return html`<div class="spinner"></div>`; }
export function Empty({ children }) { return html`<div class="empty">${children}</div>`; }
