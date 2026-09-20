/**
 * Voraussetzungen der Uebergabe an die Kooperationskanzlei.
 *
 * Die Plattform bereitet die Uebergabe vor und uebermittelt Unterlagen.
 * Sie erteilt keine Rechtsberatung, nimmt kein Mandat an und rechnet nicht
 * mit der Kanzlei ab.
 *
 * Zwei Invarianten, die hier durchgesetzt werden:
 *
 * - **Invariante 2:** Keine Uebergabe ohne dokumentierte menschliche
 *   Freigabe des Glaeubigers.
 * - **LEGAL-REVIEW L-11:** Zwischen Portalbetreiber und Kanzlei fliesst
 *   weder Geld noch ein sonstiger Vorteil, in keine Richtung. Das
 *   Mandatsverhaeltnis besteht ausschliesslich zwischen Glaeubiger und
 *   Kanzlei. Diese Datei enthaelt daher bewusst kein Feld fuer eine
 *   Verguetung, eine Provision oder eine Beteiligung - auch nicht als
 *   optionales Feld und auch nicht mit dem Wert null.
 */

export class HandoverError extends Error {
  override readonly name = 'HandoverError';
}

/** Eine einzelne Voraussetzung der Uebergabe. */
export type HandoverRequirement =
  /** Die aussergerichtliche Bearbeitung ist beendet. */
  | 'collection_concluded'
  /** Dem Glaeubiger wurde die Kostenschaetzung angezeigt. */
  | 'cost_estimate_shown'
  /** Der Glaeubiger hat das Mandat mit der Kanzlei unterzeichnet. */
  | 'mandate_signed_with_firm'
  /** Der Glaeubiger hat der Uebermittlung der Unterlagen zugestimmt. */
  | 'data_transfer_consented'
  /** Es liegt keine offene Einwendung vor. */
  | 'no_open_objection'
  /** Eine dokumentierte Freigabe mit Benutzer, Zeitpunkt und Begruendung. */
  | 'human_approval_recorded'
  /** Der Hinweis auf die freie Kanzleiwahl wurde angezeigt. */
  | 'free_choice_notice_shown';

export const HANDOVER_REQUIREMENTS: readonly HandoverRequirement[] = [
  'collection_concluded',
  'cost_estimate_shown',
  'mandate_signed_with_firm',
  'data_transfer_consented',
  'no_open_objection',
  'human_approval_recorded',
  'free_choice_notice_shown',
];

export const REQUIREMENT_LABELS: Record<HandoverRequirement, string> = {
  collection_concluded: 'Aussergerichtliche Bearbeitung abgeschlossen',
  cost_estimate_shown: 'Kostenschaetzung angezeigt',
  mandate_signed_with_firm: 'Mandatsvertrag mit der Kanzlei unterzeichnet',
  data_transfer_consented: 'Zustimmung zur Uebermittlung der Unterlagen',
  no_open_objection: 'Keine offene Einwendung',
  human_approval_recorded: 'Freigabe dokumentiert',
  free_choice_notice_shown: 'Hinweis auf die freie Kanzleiwahl angezeigt',
};

export type HandoverChecklist = Readonly<Record<HandoverRequirement, boolean>>;

export interface HandoverReadiness {
  readonly ready: boolean;
  readonly missing: readonly HandoverRequirement[];
  /** Sachliche Beschreibung, was noch fehlt. */
  readonly summary: string;
}

/**
 * Prueft, ob eine Uebergabe vorbereitet werden darf.
 * Rein - fuehrt die Uebergabe nicht aus und erzeugt keinen Seiteneffekt.
 */
export function checkHandoverReadiness(checklist: HandoverChecklist): HandoverReadiness {
  const missing = HANDOVER_REQUIREMENTS.filter((r) => !checklist[r]);
  if (missing.length === 0) {
    return {
      ready: true,
      missing: [],
      summary: 'Alle Voraussetzungen der Uebergabe liegen vor.',
    };
  }
  return {
    ready: false,
    missing,
    summary:
      'Die Uebergabe ist noch nicht moeglich. Offen: ' +
      missing.map((r) => REQUIREMENT_LABELS[r]).join(', ') + '.',
  };
}

/** Umfang dessen, was an die Kanzlei uebermittelt wird. */
export interface HandoverPackage {
  readonly claimId: string;
  readonly reference: string;
  /** Anzahl der uebermittelten Dokumente. */
  readonly documentCount: number;
  /** Anzahl der Ereignisse in der Zeitleiste. */
  readonly eventCount: number;
  /** Ob die Betragsaufstellung enthalten ist. */
  readonly includesAmountBreakdown: boolean;
}

/**
 * Text, der dem Glaeubiger VOR der Zustimmung angezeigt wird.
 * Er muss wissen, was uebermittelt wird, bevor er zustimmt.
 */
export function describeTransferScope(pkg: HandoverPackage): string {
  const parts = [
    `Aktenzeichen ${pkg.reference}`,
    `${pkg.documentCount} ${pkg.documentCount === 1 ? 'Dokument' : 'Dokumente'}`,
    `${pkg.eventCount} ${pkg.eventCount === 1 ? 'Eintrag' : 'Eintraege'} der Zeitleiste`,
  ];
  if (pkg.includesAmountBreakdown) parts.push('die Betragsaufstellung');
  return `Uebermittelt werden: ${parts.join(', ')}.`;
}

/**
 * Bestaetigungstext nach der Uebermittlung.
 *
 * Bewusst so formuliert, dass kein bestehendes Mandat des Portals und keine
 * anwaltliche Taetigkeit des Portals suggeriert wird (Invariante 12).
 */
/**
 * Hinweis, der vor der Uebergabe anzuzeigen ist.
 *
 * Der Glaeubiger muss wissen, dass er nicht an die Kooperationskanzlei
 * gebunden ist. Das folgt aus dem Verbot, Vorteile fuer Mandatszufuehrungen
 * zu gewaehren (LEGAL-REVIEW L-11): Eine Uebergabe, die als einziger Weg
 * dargestellt wird, waere faktisch eine Zufuehrung.
 */
export const FREE_CHOICE_NOTICE =
  'Sie koennen Ihre Forderung jeder Rechtsanwaeltin und jedem Rechtsanwalt ' +
  'Ihrer Wahl uebergeben. Die hier angebotene Uebergabe an die ' +
  'Kooperationskanzlei ist ein Angebot zur Vereinfachung und keine ' +
  'Voraussetzung. Zwischen dem Portal und der Kanzlei bestehen keine ' +
  'Zahlungen oder sonstigen Vorteile fuer die Uebergabe von Faellen.';

export const HANDOVER_CONFIRMATION =
  'Ihre Unterlagen wurden an die Kanzlei uebermittelt. Die Kanzlei prueft ' +
  'Ihren Fall eigenstaendig und setzt sich mit Ihnen in Verbindung, um die ' +
  'weitere Vorgehensweise zu besprechen. Ab diesem Zeitpunkt erfolgt die ' +
  'anwaltliche Beratung und Vertretung unmittelbar durch die Kanzlei.';
