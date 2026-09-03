'use strict';
const crypto = require('crypto');

const id = (prefix = '') => prefix + crypto.randomBytes(9).toString('base64url');
const now = () => new Date().toISOString();
const addDays = (d, days) => new Date(new Date(d).getTime() + days * 86400000).toISOString();
const daysBetween = (a, b) =>
  Math.round((new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)) / 86400000);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const json = (v, fallback) => { try { return JSON.parse(v); } catch { return fallback; } };

/** Fisher-Yates mit optionalem Seed, damit Diagnostic-Auswahlen reproduzierbar sind. */
function shuffle(arr, seed) {
  const a = arr.slice();
  let s = seed === undefined ? Math.floor(Math.random() * 2 ** 31) : seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { id, now, addDays, daysBetween, clamp, json, shuffle };
