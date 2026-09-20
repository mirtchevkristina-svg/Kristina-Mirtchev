/**
 * Fachliche Ereignisse, die den Zustand einer Akte veraendern koennen.
 *
 * Nur diese Ereignisse sind erlaubte Ausloeser. Es gibt keinen Weg, einen
 * Status direkt zu setzen - `claim_status_history` wird ausschliesslich ueber
 * `applyEvent` geschrieben (CLAUDE.md 4.1).
 */

import type { PauseReason } from './state.js';

/**
 * Wer das Ereignis ausgeloest hat.
 *
 * `ai` ist bewusst enthalten, damit der Versuch, einen Status aus einem
 * KI-Ergebnis heraus zu setzen, nicht still durchgeht, sondern an einer
 * expliziten Pruefung scheitert (CLAUDE.md 1.3).
 */
export type ActorKind = 'creditor_user' | 'back_office' | 'debtor' | 'system' | 'ai';

export interface Actor {
  readonly kind: ActorKind;
  /** Benutzer-ID aus der Session, Token-ID des Schuldners oder Jobname. */
  readonly id: string;
}

/**
 * Dokumentierte menschliche Freigabe. Pflicht bei jeder Eskalation
 * (CLAUDE.md 1.2).
 */
export interface HumanApproval {
  readonly userId: string;
  readonly at: Date;
  readonly reason: string;
}

export type ClaimEvent =
  | { readonly type: 'claim_submitted'; readonly actor: Actor; readonly debtorIsConsumer: boolean }
  | { readonly type: 'review_started'; readonly actor: Actor }
  | { readonly type: 'review_passed'; readonly actor: Actor }
  | { readonly type: 'review_declined'; readonly actor: Actor; readonly reason: string }
  | { readonly type: 'activation_completed'; readonly actor: Actor; readonly orderId: string }
  | {
      readonly type: 'payment_reported';
      readonly actor: Actor;
      readonly reportId: string;
    }
  | {
      readonly type: 'payment_confirmed';
      readonly actor: Actor;
      readonly paymentId: string;
      readonly settlesClaimInFull: boolean;
    }
  | { readonly type: 'objection_raised'; readonly actor: Actor; readonly objectionId: string }
  | { readonly type: 'objection_review_started'; readonly actor: Actor }
  | { readonly type: 'objection_upheld'; readonly actor: Actor; readonly reason: string }
  | { readonly type: 'objection_rejected'; readonly actor: Actor; readonly reason: string }
  | { readonly type: 'installment_requested'; readonly actor: Actor; readonly requestId: string }
  | { readonly type: 'installment_proposed'; readonly actor: Actor; readonly planId: string }
  | { readonly type: 'installment_activated'; readonly actor: Actor; readonly planId: string }
  | { readonly type: 'installment_defaulted'; readonly actor: Actor; readonly planId: string }
  | { readonly type: 'installment_completed'; readonly actor: Actor; readonly planId: string }
  | { readonly type: 'insolvency_detected'; readonly actor: Actor; readonly reference: string }
  | { readonly type: 'insolvency_cleared'; readonly actor: Actor }
  | {
      readonly type: 'escalation_requested';
      readonly actor: Actor;
      readonly approval: HumanApproval;
    }
  | { readonly type: 'escalation_handed_over'; readonly actor: Actor; readonly exportId: string }
  | { readonly type: 'escalation_accepted'; readonly actor: Actor }
  | { readonly type: 'escalation_declined_by_firm'; readonly actor: Actor; readonly reason: string }
  | { readonly type: 'claim_paused'; readonly actor: Actor; readonly reason: PauseReason }
  | { readonly type: 'claim_resumed'; readonly actor: Actor; readonly reason: PauseReason }
  | {
      readonly type: 'claim_closed';
      readonly actor: Actor;
      readonly outcome: ClosingOutcome;
      readonly note: string;
    };

export type ClaimEventType = ClaimEvent['type'];

export type ClosingOutcome =
  | 'paid_in_full'
  | 'settled'
  | 'withdrawn_by_creditor'
  | 'written_off'
  | 'handed_to_law_firm';

/**
 * Seiteneffekte, die ein Uebergang ausloest. Die State Machine fuehrt sie
 * nicht selbst aus; sie beschreibt sie nur. Die Ausfuehrung erfolgt im
 * Anwendungsdienst in derselben Transaktion ueber die Outbox
 * (CLAUDE.md 4.6).
 */
export type Effect =
  | { readonly type: 'pause_automation'; readonly reason: PauseReason }
  | { readonly type: 'resume_automation' }
  | { readonly type: 'cancel_scheduled_jobs' }
  | { readonly type: 'schedule_first_payment_request' }
  | { readonly type: 'notify_creditor'; readonly template: string }
  | { readonly type: 'notify_debtor'; readonly template: string }
  | { readonly type: 'notify_back_office'; readonly template: string }
  | { readonly type: 'create_success_fee_calculation'; readonly paymentId: string }
  | { readonly type: 'require_manual_review'; readonly reason: string };
