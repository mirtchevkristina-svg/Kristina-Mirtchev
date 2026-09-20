import { describe, expect, it } from 'vitest';
import {
  type Actor,
  type ClaimEvent,
  type ClaimState,
  INITIAL_STATE,
  TransitionError,
  applyEvent,
  automationAllowed,
  nextStepLabel,
  replay,
  uiGroup,
} from './index.js';

const creditor: Actor = { kind: 'creditor_user', id: 'user_1' };
const backOffice: Actor = { kind: 'back_office', id: 'staff_1' };
const debtor: Actor = { kind: 'debtor', id: 'token_1' };
const system: Actor = { kind: 'system', id: 'job:activation' };
const ai: Actor = { kind: 'ai', id: 'model:pre-check' };

/** Bringt einen B2B-Fall auf den Stand "aktiv in Bearbeitung". */
function activeState(): ClaimState {
  return replay(
    [
      { type: 'claim_submitted', actor: creditor, debtorIsConsumer: false },
      { type: 'review_passed', actor: backOffice },
      { type: 'activation_completed', actor: system, orderId: 'order_1' },
    ],
    INITIAL_STATE,
  );
}

describe('Invariante: KI setzt keinen Status (CLAUDE.md 1.3)', () => {
  const events: ClaimEvent[] = [
    { type: 'review_declined', actor: ai, reason: 'unschluessig' },
    { type: 'review_passed', actor: ai },
    { type: 'objection_rejected', actor: ai, reason: 'unbegruendet' },
    {
      type: 'escalation_requested',
      actor: ai,
      approval: { userId: 'u', at: new Date(), reason: 'r' },
    },
  ];

  for (const event of events) {
    it(`lehnt "${event.type}" durch die KI ab`, () => {
      expect(() => applyEvent(activeState(), event)).toThrow(TransitionError);
      try {
        applyEvent(activeState(), event);
      } catch (error) {
        expect((error as TransitionError).code).toBe('forbidden_actor');
        expect((error as Error).message).toContain('menschliche Bestaetigung');
      }
    });
  }
});

describe('Invariante: B2C geht durch manuelle Pruefung (CLAUDE.md 1.5)', () => {
  it('pausiert einen Verbraucherfall sofort bei Einreichung', () => {
    const result = applyEvent(INITIAL_STATE, {
      type: 'claim_submitted',
      actor: creditor,
      debtorIsConsumer: true,
    });
    expect(result.state.lifecycle).toBe('in_review');
    expect(result.state.pauseReasons).toContain('manual_review');
    expect(automationAllowed(result.state)).toBe(false);
    expect(result.effects).toContainEqual({
      type: 'require_manual_review',
      reason: 'Verbraucherfall: Pruefung vor dem ersten Schuldnerkontakt',
    });
  });

  it('laesst einen Unternehmensfall ohne Zwangspause einreichen', () => {
    const result = applyEvent(INITIAL_STATE, {
      type: 'claim_submitted',
      actor: creditor,
      debtorIsConsumer: false,
    });
    expect(result.state.lifecycle).toBe('submitted');
    expect(result.state.pauseReasons).toEqual([]);
  });
});

