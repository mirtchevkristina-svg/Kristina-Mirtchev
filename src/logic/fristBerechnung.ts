/**
 * Kernlogik Fristberechnung nach §§ 125, 126, 222 ZPO
 * (analog anwendbar in vielen weiteren Verfahren; abweichende Regeln
 * müssen pro Verfahrensart konfiguriert werden).
 *
 * Grundregeln:
 *  - § 125 Abs 1 ZPO: Nach Tagen bestimmte Fristen beginnen mit dem auf
 *    das fristauslösende Ereignis folgenden Tag.
 *  - § 125 Abs 2 ZPO: Nach Wochen/Monaten bestimmte Fristen enden an dem
 *    Tag der letzten Woche/des letzten Monats, der durch seine Benennung
 *    bzw. Zahl dem Ereignistag entspricht (bzw. bei fehlendem Tag am
 *    letzten Tag des Monats).
 *  - § 126 Abs 1 ZPO: Fällt das Fristende auf Samstag, Sonntag, gesetzl.
 *    Feiertag oder Karfreitag, endet die Frist erst am nächsten Werktag.
 *  - § 222 Abs 1 ZPO: Fällt Beginn oder Ende in die verhandlungsfreie
 *    Zeit, verlängert sich die Frist entsprechend (Umsetzung hier:
 *    Verschiebung auf den ersten Werktag nach Ende der Gerichtsferien).
 */

import type {
  Verfahrensart,
  FristErgebnis,
  Verlaengerung,
} from "../types";
import {
  liegtInGerichtsferien,
  naechsterWerktag,
} from "./feiertagsLogik";

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const zielMonat = r.getMonth() + n;
  r.setMonth(zielMonat);
  // Abfangen für Fälle wie 31.01. + 1 Monat → 28./29.02.
  if (r.getMonth() !== ((zielMonat % 12) + 12) % 12) {
    r.setDate(0); // auf letzten Tag des Vormonats zurücksetzen
  }
  return r;
}

/**
 * Berechnet das Fristende für eine gegebene Verfahrensart.
 *
 * @param ereignisDatum  Zustellung / Verkündung / sonstiges Ereignis
 *                       (Uhrzeit wird ignoriert; Berechnung auf Tagebasis).
 * @param verfahren      Verfahrensart mit Fristdauer und Konfiguration.
 */
export function berechneFristende(
  ereignisDatum: Date,
  verfahren: Verfahrensart,
): FristErgebnis {
  // Auf Mitternacht normalisieren, um Uhrzeit-Effekte auszuschließen.
  const ereignis = new Date(
    ereignisDatum.getFullYear(),
    ereignisDatum.getMonth(),
    ereignisDatum.getDate(),
  );

  // § 125 Abs 1 ZPO – Frist beginnt mit dem folgenden Tag
  const fristbeginn = addDays(ereignis, 1);

  // Nominales Fristende nach § 125 ZPO
  let nominalesEnde: Date;
  if (verfahren.fristTage != null) {
    nominalesEnde = addDays(fristbeginn, verfahren.fristTage - 1);
  } else if (verfahren.fristWochen != null) {
    // Wochenfrist: gleicher Wochentag, X Wochen später.
    // fristbeginn ist bereits der "Tag nach Ereignis" – Ende ist der
    // entsprechende Wochentag X Wochen nach Ereignis.
    nominalesEnde = addWeeks(ereignis, verfahren.fristWochen);
  } else if (verfahren.fristMonate != null) {
    nominalesEnde = addMonths(ereignis, verfahren.fristMonate);
  } else {
    throw new Error(
      `Verfahren ${verfahren.id} hat keine Fristdauer konfiguriert.`,
    );
  }

  const verlaengerungen: Verlaengerung[] = [];
  let ende = new Date(nominalesEnde);

  // § 222 ZPO – Hemmung durch verhandlungsfreie Zeit (wenn einschlägig)
  if (verfahren.gerichtsferienRelevant) {
    const inFerien = liegtInGerichtsferien(ende);
    if (inFerien) {
      const neuesEnde = addDays(inFerien.endeKonkret, 1);
      const diff = Math.round(
        (neuesEnde.getTime() - ende.getTime()) / (1000 * 60 * 60 * 24),
      );
      verlaengerungen.push({
        grund: "gerichtsferien",
        tage: diff,
        detail: `${inFerien.zeitraum.name} (${inFerien.zeitraum.rechtsgrundlage})`,
      });
      ende = neuesEnde;
    }
  }

  // § 126 ZPO / § 903 ABGB – Sa/So/Feiertag → nächster Werktag
  const verschoben = naechsterWerktag(ende);
  if (verschoben.getTime() !== ende.getTime()) {
    const diff = Math.round(
      (verschoben.getTime() - ende.getTime()) / (1000 * 60 * 60 * 24),
    );
    const wd = ende.getDay();
    const grund: Verlaengerung["grund"] =
      wd === 0 || wd === 6 ? "wochenende" : "feiertag";
    verlaengerungen.push({
      grund,
      tage: diff,
      detail:
        grund === "wochenende"
          ? "Fristende fiel auf Samstag/Sonntag (§ 126 ZPO)"
          : "Fristende fiel auf Feiertag/Karfreitag (§ 126 ZPO, § 903 ABGB)",
    });
    ende = verschoben;
  }

  return {
    fristbeginn,
    nominalesFristende: nominalesEnde,
    tatsaechlichesFristende: ende,
    verlaengerungen,
    verfahren,
  };
}

export function formatDatumAt(d: Date): string {
  const tag = String(d.getDate()).padStart(2, "0");
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  const wochentage = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return `${wochentage[d.getDay()]}, ${tag}.${monat}.${d.getFullYear()}`;
}
