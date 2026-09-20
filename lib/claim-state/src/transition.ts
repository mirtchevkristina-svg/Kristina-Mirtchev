/**
 * Zentrale Uebergangsfunktion.
 *
 * Jeder Zustandswechsel einer Akte laeuft ausschliesslich hier durch.
 * Die Funktion ist rein: gleicher Zustand plus gleiches Ereignis ergeben
 * immer dasselbe Ergebnis, keine Datenbank, keine Uhr, keine Zufallswerte.
 * Dadurch ist sie vollstaendig testbar und kann sowohl im Anwendungsdienst
 * als auch zur Wiederherstellung historischer Zustaende verwendet werden.
 */

import type { Actor, ClaimEvent, Effect } from './events.js';
import {
  type ClaimState,
  type PauseReason,
  automationAllowed,
} from './state.js';

export class TransitionError extends Error {
  override readonly name = 'TransitionError';
  constructor(
    message: string,
    readonly code:
      | 'forbidden_actor'
      | 'illegal_transition'
      | 'missing_approval'
      | 'invariant_violated',
  ) {
    super(message);
  }
}

export interface TransitionResult {
  readonly state: ClaimState;
  readonly effects: readonly Effect[];
  /** Kurzbeschreibung fuer `claim_status_history`. */
  readonly summary: string;
}

/** Rollen, die ein Ereignis ausloesen duerfen. */
const ALLOWED_ACTORS: Record<ClaimEvent['type'], readonly Actor['kind'][]> = {
  claim_submitted: ['creditor_user'],
  review_started: ['back_office'],
  review_passed: ['back_office'],
  review_declined: ['back_office'],
  activation_completed: ['system'],
  payment_reported: ['debtor', 'creditor_user', 'back_office'],
  payment_confirmed: ['creditor_user', 'back_office'],
  objection_raised: ['debtor', 'back_office'],
  objection_review_started: ['creditor_user', 'back_office'],
  objection_upheld: ['creditor_user', 'back_office'],
  objection_rejected: ['creditor_user', 'back_office'],
  installment_requested: ['debtor', 'back_office'],
  installment_proposed: ['creditor_user', 'back_office'],
  installment_activated: ['creditor_user', 'back_office', 'debtor'],
  installment_defaulted: ['system', 'back_office'],
  installment_completed: ['system', 'back_office'],
  insolvency_detected: ['system', 'back_office'],
  insolvency_cleared: ['back_office'],
  escalation_requested: ['creditor_user'],
  escalation_handed_over: ['back_office'],
  escalation_accepted: ['back_office'],
  escalation_declined_by_firm: ['back_office'],
  claim_paused: ['creditor_user', 'back_office'],
  claim_resumed: ['creditor_user', 'back_office'],
  claim_closed: ['creditor_user', 'back_office'],
};

/**
 * Wendet ein Ereignis auf einen Zustand an.
 * Wirft `TransitionError`, wenn der Uebergang nicht erlaubt ist.
 */
