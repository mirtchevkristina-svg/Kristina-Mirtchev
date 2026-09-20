/**
 * Versionierte Konfiguration rechtlich relevanter Parameter.
 *
 * CLAUDE.md 1.7: Erfolgshonorar-Satz, Bearbeitungsgebuehr, Zinssaetze,
 * Pauschalen, Mindestbetraege, Ratenregeln und Fristen duerfen nicht im Code
 * stehen. Sie kommen aus dieser Konfiguration, sind mit `validFrom`/`validTo`
 * versioniert und tragen einen Freigabevermerk.
 *
 * Jede Berechnung, die einen solchen Parameter verwendet, speichert die
 * `id` der verwendeten Version mit (vgl. `claim_amount_components.config_version_id`).
 * Dadurch bleibt jeder historische Betrag nachvollziehbar, auch wenn die
 * Konfiguration spaeter geaendert wird.
 */

/**
 * Freigabestatus einer Konfigurationsversion.
 *
 * - `DEMO_ONLY`: Platzhalterwert ohne fachliche Freigabe. Darf niemals in
 *   Produktion wirksam werden; der Startup-Check bricht sonst ab.
 * - `APPROVED`: fachlich/rechtlich freigegeben, mit Freigabevermerk.
 * - `SUPERSEDED`: durch eine neuere Version ersetzt, nur noch fuer die
 *   Rekonstruktion historischer Berechnungen relevant.
 */
export type ApprovalStatus = 'DEMO_ONLY' | 'APPROVED' | 'SUPERSEDED';

export interface ApprovalRecord {
  /** Wer die Freigabe erteilt hat (Name oder Benutzer-ID). */
  readonly by: string;
  /** Zeitpunkt der Freigabe. */
  readonly at: Date;
  /** Fundstelle oder Begruendung, z. B. Aktenzahl der rechtlichen Pruefung. */
  readonly note: string;
}

export interface ConfigVersion<T> {
  /**
   * Stabile, unveraenderliche Kennung dieser Version. Wird in Berechnungen
   * und Audit-Eintraegen referenziert und darf nie wiederverwendet werden.
   */
  readonly id: string;
  readonly value: T;
  /** Gueltig ab (einschliesslich). */
  readonly validFrom: Date;
  /** Gueltig bis (ausschliesslich). `null` = offenes Ende. */
  readonly validTo: Date | null;
  readonly status: ApprovalStatus;
  /** Pflicht, sobald `status === 'APPROVED'`. */
  readonly approval?: ApprovalRecord;
  /** Rechtsgrundlage, z. B. "§ 456 UGB". Rein dokumentarisch. */
  readonly legalBasis?: string;
  /**
   * Verweis auf die offene Frage in docs/LEGAL_OPEN_QUESTIONS.md,
   * solange der Wert nicht freigegeben ist.
   */
  readonly legalReview?: string;
}

/** Eine Menge von Versionen eines Parameters, aufsteigend nach `validFrom`. */
export interface ConfigParameter<T> {
  readonly key: string;
  /** Kurzbeschreibung fuer Betrieb und Review. */
  readonly description: string;
  readonly versions: readonly ConfigVersion<T>[];
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}
