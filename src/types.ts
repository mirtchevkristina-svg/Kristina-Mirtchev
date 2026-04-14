/**
 * Gemeinsame Typen für Fristen-, Gebühren- und Zuständigkeitsmodule.
 */

export type Rechtsgebiet =
  | "zivil"
  | "straf"
  | "verwaltung"
  | "arbeit"
  | "miete"
  | "insolvenz"
  | "exekution";

export type FristEinheit = "tage" | "wochen" | "monate";

/**
 * Startzeitpunkt der Frist:
 *  - "zustellung": Fristlauf beginnt mit dem der Zustellung folgenden Tag
 *    (§ 125 Abs 1 ZPO analog).
 *  - "verkuendung": Fristlauf beginnt mit dem der mündlichen Verkündung
 *    folgenden Tag.
 *  - "ereignis": sonstiges fristauslösendes Ereignis (z. B. Kenntnis).
 */
export type Fristbeginn = "zustellung" | "verkuendung" | "ereignis";

export interface Verfahrensart {
  id: string;
  rechtsgebiet: Rechtsgebiet;
  bezeichnung: string;
  rechtsmittel: string;
  /** Dauer der Frist – genau einer von fristTage/fristWochen/fristMonate */
  fristTage?: number;
  fristWochen?: number;
  fristMonate?: number;
  fristbeginn: Fristbeginn;
  /**
   * Wird die Frist durch die verhandlungsfreie Zeit (§ 222 ZPO) gehemmt?
   * - true: typisch Zivilverfahren
   * - false: typisch Straf- und Verwaltungsverfahren
   * Hinweis: Auch in Zivilsachen gibt es Ausnahmen (z. B. einstweilige
   * Verfügungen, Besitzstörung) – daher pro Verfahrensart konfigurierbar.
   */
  gerichtsferienRelevant: boolean;
  rechtsgrundlage: string;
  hinweis?: string;
  /** ISO-Datum „Stand" der Regel, zur späteren Versionierung */
  stand: string;
}

export interface Feiertag {
  name: string;
  /** "MM-DD" für fixe Feiertage */
  fix?: string;
  /** Abhängig von Ostersonntag (Tage-Offset). Ostersonntag = 0 */
  osterOffset?: number;
  /**
   * Nach § 903 ABGB „dem Sonntag gleichgestellt" (z. B. Karfreitag)?
   * Auch wenn nicht gesetzlicher Feiertag nach ARG, für Fristen relevant.
   */
  abgbFeiertag: boolean;
}

export interface GerichtsferienZeitraum {
  name: string;
  von: string; // "MM-DD"
  bis: string; // "MM-DD"
  /** Rechtsgrundlage (§ 222 ZPO) */
  rechtsgrundlage: string;
}

export interface FristErgebnis {
  fristbeginn: Date;
  nominalesFristende: Date;
  tatsaechlichesFristende: Date;
  verlaengerungen: Verlaengerung[];
  verfahren: Verfahrensart;
}

export interface Verlaengerung {
  grund: "wochenende" | "feiertag" | "gerichtsferien";
  tage: number;
  detail: string;
}