export function applyEvent(state: ClaimState, event: ClaimEvent): TransitionResult {
  assertActorAllowed(state, event);

  switch (event.type) {
    case 'claim_submitted': {
      expectLifecycle(state, event.type, ['draft']);
      // CLAUDE.md 1.5: Verbraucherfaelle gehen immer durch manuelle Pruefung.
      if (event.debtorIsConsumer) {
        return {
          state: {
            ...state,
            lifecycle: 'in_review',
            pauseReasons: addReason(state.pauseReasons, 'manual_review'),
          },
          effects: [
            { type: 'pause_automation', reason: 'manual_review' },
            {
              type: 'require_manual_review',
              reason: 'Verbraucherfall: Pruefung vor dem ersten Schuldnerkontakt',
            },
            { type: 'notify_back_office', template: 'review_required_b2c' },
          ],
          summary: 'Eingereicht, Verbraucherfall zur manuellen Pruefung',
        };
      }
      return {
        state: { ...state, lifecycle: 'submitted' },
        effects: [{ type: 'notify_back_office', template: 'claim_submitted' }],
        summary: 'Eingereicht',
      };
    }

    case 'review_started': {
      expectLifecycle(state, event.type, ['submitted', 'in_review']);
      return {
        state: {
          ...state,
          lifecycle: 'in_review',
          pauseReasons: addReason(state.pauseReasons, 'manual_review'),
        },
        effects: [{ type: 'pause_automation', reason: 'manual_review' }],
        summary: 'Manuelle Pruefung begonnen',
      };
    }

    case 'review_passed': {
      expectLifecycle(state, event.type, ['submitted', 'in_review']);
      return {
        state: {
          ...state,
          lifecycle: 'awaiting_activation',
          pauseReasons: removeReason(state.pauseReasons, 'manual_review'),
        },
        effects: [{ type: 'notify_creditor', template: 'review_passed_checkout' }],
        summary: 'Pruefung bestanden, wartet auf Aktivierung',
      };
    }

    case 'review_declined': {
      expectLifecycle(state, event.type, ['submitted', 'in_review']);
      return {
        state: { ...state, lifecycle: 'declined' },
        effects: [
          { type: 'cancel_scheduled_jobs' },
          { type: 'notify_creditor', template: 'claim_declined' },
        ],
        summary: `Abgelehnt: ${event.reason}`,
      };
    }

    case 'activation_completed': {
      expectLifecycle(state, event.type, ['awaiting_activation']);
      return {
        state: {
          ...state,
          lifecycle: 'active',
          pauseReasons: removeReason(state.pauseReasons, 'manual_review'),
        },
        effects: [
          { type: 'schedule_first_payment_request' },
          { type: 'notify_creditor', template: 'claim_activated' },
        ],
        summary: 'Aktiviert nach Zahlungseingang der Bearbeitungsgebuehr',
      };
    }

    case 'payment_reported': {
      // CLAUDE.md 4.3: Eine Meldung aendert den Zahlungsstand NICHT.
      expectLifecycle(state, event.type, ['active']);
      return {
        state,
        effects: [{ type: 'notify_creditor', template: 'payment_reported_confirm' }],
        summary: 'Zahlung angekuendigt, Bestaetigung ausstehend',
      };
    }

    case 'payment_confirmed': {
      expectLifecycle(state, event.type, ['active']);
      if (event.settlesClaimInFull) {
        return {
          state: {
            ...state,
            payment: 'paid',
            lifecycle: 'closed',
            installment:
              state.installment === 'active' ? 'completed' : state.installment,
            pauseReasons: [],
          },
          effects: [
            { type: 'cancel_scheduled_jobs' },
            { type: 'create_success_fee_calculation', paymentId: event.paymentId },
            { type: 'notify_creditor', template: 'claim_settled' },
            { type: 'notify_debtor', template: 'payment_received_closing' },
          ],
          summary: 'Zahlung bestaetigt, Forderung vollstaendig getilgt',
        };
      }
      return {
        state: { ...state, payment: 'partial' },
        effects: [
          { type: 'create_success_fee_calculation', paymentId: event.paymentId },
          { type: 'notify_debtor', template: 'partial_payment_received' },
        ],
        summary: 'Teilzahlung bestaetigt',
      };
    }

    case 'objection_raised': {
      // CLAUDE.md 1.4: Einwendung pausiert sofort alles.
      expectLifecycle(state, event.type, ['active']);
      if (state.dispute === 'raised' || state.dispute === 'under_review') {
        throw new TransitionError(
          'Es liegt bereits eine offene Einwendung vor',
          'illegal_transition',
        );
      }
      return {
        state: {
          ...state,
          dispute: 'raised',
          pauseReasons: addReason(state.pauseReasons, 'objection'),
        },
        effects: [
          { type: 'pause_automation', reason: 'objection' },
          { type: 'cancel_scheduled_jobs' },
          { type: 'notify_creditor', template: 'objection_raised' },
          { type: 'notify_back_office', template: 'objection_raised' },
        ],
        summary: 'Einwendung eingegangen, Bearbeitung pausiert',
      };
    }

    case 'objection_review_started': {
      expectDispute(state, event.type, ['raised']);
      return {
        state: { ...state, dispute: 'under_review' },
        effects: [],
        summary: 'Einwendung wird geprueft',
      };
    }

    case 'objection_upheld': {
      expectDispute(state, event.type, ['raised', 'under_review']);
      return {
        state: {
          ...state,
          dispute: 'upheld',
          lifecycle: 'closed',
          pauseReasons: [],
        },
        effects: [
          { type: 'cancel_scheduled_jobs' },
          { type: 'notify_debtor', template: 'objection_upheld' },
          { type: 'notify_creditor', template: 'objection_upheld' },
        ],
        summary: `Einwendung anerkannt, Fall geschlossen: ${event.reason}`,
      };
    }

    case 'objection_rejected': {
      expectDispute(state, event.type, ['raised', 'under_review']);
      const pauseReasons = removeReason(state.pauseReasons, 'objection');
      return {
        state: { ...state, dispute: 'rejected', pauseReasons },
        effects: [
          ...(pauseReasons.length === 0
            ? ([{ type: 'resume_automation' }] as const)
            : []),
          { type: 'notify_debtor', template: 'objection_rejected' },
        ],
        summary: `Einwendung zurueckgewiesen: ${event.reason}`,
      };
    }

    case 'installment_requested': {
      expectLifecycle(state, event.type, ['active']);
      expectInstallment(state, event.type, ['none', 'defaulted']);
      return {
        state: { ...state, installment: 'requested' },
        effects: [{ type: 'notify_creditor', template: 'installment_requested' }],
        summary: 'Ratenzahlung angefragt',
      };
    }

    case 'installment_proposed': {
      expectLifecycle(state, event.type, ['active']);
      expectInstallment(state, event.type, ['requested', 'proposed_by_creditor']);
      return {
        state: { ...state, installment: 'proposed_by_creditor' },
        effects: [{ type: 'notify_debtor', template: 'installment_proposed' }],
        summary: 'Gegenvorschlag des Glaeubigers uebermittelt',
      };
    }

    case 'installment_activated': {
      expectLifecycle(state, event.type, ['active']);
      expectInstallment(state, event.type, ['requested', 'proposed_by_creditor']);
      return {
        state: {
          ...state,
          installment: 'active',
          pauseReasons: addReason(state.pauseReasons, 'installment_plan'),
        },
        effects: [
          { type: 'pause_automation', reason: 'installment_plan' },
          { type: 'notify_debtor', template: 'installment_active' },
          { type: 'notify_creditor', template: 'installment_active' },
        ],
        summary: 'Ratenplan aktiv, Mahnstufen ruhen',
      };
    }

    case 'installment_defaulted': {
      expectInstallment(state, event.type, ['active']);
      const pauseReasons = removeReason(state.pauseReasons, 'installment_plan');
      return {
        state: { ...state, installment: 'defaulted', pauseReasons },
        effects: [
          ...(pauseReasons.length === 0
            ? ([{ type: 'resume_automation' }] as const)
            : []),
          { type: 'notify_creditor', template: 'installment_defaulted' },
        ],
        summary: 'Ratenplan gescheitert',
      };
    }

    case 'installment_completed': {
      expectInstallment(state, event.type, ['active']);
      return {
        state: {
          ...state,
          installment: 'completed',
          pauseReasons: removeReason(state.pauseReasons, 'installment_plan'),
        },
        effects: [{ type: 'notify_creditor', template: 'installment_completed' }],
        summary: 'Ratenplan vollstaendig erfuellt',
      };
    }

    case 'insolvency_detected': {
      if (state.lifecycle === 'closed' || state.lifecycle === 'declined') {
        throw new TransitionError(
          'Insolvenzvermerk auf einem abgeschlossenen Fall nicht moeglich',
          'illegal_transition',
        );
      }
      return {
        state: {
          ...state,
          pauseReasons: addReason(state.pauseReasons, 'insolvency'),
        },
        effects: [
          { type: 'pause_automation', reason: 'insolvency' },
          { type: 'cancel_scheduled_jobs' },
          { type: 'notify_creditor', template: 'insolvency_detected' },
        ],
        summary: `Insolvenzverfahren festgestellt (${event.reference}), Bearbeitung pausiert`,
      };
    }

    case 'insolvency_cleared': {
      if (!state.pauseReasons.includes('insolvency')) {
        throw new TransitionError('Kein Insolvenzvermerk gesetzt', 'illegal_transition');
      }
      const pauseReasons = removeReason(state.pauseReasons, 'insolvency');
      return {
        state: { ...state, pauseReasons },
        effects:
          pauseReasons.length === 0 ? [{ type: 'resume_automation' }] : [],
        summary: 'Insolvenzvermerk aufgehoben',
      };
    }

    case 'escalation_requested': {
      // CLAUDE.md 1.2: nur mit dokumentierter menschlicher Freigabe.
      expectLifecycle(state, event.type, ['active']);
      expectEscalation(state, event.type, ['none', 'declined_by_firm']);
      if (!event.approval.userId || !event.approval.reason.trim()) {
        throw new TransitionError(
          'Eskalation erfordert eine dokumentierte Freigabe mit Benutzer-ID und Begruendung',
          'missing_approval',
        );
      }
      if (state.dispute === 'raised' || state.dispute === 'under_review') {
        throw new TransitionError(
          'Solange eine Einwendung offen ist, ist keine Uebergabe moeglich',
          'invariant_violated',
        );
      }
      return {
        state: { ...state, escalation: 'requested' },
        effects: [{ type: 'notify_back_office', template: 'escalation_requested' }],
        summary: `Kanzleiuebergabe durch Glaeubiger freigegeben: ${event.approval.reason}`,
      };
    }

    case 'escalation_handed_over': {
      expectEscalation(state, event.type, ['requested']);
      return {
        state: {
          ...state,
          escalation: 'handed_over',
          pauseReasons: addReason(state.pauseReasons, 'escalation'),
        },
        effects: [
          { type: 'pause_automation', reason: 'escalation' },
          { type: 'cancel_scheduled_jobs' },
        ],
        summary: 'Akte an die Kanzlei uebermittelt, Annahme offen',
      };
    }

    case 'escalation_accepted': {
      expectEscalation(state, event.type, ['handed_over']);
      return {
        state: {
          ...state,
          escalation: 'accepted',
          lifecycle: 'closed',
          pauseReasons: [],
        },
        effects: [
          { type: 'cancel_scheduled_jobs' },
          { type: 'notify_creditor', template: 'escalation_accepted' },
        ],
        summary: 'Kanzlei hat das Mandat angenommen, Portalbearbeitung beendet',
      };
    }

    case 'escalation_declined_by_firm': {
      expectEscalation(state, event.type, ['handed_over']);
      const pauseReasons = removeReason(state.pauseReasons, 'escalation');
      return {
        state: { ...state, escalation: 'declined_by_firm', pauseReasons },
        effects: [
          ...(pauseReasons.length === 0
            ? ([{ type: 'resume_automation' }] as const)
            : []),
          { type: 'notify_creditor', template: 'escalation_declined' },
        ],
        summary: `Kanzlei hat die Uebernahme abgelehnt: ${event.reason}`,
      };
    }

    case 'claim_paused': {
      if (state.pauseReasons.includes(event.reason)) {
        throw new TransitionError(
          `Pausegrund "${event.reason}" ist bereits gesetzt`,
          'illegal_transition',
        );
      }
      return {
        state: { ...state, pauseReasons: addReason(state.pauseReasons, event.reason) },
        effects: [{ type: 'pause_automation', reason: event.reason }],
        summary: `Bearbeitung pausiert (${event.reason})`,
      };
    }

    case 'claim_resumed': {
      if (!state.pauseReasons.includes(event.reason)) {
        throw new TransitionError(
          `Pausegrund "${event.reason}" ist nicht gesetzt`,
          'illegal_transition',
        );
      }
      // Eine Einwendung wird nicht ueber ein allgemeines Fortsetzen aufgehoben,
      // sondern nur ueber die ausdrueckliche Entscheidung darueber.
      if (event.reason === 'objection') {
        throw new TransitionError(
          'Eine Einwendung wird nur ueber objection_upheld oder objection_rejected beendet',
          'invariant_violated',
        );
      }
      const pauseReasons = removeReason(state.pauseReasons, event.reason);
      return {
        state: { ...state, pauseReasons },
        effects:
          pauseReasons.length === 0 ? [{ type: 'resume_automation' }] : [],
        summary: `Pausegrund aufgehoben (${event.reason})`,
      };
    }

    case 'claim_closed': {
      if (state.lifecycle === 'closed' || state.lifecycle === 'declined') {
        throw new TransitionError('Fall ist bereits abgeschlossen', 'illegal_transition');
      }
      return {
        state: { ...state, lifecycle: 'closed', pauseReasons: [] },
        effects: [
          { type: 'cancel_scheduled_jobs' },
          { type: 'notify_creditor', template: 'claim_closed' },
        ],
        summary: `Abgeschlossen (${event.outcome}): ${event.note}`,
      };
    }
  }
}

