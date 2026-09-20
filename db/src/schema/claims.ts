/**
 * Die Forderungsakte.
 *
 * Bewusst unabhaengig vom Erloesmodell: welche Erloessaeulen aktiv sind,
 * aendert an dieser Struktur nichts. Faellt L-20 negativ aus, entfallen
 * lediglich Zeilen in `claim_amount_components` und `cost_liabilities`.
 *
 * Geldbetraege sind durchgehend `bigint` in Cent (CLAUDE.md 1.6). Es gibt
 * in diesem Schema keine einzige Spalte vom Typ `numeric`, `real` oder
 * `double precision`; ein Test haelt das fest.
 */

import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  amountComponentEnum,
  collectionMeasureEnum,
  disputeStateEnum,
  escalationStageEnum,
  escalationStateEnum,
  installmentStateEnum,
  lifecycleEnum,
  partyRoleEnum,
  partyTypeEnum,
  paymentChannelEnum,
  paymentStateEnum,
  pauseReasonEnum,
} from './enums.js';

export const claims = pgTable(
  'claims',
  {
    id: text('id').primaryKey(),
    /** Mandant. Jede Abfrage auf Falldaten filtert darauf. */
    companyId: text('company_id').notNull(),
    /** Aktenzeichen aus einer Datenbanksequenz, nie aus einer Arraylaenge. */
    reference: text('reference').notNull(),

    // Zustand - entspricht den Dimensionen der Zustandsmaschine.
    lifecycle: lifecycleEnum('lifecycle').notNull().default('draft'),
    paymentState: paymentStateEnum('payment_state').notNull().default('none'),
    disputeState: disputeStateEnum('dispute_state').notNull().default('none'),
    installmentState: installmentStateEnum('installment_state').notNull().default('none'),
    escalationState: escalationStateEnum('escalation_state').notNull().default('none'),
    /** Aktive Pausegruende. Leer = automatisierte Schritte laufen. */
    pauseReasons: pauseReasonEnum('pause_reasons').array().notNull().default([]),
    escalationStage: escalationStageEnum('escalation_stage').notNull().default('friendly_reminder'),

    /** Hauptforderung in Cent. Unveraenderlich nach der Aktivierung. */
    principalCents: bigint('principal_cents', { mode: 'bigint' }).notNull(),
    /** Rechnungsdatum und Faelligkeit - Grundlage des Verzugs. */
    invoiceDate: timestamp('invoice_date', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    /**
     * Beginn des Verzugs. Bewusst ein eigenes Feld und nicht aus der
     * Faelligkeit abgeleitet: ob und ab wann Verzug vorliegt, ist eine
     * fachliche Feststellung, keine Rechenoperation.
     */
    defaultSince: timestamp('default_since', { withTimezone: true }),
    invoiceNumber: text('invoice_number'),
    /** Forderungsgrund. Entscheidet unter anderem ueber § 118 Abs 3 GewO. */
    legalBasis: text('legal_basis'),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index('claims_company_idx').on(table.companyId),
    referenceUnique: uniqueIndex('claims_reference_unique').on(table.reference),
    companyLifecycleIdx: index('claims_company_lifecycle_idx').on(
      table.companyId,
      table.lifecycle,
    ),
  }),
);

/**
 * Beteiligte einer Akte.
 *
 * Glaeubiger und Schuldner liegen in derselben Tabelle, weil beide
 * dieselben Merkmale tragen und beide Verbraucher sein koennen - der
 * Glaeubiger ist gegenueber dem Portal ebenfalls Verbraucher, wenn er
 * privat handelt. Das war in frueheren Entwuerfen nicht abgebildet.
 */
export const claimParties = pgTable(
  'claim_parties',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    role: partyRoleEnum('role').notNull(),
    partyType: partyTypeEnum('party_type').notNull(),
    displayName: text('display_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    street: text('street'),
    postalCode: text('postal_code'),
    city: text('city'),
    countryCode: text('country_code'),
    /** Nur bei Unternehmen. */
    companyRegisterNumber: text('company_register_number'),
    vatNumber: text('vat_number'),
    /** Nur bei Verbrauchern und nur, wenn fachlich erforderlich. */
    birthDate: timestamp('birth_date', { withTimezone: true }),
    /** IBAN des Glaeubigers fuer die Direktzahlung. */
    iban: text('iban'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('claim_parties_claim_idx').on(table.claimId),
    roleUnique: uniqueIndex('claim_parties_claim_role_unique').on(table.claimId, table.role),
  }),
);

/**
 * Bestandteile des Forderungsbetrags.
 *
 * Hauptforderung, Zinsen und jede Kostenart stehen getrennt, jeweils mit
 * Verweis auf die verwendete Konfigurationsversion und den Zeitpunkt der
 * Berechnung. Damit bleibt jeder historische Betrag rekonstruierbar, auch
 * wenn die Konfiguration spaeter geaendert wird.
 */
export const claimAmountComponents = pgTable(
  'claim_amount_components',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    kind: amountComponentEnum('kind').notNull(),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    /** ID der Konfigurationsversion, aus der der Betrag abgeleitet wurde. */
    configVersionId: text('config_version_id'),
    /** Rechtsgrundlage als Text, rein dokumentarisch. */
    legalBasis: text('legal_basis'),
    /** Zeitpunkt, auf den sich die Berechnung bezieht. */
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull(),
    /** Zeitraum bei Zinsen. */
    periodFrom: timestamp('period_from', { withTimezone: true }),
    periodTo: timestamp('period_to', { withTimezone: true }),
    /**
     * Ob die Angemessenheit nach § 1333 Abs 2 ABGB bejaht wurde.
     * Ohne Bestaetigung geht der Posten nicht in die Forderung ein.
     */
    appropriatenessConfirmed: boolean('appropriateness_confirmed').notNull().default(false),
    confirmedBy: text('confirmed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('claim_amount_components_claim_idx').on(table.claimId),
    claimKindIdx: index('claim_amount_components_claim_kind_idx').on(table.claimId, table.kind),
  }),
);