describe('Invariante: Einwendung stoppt alles (CLAUDE.md 1.4)', () => {
  it('pausiert die Automatisierung und bricht geplante Jobs ab', () => {
    const state = activeState();
    expect(automationAllowed(state)).toBe(true);

    const result = applyEvent(state, {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'obj_1',
    });

    expect(result.state.dispute).toBe('raised');
    expect(result.state.pauseReasons).toContain('objection');
    expect(automationAllowed(result.state)).toBe(false);
    expect(result.effects).toContainEqual({ type: 'cancel_scheduled_jobs' });
    expect(result.effects).toContainEqual({ type: 'pause_automation', reason: 'objection' });
  });

  it('laesst sich nicht ueber ein allgemeines Fortsetzen aufheben', () => {
    const paused = applyEvent(activeState(), {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'obj_1',
    }).state;

    expect(() =>
      applyEvent(paused, { type: 'claim_resumed', actor: creditor, reason: 'objection' }),
    ).toThrow(/objection_upheld oder objection_rejected/);
  });

  it('nimmt die Bearbeitung erst nach Zurueckweisung wieder auf', () => {
    const paused = applyEvent(activeState(), {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'obj_1',
    }).state;
    const reviewing = applyEvent(paused, {
      type: 'objection_review_started',
      actor: creditor,
    }).state;
    const result = applyEvent(reviewing, {
      type: 'objection_rejected',
      actor: creditor,
      reason: 'Rechnung nachweislich zugestellt',
    });

    expect(result.state.dispute).toBe('rejected');
    expect(automationAllowed(result.state)).toBe(true);
    expect(result.effects).toContainEqual({ type: 'resume_automation' });
  });

  it('schliesst den Fall, wenn die Einwendung anerkannt wird', () => {
    const paused = applyEvent(activeState(), {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'obj_1',
    }).state;
    const result = applyEvent(paused, {
      type: 'objection_upheld',
      actor: creditor,
      reason: 'Leistung war mangelhaft',
    });
    expect(result.state.lifecycle).toBe('closed');
    expect(result.state.pauseReasons).toEqual([]);
  });

  it('nimmt die Bearbeitung nicht wieder auf, solange ein zweiter Pausegrund gilt', () => {
    let state = applyEvent(activeState(), {
      type: 'insolvency_detected',
      actor: system,
      reference: 'Ediktsdatei 1 S 1/26a',
    }).state;
    state = applyEvent(state, {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'obj_1',
    }).state;

    const result = applyEvent(state, {
      type: 'objection_rejected',
      actor: creditor,
      reason: 'unbegruendet',
    });

    expect(result.state.pauseReasons).toEqual(['insolvency']);
    expect(automationAllowed(result.state)).toBe(false);
    expect(result.effects).not.toContainEqual({ type: 'resume_automation' });
  });

  it('lehnt eine zweite offene Einwendung ab', () => {
    const paused = applyEvent(activeState(), {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'obj_1',
    }).state;
    expect(() =>
      applyEvent(paused, { type: 'objection_raised', actor: debtor, objectionId: 'obj_2' }),
    ).toThrow(/bereits eine offene Einwendung/);
  });
});

describe('Invariante: keine automatische Eskalation (CLAUDE.md 1.2)', () => {
  it('verlangt eine dokumentierte Freigabe mit Begruendung', () => {
    const state = activeState();
    expect(() =>
      applyEvent(state, {
        type: 'escalation_requested',
        actor: creditor,
        approval: { userId: '', at: new Date(), reason: 'egal' },
      }),
    ).toThrow(TransitionError);

    expect(() =>
      applyEvent(state, {
        type: 'escalation_requested',
        actor: creditor,
        approval: { userId: 'user_1', at: new Date(), reason: '   ' },
      }),
    ).toThrow(/dokumentierte Freigabe/);
  });

  it('erlaubt keine Eskalation durch das System', () => {
    expect(() =>
      applyEvent(activeState(), {
        type: 'escalation_requested',
        actor: system,
        approval: { userId: 'user_1', at: new Date(), reason: 'ueberfaellig' },
      }),
    ).toThrow(/darf das Ereignis/);
  });

  it('erlaubt keine Eskalation bei offener Einwendung', () => {
    const disputed = applyEvent(activeState(), {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'obj_1',
    }).state;
    expect(() =>
      applyEvent(disputed, {
        type: 'escalation_requested',
        actor: creditor,
        approval: { userId: 'user_1', at: new Date(), reason: 'Uebergabe gewuenscht' },
      }),
    ).toThrow(/Einwendung offen/);
  });

  it('stoppt die Portal-Jobs nach Annahme durch die Kanzlei', () => {
    let state = applyEvent(activeState(), {
      type: 'escalation_requested',
      actor: creditor,
      approval: { userId: 'user_1', at: new Date(), reason: 'Zahlungsunwilligkeit' },
    }).state;
    state = applyEvent(state, {
      type: 'escalation_handed_over',
      actor: backOffice,
      exportId: 'exp_1',
    }).state;
    expect(state.pauseReasons).toContain('escalation');
    expect(automationAllowed(state)).toBe(false);

    const accepted = applyEvent(state, { type: 'escalation_accepted', actor: backOffice });
    expect(accepted.state.lifecycle).toBe('closed');
    expect(accepted.effects).toContainEqual({ type: 'cancel_scheduled_jobs' });
  });

  it('setzt die Bearbeitung fort, wenn die Kanzlei ablehnt', () => {
    let state = applyEvent(activeState(), {
      type: 'escalation_requested',
      actor: creditor,
      approval: { userId: 'user_1', at: new Date(), reason: 'Zahlungsunwilligkeit' },
    }).state;
    state = applyEvent(state, {
      type: 'escalation_handed_over',
      actor: backOffice,
      exportId: 'exp_1',
    }).state;
    const result = applyEvent(state, {
      type: 'escalation_declined_by_firm',
      actor: backOffice,
      reason: 'Kein Mandat',
    });
    expect(result.state.escalation).toBe('declined_by_firm');
    expect(automationAllowed(result.state)).toBe(true);
  });
});

