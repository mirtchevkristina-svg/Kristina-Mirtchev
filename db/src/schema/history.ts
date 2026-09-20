/**
 * Unveraenderliche Tabellen: Ereignisse, Statushistorie, Audit.
 *
 * Alle drei werden ausschliesslich angehaengt. Der Schutz dagegen liegt
 * nicht nur in der Anwendung, sondern als Trigger in der Datenbank - sonst
 * wuerde ein direkter Zugriff am Schutz vorbeikommen (siehe
 * db/migrations/0001_append_only.sql).
 */

import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  actorKindEnum,
  disputeStateEnum,
  escalationStateEnum,
  installmentStateEnum,
  lifecycleEnum,
  liabilityStateEnum,
  paymentStateEnum,
  pauseReasonEnum,
} from './enums.js';
import { claims } from './claims.js';

/**
 * Fachliche Ereignisse einer Akte.
 *
 * Die Zeitleiste im Aktendetail wird daraus erzeugt, nicht aus fest
 * eingetragenem Text. Aus dieser Kette laesst sich der Zustand zu jedem
 * Zeitpunkt rekonstruieren.
 */
export const claimEvents = pgTable(
  'claim_events',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    /** Ereignistyp der Zustandsmaschine, z. B. `payment_confirmed`. */
    type: text('type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    actorKind: actorKindEnum('actor_kind').notNull(),
    actorId: text('actor_id').notNull(),
    /** Sachliche Beschreibung fuer die Zeitleiste. Enthaelt keine PII. */
    summary: text('summary').notNull(),
    /** Strukturierte Nutzlast, vor dem Schreiben redigiert. */
    payload: jsonb('payload'),
    /** Fortlaufende Nummer je Akte, macht Luecken erkennbar. */
    sequence: bigint('sequence', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('claim_events_claim_idx').on(table.claimId),
    claimSequenceUnique: uniqueIndex('claim_events_claim_sequence_unique').on(
      table.claimId,
      table.sequence,
    ),
  }),
);

/**
 * Statushistorie.
 *
 * Wird ausschliesslich durch die zentrale Uebergangsfunktion geschrieben
 * (CLAUDE.md 4.1). Jede Zeile haelt den Zustand vor und nach dem Uebergang
 * fest, damit ein Sprung nicht unbemerkt bleibt.
 */
export const claimStatusHistory = pgTable(
  'claim_status_history',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    eventId: text('event_id').references(() => claimEvents.id),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull(),
    actorKind: actorKindEnum('actor_kind').notNull(),
    actorId: text('actor_id').notNull(),

    previousLifecycle: lifecycleEnum('previous_lifecycle').notNull(),
    newLifecycle: lifecycleEnum('new_lifecycle').notNull(),
    previousPaymentState: paymentStateEnum('previous_payment_state').notNull(),
    newPaymentState: paymentStateEnum('new_payment_state').notNull(),
    previousDisputeState: disputeStateEnum('previous_dispute_state').notNull(),
    newDisputeState: disputeStateEnum('new_dispute_state').notNull(),
    previousInstallmentState: installmentStateEnum('previous_installment_state').notNull(),
    newInstallmentState: installmentStateEnum('new_installment_state').notNull(),
    previousEscalationState: escalationStateEnum('previous_escalation_state').notNull(),
    newEscalationState: escalationStateEnum('new_escalation_state').notNull(),
    previousPauseReasons: pauseReasonEnum('previous_pause_reasons').array().notNull(),
    newPauseReasons: pauseReasonEnum('new_pause_reasons').array().notNull(),

    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('claim_status_history_claim_idx').on(table.claimId),
  }),
);

/**
 * Audit ueber alle fachlich relevanten Aenderungen (CLAUDE.md 1.9).
 *
 * Weiter gefasst als `claim_events`: erfasst auch Rollen, Einwilligungen,
 * Freigaben, Zugriffe auf das Schuldnerportal und Konfigurationsaenderungen,
 * also auch Vorgaenge ohne Fallbezug.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id'),
    claimId: text('claim_id'),
    subject: text('subject').notNull(),
    subjectId: text('subject_id'),
    action: text('action').notNull(),
    actorKind: actorKindEnum('actor_kind').notNull(),
    actorId: text('actor_id').notNull(),
    actorRole: text('actor_role'),
    summary: text('summary').notNull(),
    metadata: jsonb('metadata'),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),
    /** Nur der Hash, nie die Adresse im Klartext. */
    ipHash: text('ip_hash'),
    requestId: text('request_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    companyIdx: index('audit_events_company_idx').on(table.companyId),
    claimIdx: index('audit_events_claim_idx').on(table.claimId),
    occurredIdx: index('audit_events_occurred_idx').on(table.occurredAt),
  }),
);

/**
 * Gestundete Kostenforderung des Portals gegen den Glaeubiger.
 *
 * Existiert nur, wenn die Erloessaeule `creditor_collection_fee`
 * freigeschaltet ist. Ist sie durch L-20 gesperrt, bleibt die Tabelle
 * leer - die Akte selbst funktioniert unveraendert.
 */
export const costLiabilities = pgTable(
  'cost_liabilities',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    totalCents: bigint('total_cents', { mode: 'bigint' }).notNull(),
    settledCents: bigint('settled_cents', { mode: 'bigint' }).notNull().default(0n),
    waivedCents: bigint('waived_cents', { mode: 'bigint' }).notNull().default(0n),
    state: liabilityStateEnum('state').notNull().default('deferred'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
    waivedAt: timestamp('waived_at', { withTimezone: true }),
    waiveReason: text('waive_reason'),
    /** Konfigurationsversion, unter der die Forderung begruendet wurde. */
    configVersionId: text('config_version_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Je Akte hoechstens eine Kostenforderung. */
    claimUnique: uniqueIndex('cost_liabilities_claim_unique').on(table.claimId),
  }),
);