/**
 * Tatsaechlich durchgefuehrte Betreibungsschritte.
 *
 * Nur ein Eintrag hier rechtfertigt einen Kostenposten. Eine Massnahme,
 * die zulaessig waere, aber nicht durchgefuehrt wurde, erzeugt keine Zeile
 * und damit keine Kosten.
 */
export const collectionMeasures = pgTable(
  'collection_measures',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    measure: collectionMeasureEnum('measure').notNull(),
    stage: escalationStageEnum('stage').notNull(),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
    /** Verweis auf die versendete Nachricht, sofern es eine gab. */
    outboxId: text('outbox_id'),
    /** Vorlagen-ID und Version der gesendeten Nachricht, fuer die Beweiskette. */
    templateId: text('template_id'),
    templateVersion: text('template_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('collection_measures_claim_idx').on(table.claimId),
    /** Dieselbe Massnahme wird je Fall hoechstens einmal verrechnet. */
    claimMeasureUnique: uniqueIndex('collection_measures_claim_measure_unique').on(
      table.claimId,
      table.measure,
    ),
  }),
);

/**
 * Zahlungsmeldungen des Schuldners - unbestaetigt.
 * Strikt getrennt von `payments` (CLAUDE.md 4.3).
 */
export const paymentReports = pgTable(
  'payment_reports',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    reportedAmountCents: bigint('reported_amount_cents', { mode: 'bigint' }).notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull(),
    reportedValueDate: timestamp('reported_value_date', { withTimezone: true }),
    channel: paymentChannelEnum('channel').notNull().default('direct_to_creditor'),
    /** Beleg des Schuldners, sofern hochgeladen. */
    evidenceDocumentId: text('evidence_document_id'),
    note: text('note'),
    /** Gesetzte Frist, innerhalb derer der Glaeubiger bestaetigen soll. */
    confirmationDueAt: timestamp('confirmation_due_at', { withTimezone: true }),
    /** Auf welche `payments`-Zeile die Meldung gefuehrt hat. */
    confirmedPaymentId: text('confirmed_payment_id'),
    /** Belegter Widerspruch des Glaeubigers. */
    disputedAt: timestamp('disputed_at', { withTimezone: true }),
    disputeEvidenceDocumentId: text('dispute_evidence_document_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('payment_reports_claim_idx').on(table.claimId),
  }),
);

/** Bestaetigte Zahlungen. Nur diese veraendern den Zahlungsstand. */
export const payments = pgTable(
  'payments',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    valueDate: timestamp('value_date', { withTimezone: true }).notNull(),
    channel: paymentChannelEnum('channel').notNull().default('direct_to_creditor'),
    /** Wer bestaetigt hat. Nie der Schuldner. */
    confirmedBy: text('confirmed_by').notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
    /** Meldung, aus der die Zahlung hervorgegangen ist, sofern es eine gab. */
    reportId: text('report_id').references(() => paymentReports.id),
    /**
     * Ob die Bestaetigung durch Schweigen des Glaeubigers zustande kam.
     * Nur zulaessig, wenn die Zustimmungsfiktion freigegeben ist (L-16).
     */
    confirmedBySilence: boolean('confirmed_by_silence').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('payments_claim_idx').on(table.claimId),
    /** Eine Meldung fuehrt zu hoechstens einer bestaetigten Zahlung. */
    reportUnique: uniqueIndex('payments_report_unique').on(table.reportId),
  }),
);

/**
 * Anrechnung einer Zahlung auf die Bestandteile.
 *
 * Die Reihenfolge kommt aus der Konfiguration (§ 1416 ABGB, LEGAL-REVIEW
 * L-07). Hier steht nur das Ergebnis - nachvollziehbar, weil jede Zeile
 * die verwendete Konfigurationsversion traegt.
 */
export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: text('id').primaryKey(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    componentId: text('component_id')
      .notNull()
      .references(() => claimAmountComponents.id, { onDelete: 'restrict' }),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    orderConfigVersionId: text('order_config_version_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    paymentIdx: index('payment_allocations_payment_idx').on(table.paymentId),
    /** Je Zahlung und Komponente genau eine Anrechnungszeile. */
    paymentComponentUnique: uniqueIndex('payment_allocations_payment_component_unique').on(
      table.paymentId,
      table.componentId,
    ),
  }),
);

/** Einwendungen des Schuldners. Jede pausiert die Automatisierung. */
export const objections = pgTable(
  'objections',
  {
    id: text('id').primaryKey(),
    claimId: text('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    raisedAt: timestamp('raised_at', { withTimezone: true }).notNull(),
    /** Wortlaut der Einwendung. Beweissicherung. */
    statement: text('statement').notNull(),
    evidenceDocumentIds: jsonb('evidence_document_ids').$type<string[]>(),
    reviewStartedAt: timestamp('review_started_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    /** `true` = anerkannt, `false` = zurueckgewiesen, `null` = offen. */
    upheld: boolean('upheld'),
    decisionReason: text('decision_reason'),
    decidedBy: text('decided_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    claimIdx: index('objections_claim_idx').on(table.claimId),
  }),
);

export const claimsRelations = relations(claims, ({ many }) => ({
  parties: many(claimParties),
  components: many(claimAmountComponents),
  measures: many(collectionMeasures),
  payments: many(payments),
  paymentReports: many(paymentReports),
  objections: many(objections),
}));