/**
 * Wendet mehrere Ereignisse nacheinander an. Nuetzlich, um aus
 * `claim_events` den Zustand zu einem beliebigen Zeitpunkt zu rekonstruieren.
 */
export function replay(
  events: readonly ClaimEvent[],
  initial: ClaimState,
): ClaimState {
  return events.reduce((state, event) => applyEvent(state, event).state, initial);
}

function assertActorAllowed(state: ClaimState, event: ClaimEvent): void {
  // CLAUDE.md 1.3: KI-Ergebnisse setzen niemals direkt einen Status.
  if (event.actor.kind === 'ai') {
    throw new TransitionError(
      'KI-Ergebnisse duerfen keinen Status setzen. Es ist eine menschliche Bestaetigung erforderlich.',
      'forbidden_actor',
    );
  }
  const allowed = ALLOWED_ACTORS[event.type];
  if (!allowed.includes(event.actor.kind)) {
    throw new TransitionError(
      `Rolle "${event.actor.kind}" darf das Ereignis "${event.type}" nicht ausloesen`,
      'forbidden_actor',
    );
  }
  // Der Schuldner kann nur handeln, solange der Fall laeuft.
  if (event.actor.kind === 'debtor' && state.lifecycle !== 'active') {
    throw new TransitionError(
      'Schuldneraktionen sind nur bei aktiver Bearbeitung moeglich',
      'illegal_transition',
    );
  }
}

