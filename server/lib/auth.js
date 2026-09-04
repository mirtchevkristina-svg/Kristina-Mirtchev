'use strict';
// Sitzungen über signiertes httpOnly-Cookie. Anmeldung per Einmal-Link
// (kein Passwort - eine Zielgruppe, die alles am Handy macht, tippt keine Passwörter).
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { id, now, addDays } = require('./util');

const COOKIE = 'subsumo_sess';
const ANON_COOKIE = 'subsumo_anon';

const sign = (v) =>
  crypto.createHmac('sha256', config.sessionSecret).update(v).digest('base64url');

function setSessionCookie(res, token) {
  res.cookie(COOKIE, `${token}.${sign(token)}`, {
    httpOnly: true, sameSite: 'lax', secure: config.isProd,
    maxAge: 180 * 86400 * 1000, path: '/'
  });
}

function readSessionToken(req) {
  const raw = req.cookies[COOKIE];
  if (!raw) return null;
  const i = raw.lastIndexOf('.');
  if (i < 0) return null;
  const token = raw.slice(0, i);
  if (sign(token) !== raw.slice(i + 1)) return null;   // manipuliert
  return token;
}

/** Hängt req.user (oder null) und req.anonId (immer gesetzt) an. */
function attach(req, res, next) {
  const token = readSessionToken(req);
  req.user = null;
  if (token) {
    const row = db.prepare(`
      SELECT u.* FROM auth_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token = ? AND t.purpose = 'session' AND t.expires_at > ?
    `).get(token, now());
    if (row) req.user = row;
  }

  let anon = req.cookies[ANON_COOKIE];
  if (!anon || !/^a[\w-]{8,}$/.test(anon)) {
    anon = id('a');
    res.cookie(ANON_COOKIE, anon, {
      httpOnly: true, sameSite: 'lax', secure: config.isProd,
      maxAge: 365 * 86400 * 1000, path: '/'
    });
  }
  req.anonId = req.user?.anon_id || anon;
  next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'anmeldung_erforderlich' });
  next();
}

/** Zugriff auf kostenpflichtige Inhalte (Kapitel 7: Paywall am Tagesplan). */
function hasPaidAccess(user) {
  if (!user || user.tier === 'free') return false;
  if (!user.access_until) return false;
  return new Date(user.access_until) > new Date();
}

function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token') || req.query.token;
  if (token !== config.adminToken) return res.status(403).json({ error: 'kein_zugang' });
  next();
}

function createSession(userId) {
  const token = id('s');
  db.prepare(
    "INSERT INTO auth_tokens (token, user_id, purpose, created_at, expires_at) VALUES (?,?,'session',?,?)"
  ).run(token, userId, now(), addDays(now(), 180));
  return token;
}

module.exports = { attach, requireUser, requireAdmin, hasPaidAccess, createSession, setSessionCookie, COOKIE, ANON_COOKIE };