describe('Zahlungen (CLAUDE.md 4.3)', () => {
  it('aendert den Zahlungsstand bei einer blossen Meldung nicht', () => {
    const state = activeState();
    const result = applyEvent(state, {
      type: 'payment_reported',
      actor: debtor,
      reportId: 'rep_1',
    });
    expect(result.state.payment).toBe('none');
    expect(result.state).toEqual(state);
    expect(result.effects).toContainEqual({
      type: 'notify_creditor',
      template: 'payment_reported_confirm',
    });
  });

  it('setzt bei bestaetigter Teilzahlung den Stand auf partial', () => {
    const result = applyEvent(activeState(), {
      type: 'payment_confirmed',
      actor: creditor,
      paymentId: 'pay_1',
      settlesClaimInFull: false,
    });
    expect(result.state.payment).toBe('partial');
    expect(result.state.lifecycle).toBe('active');
    expect(result.effects).toContainEqual({
      type: 'create_success_fee_calculation',
      paymentId: 'pay_1',
    });
  });

  it('schliesst den Fall bei vollstaendiger Tilgung', () => {
    const result = applyEvent(activeState(), {
      type: 'payment_confirmed',
      actor: creditor,
      paymentId: 'pay_2',
      settlesClaimInFull: true,
    });
    expect(result.state.payment).toBe('paid');
    expect(result.state.lifecycle).toBe('closed');
    expect(automationAllowed(result.state)).toBe(false);
  });

  it('erlaubt dem Schuldner keine Bestaetigung der eigenen Zahlung', () => {
    expect(() =>
      applyEvent(activeState(), {
        type: 'payment_confirmed',
        actor: debtor,
        paymentId: 'pay_3',
        settlesClaimInFull: true,
      }),
    ).toThrow(/darf das Ereignis/);
  });
});

describe('Ratenplan', () => {
  it('pausiert Mahnstufen, solange der Plan laeuft', () => {
    let state = applyEvent(activeState(), {
      type: 'installment_requested',
      actor: debtor,
      requestId: 'req_1',
    }).state;
    state = applyEvent(state, {
      type: 'installment_activated',
      actor: creditor,
      planId: 'plan_1',
    }).state;

    expect(state.installment).toBe('active');
    expect(state.pauseReasons).toContain('installment_plan');
    expect(automationAllowed(state)).toBe(false);
    expect(uiGroup(state)).toBe('ratenzahlung');
  });

  it('nimmt die Mahnung bei Scheitern wieder auf', () => {
    let state = applyEvent(activeState(), {
      type: 'installment_requested',
      actor: debtor,
      requestId: 'req_1',
    }).state;
    state = applyEvent(state, {
      type: 'installment_activated',
      actor: creditor,
      planId: 'plan_1',
    }).state;
    const result = applyEvent(state, {
      type: 'installment_defaulted',
      actor: system,
      planId: 'plan_1',
    });

    expect(result.state.installment).toBe('defaulted');
    expect(automationAllowed(result.state)).toBe(true);
  });

  it('erlaubt einen Gegenvorschlag und danach die Aktivierung', () => {
    let state = applyEvent(activeState(), {
      type: 'installment_requested',
      actor: debtor,
      requestId: 'req_1',
    }).state;
    state = applyEvent(state, {
      type: 'installment_proposed',
      actor: creditor,
      planId: 'plan_1',
    }).state;
    expect(state.installment).toBe('proposed_by_creditor');
    state = applyEvent(state, {
      type: 'installment_activated',
      actor: debtor,
      planId: 'plan_1',
    }).state;
    expect(state.installment).toBe('active');
  });

  it('lehnt eine Aktivierung ohne vorangehende Anfrage ab', () => {
    expect(() =>
      applyEvent(activeState(), {
        type: 'installment_activated',
        actor: creditor,
        planId: 'plan_1',
      }),
    ).toThrow(/Ratenstand "none"/);
  });
});

describe('Insolvenz', () => {
  it('pausiert die Bearbeitung und bricht Jobs ab', () => {
    const result = applyEvent(activeState(), {
      type: 'insolvency_detected',
      actor: system,
      reference: 'Ediktsdatei 1 S 1/26a',
    });
    expect(result.state.pauseReasons).toContain('insolvency');
    expect(result.effects).toContainEqual({ type: 'cancel_scheduled_jobs' });
    expect(result.summary).toContain('1 S 1/26a');
  });

  it('kann nur aufgehoben werden, wenn ein Vermerk gesetzt ist', () => {
    expect(() =>
      applyEvent(activeState(), { type: 'insolvency_cleared', actor: backOffice }),
    ).toThrow(/Kein Insolvenzvermerk/);
  });
});

