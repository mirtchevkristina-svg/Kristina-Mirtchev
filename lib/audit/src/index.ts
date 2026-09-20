/**
 * Append-only Audit (CLAUDE.md 1.9).
 *
 * Jede fachlich relevante Aenderung erzeugt genau einen unveraenderlichen
 * Eintrag. Es gibt in diesem Modul bewusst keine Funktion zum Aendern oder
 * Loeschen eines Eintrags; die Unveraenderlichkeit wird zusaetzlich in der
 * Datenbank durch einen Trigger erzwungen (siehe db/migrations).
 */

/** Gegenstand, auf den sich ein Audit-Eintrag bezieht. */
export type AuditSubject =
  | 'claim'
  | 'claim_status'
  | 'amount'
  | 'payment'
  | 'payment_report'
  | 'objection'
  | 'installment_plan'
  | 'document'
  | 'debtor_access'
  | 'membership'
  | 'consent'
  | 'approval'
  | 'escalation'
  | 'order'
  | 'ai_assessment'
  | 'config';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'confirmed'
  | 'rejected'
  | 'approved'
  | 'viewed'
  | 'exported'
  | 'sent'
  | 'access_granted'
  | 'access_denied'
  | 'deleted';

/** Wer gehandelt hat. Entspricht `Actor` der State Machine. */
export interface AuditActor {
  readonly kind: 'creditor_user' | 'back_office' | 'debtor' | 'system' | 'ai';
  readonly id: string;
  /** Rolle innerhalb des Unternehmens, sofern zutreffend. */
  readonly role?: string;
}

export interface AuditEventInput {
  readonly companyId: string | null;
  readonly claimId: string | null;
  readonly subject: AuditSubject;
  readonly subjectId: string | null;
  readonly action: AuditAction;
  readonly actor: AuditActor;
  /**
   * Sachliche Beschreibung. Enthaelt bewusst keine personenbezogenen Daten;
   * Betroffene werden ueber IDs referenziert (CLAUDE.md 1.11).
   */
  readonly summary: string;
  /**
   * Strukturierte Zusatzdaten. Werden vor dem Schreiben redigiert,
   * damit keine PII in den Audit-Text gelangt.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Vorheriger und neuer Zustand bei Statuswechseln. */
  readonly previousState?: Readonly<Record<string, unknown>>;
  readonly newState?: Readonly<Record<string, unknown>>;
  /** Gehashte IP-Adresse, nie die Klartext-Adresse. */
  readonly ipHash?: string;
  /** Verweis auf die Anfrage, um Ereignisse einer Aktion zuzuordnen. */
  readonly requestId?: string;
}

export interface AuditEvent extends AuditEventInput {
  readonly id: string;
  readonly occurredAt: Date;
}

/**
 * Senke fuer Audit-Eintraege. Implementierungen schreiben in derselben
 * Transaktion wie die fachliche Aenderung.
 *
 * Absichtlich nur `append` - kein `update`, kein `delete`.
 */
export interface AuditSink {
  append(event: AuditEvent): Promise<void>;
}

export interface AuditClock {
  now(): Date;
}

export interface AuditIdGenerator {
  next(): string;
}

/**
 * Zentrale Audit-Funktion. Alle Schreibpfade der Anwendung gehen hier durch,
 * damit Format und Redaktion an genau einer Stelle festgelegt sind.
 */
export class AuditRecorder {
  constructor(
    private readonly sink: AuditSink,
    private readonly clock: AuditClock,
    private readonly ids: AuditIdGenerator,
    private readonly redact: (value: unknown) => unknown,
  ) {}

  async record(input: AuditEventInput): Promise<AuditEvent> {
    const event: AuditEvent = {
      ...input,
      ...(input.metadata === undefined
        ? {}
        : { metadata: this.redact(input.metadata) as Record<string, unknown> }),
      ...(input.previousState === undefined
        ? {}
        : { previousState: this.redact(input.previousState) as Record<string, unknown> }),
      ...(input.newState === undefined
        ? {}
        : { newState: this.redact(input.newState) as Record<string, unknown> }),
      id: this.ids.next(),
      occurredAt: this.clock.now(),
    };
    await this.sink.append(event);
    return event;
  }
}
