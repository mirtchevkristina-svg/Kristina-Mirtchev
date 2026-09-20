/**
 * Abbildung des orthogonalen Zustands auf die UI-Gruppen.
 * Reines Mapping ohne eigene Logik (CLAUDE.md 4.1).
 */

import type { ClaimState } from './state.js';

export type UiGroup =
  | 'entwurf'
  | 'offen'
  | 'in_bearbeitung'
  | 'ratenzahlung'
  | 'bezahlt'
  | 'geschlossen';

export function uiGroup(state: ClaimState): UiGroup {
  if (state.lifecycle === 'draft') return 'entwurf';
  if (state.lifecycle === 'closed' || state.lifecycle === 'declined') {
    return state.payment === 'paid' ? 'bezahlt' : 'geschlossen';
  }
  if (state.installment === 'active') return 'ratenzahlung';
  if (state.lifecycle === 'active') return 'in_bearbeitung';
  return 'offen';
}

export const UI_GROUP_LABELS: Record<UiGroup, string> = {
  entwurf: 'Entwurf',
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  ratenzahlung: 'Ratenzahlung',
  bezahlt: 'Bezahlt',
  geschlossen: 'Geschlossen',
};

/**
 * Kurzer, sachlicher Hinweis auf den naechsten Schritt.
 * Bewusst handlungsorientiert statt technisch (siehe
 * docs/VERBESSERUNGSVORSCHLAEGE.md 3).
 */
export function nextStepLabel(state: ClaimState): string {
  if (state.lifecycle === 'draft') return 'Angaben vervollstaendigen und einreichen';
  if (state.lifecycle === 'submitted') return 'Vorpruefung laeuft';
  if (state.lifecycle === 'in_review') return 'Manuelle Pruefung durch das Portal';
  if (state.lifecycle === 'awaiting_activation') return 'Bearbeitungsgebuehr offen';
  if (state.lifecycle === 'declined') return 'Fall wurde abgelehnt';
  if (state.lifecycle === 'closed') return 'Fall abgeschlossen';

  if (state.dispute === 'raised') return 'Einwendung pruefen';
  if (state.dispute === 'under_review') return 'Einwendung in Pruefung';
  if (state.installment === 'requested') return 'Ratenanfrage entscheiden';
  if (state.installment === 'proposed_by_creditor') return 'Antwort des Schuldners abwarten';
  if (state.installment === 'defaulted') return 'Ratenplan gescheitert, naechsten Schritt waehlen';
  if (state.pauseReasons.includes('insolvency')) return 'Insolvenz: Forderungsanmeldung pruefen';
  if (state.escalation === 'requested') return 'Uebergabe an die Kanzlei wird vorbereitet';
  if (state.escalation === 'handed_over') return 'Annahme durch die Kanzlei abwarten';
  if (state.payment === 'partial') return 'Teilzahlung eingegangen, Restbetrag offen';
  if (state.pauseReasons.length > 0) return 'Bearbeitung pausiert';
  return 'Aussergerichtliche Bearbeitung laeuft';
}