describe('Lebenszyklus-Wachen', () => {
  it('erlaubt keine Aktivierung ohne vorangehende Freigabe', () => {
    const submitted = applyEvent(INITIAL_STATE, {
      type: 'claim_submitted',
      actor: creditor,
      debtorIsConsumer: false,
    }).state;
    expect(() =>
      applyEvent(submitted, {
        type: 'activation_completed',
        actor: system,
        orderId: 'order_1',
      }),
    ).toThrow(/nicht erlaubt/);
  });

  it('erlaubt keine Schuldneraktion vor der Aktivierung', () => {
    const submitted = applyEvent(INITIAL_STATE, {
      type: 'claim_submitted',
      actor: creditor,
      debtorIsConsumer: false,
    }).state;
    expect(() =>
      applyEvent(submitted, { type: 'objection_raised', actor: debtor, objectionId: 'o' }),
    ).toThrow(/nur bei aktiver Bearbeitung/);
  });

  it('erlaubt keinen doppelten Abschluss', () => {
    const closed = applyEvent(activeState(), {
      type: 'claim_closed',
      actor: creditor,
      outcome: 'withdrawn_by_creditor',
      note: 'Kunde hat direkt bezahlt',
    }).state;
    expect(() =>
      applyEvent(closed, {
        type: 'claim_closed',
        actor: creditor,
        outcome: 'written_off',
        note: 'nochmal',
      }),
    ).toThrow(/bereits abgeschlossen/);
  });

  it('erlaubt keine doppelte Pause mit demselben Grund', () => {
    const paused = applyEvent(activeState(), {
      type: 'claim_paused',
      actor: creditor,
      reason: 'creditor_request',
    }).state;
    expect(() =>
      applyEvent(paused, { type: 'claim_paused', actor: creditor, reason: 'creditor_request' }),
    ).toThrow(/bereits gesetzt/);
  });
});

describe('UI-Mapping', () => {
  it('bildet Zustaende auf Gruppen ab', () => {
    expect(uiGroup(INITIAL_STATE)).toBe('entwurf');
    expect(uiGroup(activeState())).toBe('in_bearbeitung');

    const paid = applyEvent(activeState(), {
      type: 'payment_confirmed',
      actor: creditor,
      paymentId: 'p',
      settlesClaimInFull: true,
    }).state;
    expect(uiGroup(paid)).toBe('bezahlt');

    const withdrawn = applyEvent(activeState(), {
      type: 'claim_closed',
      actor: creditor,
      outcome: 'withdrawn_by_creditor',
      note: 'x',
    }).state;
    expect(uiGroup(withdrawn)).toBe('geschlossen');
  });

  it('nennt statt eines technischen Status den naechsten Schritt', () => {
    const disputed = applyEvent(activeState(), {
      type: 'objection_raised',
      actor: debtor,
      objectionId: 'o',
    }).state;
    expect(nextStepLabel(disputed)).toBe('Einwendung pruefen');
    expect(nextStepLabel(INITIAL_STATE)).toContain('einreichen');
  });
});

describe('replay', () => {
  it('rekonstruiert den Zustand aus der Ereigniskette', () => {
    const events: ClaimEvent[] = [
      { type: 'claim_submitted', actor: creditor, debtorIsConsumer: false },
      { type: 'review_passed', actor: backOffice },
      { type: 'activation_completed', actor: system, orderId: 'o1' },
      { type: 'objection_raised', actor: debtor, objectionId: 'obj' },
      { type: 'objection_rejected', actor: creditor, reason: 'unbegruendet' },
      {
        type: 'payment_confirmed',
        actor: creditor,
        paymentId: 'p1',
        settlesClaimInFull: false,
      },
    ];
    const state = replay(events, INITIAL_STATE);
    expect(state.payment).toBe('partial');
    expect(state.dispute).toBe('rejected');
    expect(state.lifecycle).toBe('active');
    expect(automationAllowed(state)).toBe(true);
  });

  it('ist deterministisch und veraendert den Eingangszustand nicht', () => {
    const before = activeState();
    const snapshot = JSON.stringify(before);
    applyEvent(before, { type: 'objection_raised', actor: debtor, objectionId: 'o' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
