/**
 * Aufzaehlungen der Forderungsakte.
 *
 * Sie stehen als PostgreSQL-Enum in der Datenbank, damit ein ungueltiger
 * Wert nicht erst in der Anwendung auffaellt. Die Werte entsprechen den
 * Dimensionen der Zustandsmaschine in @fp/claim-state; Status sind nie
 * freier Text.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

export const lifecycleEnum = pgEnum('claim_lifecycle', [
  'draft',
  'submitted',
  'in_review',
  'awaiting_activation',
  'active',
  'closed',
  'declined',
]);

export const paymentStateEnum = pgEnum('claim_payment_state', ['none', 'partial', 'paid']);

export const disputeStateEnum = pgEnum('claim_dispute_state', [
  'none',
  'raised',
  'under_review',
  'upheld',
  'rejected',
]);

export const installmentStateEnum = pgEnum('claim_installment_state', [
  'none',
  'requested',
  'proposed_by_creditor',
  'active',
  'defaulted',
  'completed',
]);

export const escalationStateEnum = pgEnum('claim_escalation_state', [
  'none',
  'requested',
  'handed_over',
  'accepted',
  'declined_by_firm',
]);

export const pauseReasonEnum = pgEnum('claim_pause_reason', [
  'objection',
  'manual_review',
  'insolvency',
  'installment_plan',
  'escalation',
  'creditor_request',
]);

/** Ob eine Partei Verbraucher oder Unternehmer ist. */
export const partyTypeEnum = pgEnum('party_type', ['consumer', 'business']);

export const partyRoleEnum = pgEnum('party_role', ['creditor', 'debtor']);

/**
 * Bestandteile der Forderung. Jede Betragskomponente traegt genau einen
 * dieser Typen und wird nie mit einer anderen vermischt.
 */
export const amountComponentEnum = pgEnum('amount_component_kind', [
  'principal',
  'interest',
  'collection_costs',
  'platform_costs',
  'other_costs',
]);

/** Betreibungsschritte nach § 3 der Hoechstsatzverordnung. */
export const collectionMeasureEnum = pgEnum('collection_measure', [
  'first_reminder',
  'second_reminder',
  'further_reminder',
  'phone_collection',
  'installment_agreement',
  'deferral_agreement',
  'settlement_agreement',
  'address_inquiry',
  'asset_investigation',
  'record_keeping',
]);

export const escalationStageEnum = pgEnum('escalation_stage', [
  'friendly_reminder',
  'collection_notice',
  'final_notice',
  'legal_review',
]);

/** Wer eine Aenderung ausgeloest hat. */
export const actorKindEnum = pgEnum('actor_kind', [
  'creditor_user',
  'back_office',
  'debtor',
  'system',
  'ai',
]);

/** Zustand der gestundeten Kostenforderung gegen den Glaeubiger. */
export const liabilityStateEnum = pgEnum('cost_liability_state', [
  'deferred',
  'partially_settled',
  'settled',
  'waived',
]);

export const paymentChannelEnum = pgEnum('payment_channel', [
  'bank_transfer',
  'direct_to_creditor',
  'other',
]);
