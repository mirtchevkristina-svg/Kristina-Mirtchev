// Kleiner API-Client mit Token-Verwaltung (localStorage).
const TOKEN_KEY = 'westtorlex_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

async function req(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  let payload;
  if (isForm) {
    payload = body; // FormData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch { /* keine JSON-Antwort */ }
  if (!res.ok) throw new Error((data && data.error) || ('Fehler ' + res.status));
  return data;
}

export const api = {
  config: () => req('GET', '/config'),
  login: (email, name) => req('POST', '/auth/login', { email, name }),
  logout: () => req('POST', '/auth/logout'),
  me: () => req('GET', '/me'),
  users: () => req('GET', '/users'),

  overview: () => req('GET', '/overview'),

  messages: (channel) => req('GET', '/messages?channel=' + encodeURIComponent(channel)),
  sendMessage: (channel, text) => req('POST', '/messages', { channel, text }),

  projects: () => req('GET', '/projects'),
  project: (id) => req('GET', '/projects/' + id),
  createProject: (data) => req('POST', '/projects', data),
  deleteProject: (id) => req('DELETE', '/projects/' + id),
  addItem: (id, data) => req('POST', `/projects/${id}/items`, data),
  updateItem: (id, itemId, data) => req('PATCH', `/projects/${id}/items/${itemId}`, data),
  deleteItem: (id, itemId) => req('DELETE', `/projects/${id}/items/${itemId}`),
  uploadFile: (id, formData) => req('POST', `/projects/${id}/upload`, formData, true),
  uploadFolder: (id, formData) => req('POST', `/projects/${id}/upload-folder`, formData, true),

  events: () => req('GET', '/events'),
  createEvent: (data) => req('POST', '/events', data),
  updateEvent: (id, data) => req('PATCH', '/events/' + id, data),
  deleteEvent: (id) => req('DELETE', '/events/' + id),

  announcements: () => req('GET', '/announcements'),
  createAnnouncement: (data) => req('POST', '/announcements', data),
  commentAnnouncement: (id, text) => req('POST', `/announcements/${id}/comment`, { text }),
  likeAnnouncement: (id) => req('POST', `/announcements/${id}/like`),
  pinAnnouncement: (id, pinned) => req('PATCH', `/announcements/${id}`, { pinned }),
  deleteAnnouncement: (id) => req('DELETE', '/announcements/' + id),

  settings: () => req('GET', '/settings'),
  saveSettings: (data) => req('PUT', '/settings', data),
  honorarnotes: () => req('GET', '/honorarnotes'),
  honorarnote: (id) => req('GET', '/honorarnotes/' + id),
  createHonorarnote: (data) => req('POST', '/honorarnotes', data),
  deleteHonorarnote: (id) => req('DELETE', '/honorarnotes/' + id),
};
