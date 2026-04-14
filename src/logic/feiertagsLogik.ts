/**
 * Berechnung österreichischer Feiertage und gerichtlicher Fristentage
 * ("dies non").
 *
 * Rechtsgrundlagen:
 *  - § 7 ARG (gesetzliche Feiertage)
 *  - § 903 ABGB (Samstage, Sonntage, Karfreitag, gesetzliche Feiertage
 *               gelten als fristhemmende Tage am Fristende)
 *  - § 222 ZPO (verhandlungsfreie Zeit: 15.07.–17.08., 24.12.–06.01.)
 */

import feiertageData from "../data/feiertage/feiertage.json";
import type { Feiertag, GerichtsferienZeitraum } from "../types";

const FEIERTAGE: Feiertag[] = feiertageData.feiertage as Feiertag[];
const GERICHTSFERIEN: GerichtsferienZeitraum[] =
  feiertageData.gerichtsferien as GerichtsferienZeitraum[];

/**
 * Berechnet Ostersonntag nach dem Gaußschen (anonymen Gregorianischen)
 * Algorithmus. Rückgabe: Date im UTC-neutralen lokalen Kalender.
 */
export function ostersonntag(jahr: number): Date {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(jahr, monat - 1, tag);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Liefert alle Feiertage eines Jahres als Map "YYYY-MM-DD" -> Feiertag.
 */
export function feiertageJahr(jahr: number): Map<string, Feiertag> {
  const ostern = ostersonntag(jahr);
  const map = new Map<string, Feiertag>();
  for (const f of FEIERTAGE) {
    let datum: Date;
    if (f.fix) {
      const [mm, dd] = f.fix.split("-").map(Number);
      datum = new Date(jahr, mm - 1, dd);
    } else if (typeof f.osterOffset === "number") {
      datum = addDays(ostern, f.osterOffset);
    } else {
      continue;
    }
    map.set(isoDay(datum), f);
  }
  return map;
}

/**
 * Ist der angegebene Tag nach § 903 ABGB ein "dies non"
 * (Samstag, Sonntag, Karfreitag, gesetzlicher Feiertag)?
 */
export function istDiesNon(d: Date): boolean {
  const wd = d.getDay(); // 0 = So, 6 = Sa
  if (wd === 0 || wd === 6) return true;
  const map = feiertageJahr(d.getFullYear());
  const eintrag = map.get(isoDay(d));
  return !!eintrag?.abgbFeiertag;
}

/**
 * Rückt das Datum – falls nötig – auf den nächsten Werktag vor
 * (§ 126 Abs 1 ZPO, § 33 Abs 2 AVG).
 */
export function naechsterWerktag(d: Date): Date {
  let cur = new Date(d);
  while (istDiesNon(cur)) cur = addDays(cur, 1);
  return cur;
}

/**
 * Ermittelt den Gerichtsferien-Zeitraum, in den ein Datum fällt – oder null.
 * Berücksichtigt Jahreswechsel (24.12.–06.01.).
 */
export function liegtInGerichtsferien(
  d: Date,
): { zeitraum: GerichtsferienZeitraum; endeKonkret: Date } | null {
  for (const gf of GERICHTSFERIEN) {
    const [vm, vd] = gf.von.split("-").map(Number);
    const [bm, bd] = gf.bis.split("-").map(Number);
    const jahr = d.getFullYear();

    if (vm <= bm) {
      // gleicher Jahreszeitraum
      const von = new Date(jahr, vm - 1, vd);
      const bis = new Date(jahr, bm - 1, bd);
      if (d >= von && d <= bis) return { zeitraum: gf, endeKonkret: bis };
    } else {
      // überlappt Jahreswechsel (z. B. 24.12.–06.01.)
      const vonAktuell = new Date(jahr, vm - 1, vd);
      const bisNaechstes = new Date(jahr + 1, bm - 1, bd);
      if (d >= vonAktuell && d <= bisNaechstes) {
        return { zeitraum: gf, endeKonkret: bisNaechstes };
      }
      const vonVorjahr = new Date(jahr - 1, vm - 1, vd);
      const bisAktuell = new Date(jahr, bm - 1, bd);
      if (d >= vonVorjahr && d <= bisAktuell) {
        return { zeitraum: gf, endeKonkret: bisAktuell };
      }
    }
  }
  return null;
}