function expectLifecycle(
  state: ClaimState,
  eventType: string,
  allowed: readonly ClaimState['lifecycle'][],
): void {
  if (!allowed.includes(state.lifecycle)) {
    throw new TransitionError(
      `"${eventType}" ist im Lebenszyklus "${state.lifecycle}" nicht erlaubt ` +
        `(erwartet: ${allowed.join(', ')})`,
      'illegal_transition',
    );
  }
}

function expectDispute(
  state: ClaimState,
  eventType: string,
  allowed: readonly ClaimState['dispute'][],
): void {
  if (!allowed.includes(state.dispute)) {
    throw new TransitionError(
      `"${eventType}" ist im Einwendungsstand "${state.dispute}" nicht erlaubt`,
      'illegal_transition',
    );
  }
}

function expectInstallment(
  state: ClaimState,
  eventType: string,
  allowed: readonly ClaimState['installment'][],
): void {
  if (!allowed.includes(state.installment)) {
    throw new TransitionError(
      `"${eventType}" ist im Ratenstand "${state.installment}" nicht erlaubt`,
      'illegal_transition',
    );
  }
}

function expectEscalation(
  state: ClaimState,
  eventType: string,
  allowed: readonly ClaimState['escalation'][],
): void {
  if (!allowed.includes(state.escalation)) {
    throw new TransitionError(
      `"${eventType}" ist im Eskalationsstand "${state.escalation}" nicht erlaubt`,
      'illegal_transition',
    );
  }
}

function addReason(
  reasons: readonly PauseReason[],
  reason: PauseReason,
): readonly PauseReason[] {
  return reasons.includes(reason) ? reasons : [...reasons, reason];
}

function removeReason(
  reasons: readonly PauseReason[],
  reason: PauseReason,
): readonly PauseReason[] {
  return reasons.filter((r) => r !== reason);
}

export { automationAllowed };
