/**
 * Zustandsmodell einer Forderungsakte.
 *
 * Bewusst KEIN einzelnes Enum mit vielen Werten: Zustaende treten parallel
 * auf (ein Fall kann gleichzeitig einen aktiven Ratenplan, eine Teilzahlung
 * und eine offene Einwendung haben). Ein flaches Enum muesste dafuer
 * Kombinationswerte erfinden und wuerde mit jeder neuen Fachanforderung
 * brechen.
 *
 * Stattdessen orthogonale Dimensionen, die unabhaengig voneinander
 * fortschreiten. Die UI-Gruppen (Offen / In Bearbeitung / Ratenzahlung /
 * Bezahlt / Geschlossen) sind ein reines Mapping darueber (siehe `grouping.ts`).
 */

/** Hauptlebenszyklus der Akte. */
export type Lifecycle =
  /** Erfasst, noch nicht eingereicht. */
  | 'draft'
  /** Eingereicht, wartet auf Vorpruefung. */
  | 'submitted'
  /** In manueller Pruefung (bei B2C immer, sonst nach Bedarf). */
  | 'in_review'
  /** Gebuehr noch nicht bezahlt, Checkout laeuft. */
  | 'awaiting_activation'
  /** Aktiv in aussergerichtlicher Bearbeitung. */
  | 'active'
  /** Abgeschlossen (bezahlt, verglichen, niedergeschlagen oder zurueckgezogen). */
  | 'closed'
  /** Vom Portal abgelehnt. */
  | 'declined';

/** Zahlungsstand, unabhaengig vom Lebenszyklus. */
export type PaymentState = 'none' | 'partial' | 'paid';

/** Stand einer Einwendung des Schuldners. */
export type DisputeState =
  | 'none'
  /** Einwendung eingegangen, noch nicht bewertet. */
  | 'raised'
  /** Glaeubiger bzw. Back-Office prueft. */
  | 'under_review'
  /** Einwendung als berechtigt anerkannt. */
  | 'upheld'
  /** Einwendung zurueckgewiesen, Bearbeitung kann fortgesetzt werden. */
  | 'rejected';

/** Stand einer Ratenvereinbarung. */
export type InstallmentState =
  | 'none'
  | 'requested'
  | 'proposed_by_creditor'
  | 'active'
  | 'defaulted'
  | 'completed';

/** Stand einer Kanzleiuebergabe. */
export type EscalationState =
  | 'none'
  /** Glaeubiger hat die Uebergabe verlangt, Freigabe dokumentiert. */
  | 'requested'
  /** An die Kanzlei uebermittelt, Annahme offen. */
  | 'handed_over'
  /** Kanzlei hat das Mandat angenommen - Portal-Jobs sind gestoppt. */
  | 'accepted'
  /** Kanzlei hat abgelehnt. */
  | 'declined_by_firm';

/**
 * Gruende, aus denen die automatisierte Bearbeitung ruht.
 * Mehrere Gruende koennen gleichzeitig gelten; die Bearbeitung laeuft erst
 * weiter, wenn keiner mehr besteht.
 */
export type PauseReason =
  /** Einwendung des Schuldners (CLAUDE.md 1.4). */
  | 'objection'
  /** Manuelle Pruefung, z. B. Verbraucherfall vor Erstkontakt (CLAUDE.md 1.5). */
  | 'manual_review'
  /** Insolvenzverfahren beim Schuldner. */
  | 'insolvency'
  /** Aktiver Ratenplan - Mahnstufen ruhen. */
  | 'installment_plan'
  /** Fall an die Kanzlei uebergeben. */
  | 'escalation'
  /** Ausdrueckliche Pause durch den Glaeubiger. */
  | 'creditor_request';

export interface ClaimState {
  readonly lifecycle: Lifecycle;
  readonly payment: PaymentState;
  readonly dispute: DisputeState;
  readonly installment: InstallmentState;
  readonly escalation: EscalationState;
  /** Aktive Pausegruende. Leer = automatisierte Schritte laufen. */
  readonly pauseReasons: readonly PauseReason[];
}

export const INITIAL_STATE: ClaimState = {
  lifecycle: 'draft',
  payment: 'none',
  dispute: 'none',
  installment: 'none',
  escalation: 'none',
  pauseReasons: [],
};

/**
 * Ob automatisierte Schritte (Mahnungen, Erinnerungen, Fristen) ausgefuehrt
 * werden duerfen. Jeder geplante Job prueft das unmittelbar vor der
 * Ausfuehrung erneut (CLAUDE.md 4.6).
 */
export function automationAllowed(state: ClaimState): boolean {
  return (
    state.lifecycle === 'active' &&
    state.pauseReasons.length === 0 &&
    state.payment !== 'paid'
  );
}

export function isPausedFor(state: ClaimState, reason: PauseReason): boolean {
  return state.pauseReasons.includes(reason);
}
