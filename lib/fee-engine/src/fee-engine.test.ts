import { describe, expect, it } from 'vitest';
import { ZERO, add, formatEuro, fromCents, parseEuro, sum } from '@fp/money';
import { demoRegistry, resolve } from '@fp/legal-config';
import {
  DebtorCostError,
  type PerformedMeasure,
  SuccessFeeError,
  canAdvance,
  computeDebtorCosts,
  computeSuccessFee,
  debtorTotal,
  isMeasurePermitted,
  nextStage,
  permittedMeasuresUpTo,
  previewSuccessFee,
  resolveIndexedAmount,
  selectSuccessFeeTier,
} from './index.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const successFee = resolve(demoRegistry, 'success_fee', NOW).value;
const schedule = resolve(demoRegistry, 'debtor_cost_schedule', NOW).value;
const policy = resolve(demoRegistry, 'escalation_policy', NOW).value;

const confirmed = (measure: PerformedMeasure['measure']): PerformedMeasure => ({
  measure,
  performedAt: NOW,
  appropriatenessConfirmed: true,
  confirmedBy: 'staff_1',
});

describe('Erfolgshonorar: Staffel nach Forderung, Satz auf Eingebrachtes', () => {
  it('waehlt die Stufe nach der Hauptforderung', () => {
    const cases: [string, number][] = [
      ['300,00', 1000],
      ['500,00', 1000],
      ['500,01', 900],
      ['1.500,00', 900],
      ['1.500,01', 700],
      ['5.000,00', 700],
      ['5.000,01', 600],
      ['10.000,00', 600],
      ['10.000,01', 500],
      ['50.000,00', 500],
    ];
    for (const [euro, expected] of cases) {
      expect(selectSuccessFeeTier(successFee, parseEuro(euro)).basisPoints).toBe(expected);
    }
  });

  it('rechnet auf den eingebrachten Betrag, nicht auf die Forderung', () => {
    // Ihr Beispiel: Forderung 10.000, Schuldner zahlt 4.000 -> 6 % von 4.000.
    const result = computeSuccessFee(successFee, {
      principal: parseEuro('10.000,00'),
      recovered: parseEuro('4.000,00'),
    });
    expect(result.appliedBasisPoints).toBe(600);
    expect(formatEuro(result.net)).toBe('€ 240,00');
    expect(formatEuro(result.vat)).toBe('€ 48,00');
    expect(formatEuro(result.gross)).toBe('€ 288,00');
  });

  it('trifft die Beispiele aus der Preisstaffel', () => {
    expect(formatEuro(previewSuccessFee(successFee, parseEuro('1.000,00')).net)).toBe(
      '€ 90,00',
    );
    expect(formatEuro(previewSuccessFee(successFee, parseEuro('5.000,00')).net)).toBe(
      '€ 350,00',
    );
    expect(formatEuro(previewSuccessFee(successFee, parseEuro('10.000,00')).net)).toBe(
      '€ 600,00',
    );
    expect(formatEuro(previewSuccessFee(successFee, parseEuro('20.000,00')).net)).toBe(
      '€ 1.000,00',
    );
  });

  it('berechnet bei erfolgloser Einbringung null', () => {
    const result = computeSuccessFee(successFee, {
      principal: parseEuro('5.000,00'),
      recovered: ZERO,
    });
    expect(formatEuro(result.net)).toBe('€ 0,00');
    expect(formatEuro(result.gross)).toBe('€ 0,00');
  });

  it('bleibt bei Teilzahlungen in Serie stimmig', () => {
    const principal = parseEuro('5.000,00');
    const parts = ['1.000,00', '1.500,00', '2.500,00'].map((e) =>
      computeSuccessFee(successFee, { principal, recovered: parseEuro(e) }).net,
    );
    // 7 % von 5.000 = 350; die Summe der Teilhonorare muss das treffen.
    expect(formatEuro(sum(parts))).toBe('€ 350,00');
  });

  it('haelt jeden Staffelsatz unter dem gesetzlichen Hoechstsatz', () => {
    for (const tier of successFee.tiers) {
      expect(tier.basisPoints).toBeLessThanOrEqual(1500);
    }
  });

  it('lehnt eine Forderung von null und negative Zahlungen ab', () => {
    expect(() =>
      computeSuccessFee(successFee, { principal: ZERO, recovered: ZERO }),
    ).toThrow(SuccessFeeError);
    expect(() =>
      computeSuccessFee(successFee, {
        principal: parseEuro('100,00'),
        recovered: fromCents(-1),
      }),
    ).toThrow(SuccessFeeError);
  });

  it('laesst einen Mindestbetrag den Hoechstsatz nicht sprengen', () => {
    const withMinimum = { ...successFee, minimumCents: '50000' };
    // 15 % von 100,00 EUR sind 15,00 EUR; ein Mindestbetrag von 500,00 EUR
    // waere unzulaessig und muss auffallen statt still zu wirken.
    expect(() =>
      computeSuccessFee(withMinimum, {
        principal: parseEuro('100,00'),
        recovered: parseEuro('100,00'),
      }),
    ).toThrow(/Hoechstsatz/);
  });
});

describe('Schuldnerkosten: Hoechstsatz ist kein Anspruch', () => {
  it('setzt ohne Angemessenheitspruefung nichts an', () => {
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('5.000,00'),
      performedMeasures: [
        { measure: 'first_reminder', performedAt: NOW, appropriatenessConfirmed: false },
      ],
      processingAppropriatenessConfirmed: false,
      debtorIsBusiness: false,
    });
    expect(formatEuro(result.total)).toBe('€ 0,00');
    expect(result.lines.every((l) => !l.chargeable)).toBe(true);
    expect(result.lines[0]?.note).toContain('§ 1333 Abs 2 ABGB');
  });

  it('weist Hoechstsatz und angesetzten Betrag getrennt aus', () => {
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('5.000,00'),
      performedMeasures: [],
      processingAppropriatenessConfirmed: true,
      debtorIsBusiness: false,
    });
    const processing = result.lines[0]!;
    // 8 % von 5.000 = 400 Hoechstsatz; angesetzt werden 60 % davon.
    expect(formatEuro(processing.statutoryCap)).toBe('€ 400,00');
    expect(formatEuro(processing.applied)).toBe('€ 240,00');
  });

  it('waehlt die Stufe der Bearbeitungskosten nach der Forderungshoehe', () => {
    const cap = (euro: string) =>
      formatEuro(
        computeDebtorCosts(schedule, {
          principal: parseEuro(euro),
          performedMeasures: [],
          processingAppropriatenessConfirmed: true,
          debtorIsBusiness: false,
        }).lines[0]!.statutoryCap,
      );
    expect(cap('50,00')).toBe('€ 20,35');
    expect(cap('200,00')).toBe('€ 44,00');
    expect(cap('500,00')).toBe('€ 85,00');
    expect(cap('1.000,00')).toBe('€ 80,00');
  });

  it('begrenzt den festen Hoechstbetrag auf die Forderung selbst', () => {
    // 20,35 EUR Hoechstsatz, aber die Forderung betraegt nur 10,00 EUR.
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('10,00'),
      performedMeasures: [],
      processingAppropriatenessConfirmed: true,
      debtorIsBusiness: false,
    });
    expect(formatEuro(result.lines[0]!.statutoryCap)).toBe('€ 10,00');
  });

  it('setzt Mahnkosten erst ab der Mindestforderung an', () => {
    const below = computeDebtorCosts(schedule, {
      principal: parseEuro('700,00'),
      performedMeasures: [confirmed('first_reminder')],
      processingAppropriatenessConfirmed: false,
      debtorIsBusiness: false,
    });
    expect(below.lines[1]?.chargeable).toBe(false);
    expect(below.lines[1]?.note).toContain('Mindesthoehe');

    const above = computeDebtorCosts(schedule, {
      principal: parseEuro('1.000,00'),
      performedMeasures: [confirmed('first_reminder')],
      processingAppropriatenessConfirmed: false,
      debtorIsBusiness: false,
    });
    // Hoechstsatz 50,87; angesetzt 50 % davon.
    expect(formatEuro(above.lines[1]!.statutoryCap)).toBe('€ 50,87');
    expect(formatEuro(above.lines[1]!.applied)).toBe('€ 25,43');
  });

  it('verrechnet dieselbe Massnahme nicht zweimal', () => {
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('5.000,00'),
      performedMeasures: [confirmed('first_reminder'), confirmed('first_reminder')],
      processingAppropriatenessConfirmed: false,
      debtorIsBusiness: false,
    });
    expect(result.lines[2]?.chargeable).toBe(false);
    expect(result.lines[2]?.note).toContain('bereits verrechnet');
  });

  it('belastet eine Ratenvereinbarung bewusst nicht', () => {
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('5.000,00'),
      performedMeasures: [confirmed('installment_agreement')],
      processingAppropriatenessConfirmed: false,
      debtorIsBusiness: false,
    });
    expect(formatEuro(result.lines[1]!.applied)).toBe('€ 0,00');
    expect(result.lines[1]?.note).toContain('bewusst nicht angelastet');
  });

  it('setzt fuer eine nicht konfigurierte Massnahme nichts an', () => {
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('5.000,00'),
      performedMeasures: [confirmed('asset_investigation')],
      processingAppropriatenessConfirmed: false,
      debtorIsBusiness: false,
    });
    expect(result.lines[1]?.chargeable).toBe(false);
    expect(formatEuro(result.lines[1]!.applied)).toBe('€ 0,00');
  });

  it('haelt jeden Posten unter seinem Hoechstsatz', () => {
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('5.000,00'),
      performedMeasures: [confirmed('first_reminder'), confirmed('second_reminder')],
      processingAppropriatenessConfirmed: true,
      debtorIsBusiness: false,
    });
    for (const line of result.lines) {
      expect(line.applied <= line.statutoryCap).toBe(true);
    }
    expect(result.total <= result.statutoryMaximum).toBe(true);
  });

  it('warnt, solange der Indexstand ungeprueft ist', () => {
    const result = computeDebtorCosts(schedule, {
      principal: parseEuro('50,00'),
      performedMeasures: [],
      processingAppropriatenessConfirmed: true,
      debtorIsBusiness: false,
    });
    expect(result.warnings.join(' ')).toContain('L-17');
  });

  it('bildet die Gesamtforderung aus Hauptforderung, Zinsen und Kosten', () => {
    const costs = computeDebtorCosts(schedule, {
      principal: parseEuro('5.000,00'),
      performedMeasures: [confirmed('first_reminder')],
      processingAppropriatenessConfirmed: true,
      debtorIsBusiness: false,
    });
    const total = debtorTotal(parseEuro('5.000,00'), parseEuro('120,00'), costs);
    expect(formatEuro(total)).toBe(formatEuro(add(parseEuro('5.120,00'), costs.total)));
  });

  it('lehnt eine Forderung von null ab', () => {
    expect(() =>
      computeDebtorCosts(schedule, {
        principal: ZERO,
        performedMeasures: [],
        processingAppropriatenessConfirmed: true,
        debtorIsBusiness: false,
      }),
    ).toThrow(DebtorCostError);
  });
});

describe('Trennung der beiden Erloesarten', () => {
  it('haengt das Erfolgshonorar nicht von den Schuldnerkosten ab', () => {
    const principal = parseEuro('5.000,00');
    const fee = computeSuccessFee(successFee, { principal, recovered: principal });
    const withCosts = computeDebtorCosts(schedule, {
      principal,
      performedMeasures: [confirmed('first_reminder'), confirmed('second_reminder')],
      processingAppropriatenessConfirmed: true,
      debtorIsBusiness: false,
    });
    const withoutCosts = computeDebtorCosts(schedule, {
      principal,
      performedMeasures: [],
      processingAppropriatenessConfirmed: false,
      debtorIsBusiness: false,
    });

    expect(formatEuro(fee.net)).toBe('€ 350,00');
    expect(withCosts.total).not.toBe(withoutCosts.total);
    // Das Honorar bleibt in beiden Faellen unveraendert.
    expect(
      formatEuro(computeSuccessFee(successFee, { principal, recovered: principal }).net),
    ).toBe('€ 350,00');
  });
});

describe('Eskalationsstufen', () => {
  it('kennt die Reihenfolge', () => {
    expect(nextStage('friendly_reminder')).toBe('collection_notice');
    expect(nextStage('collection_notice')).toBe('final_notice');
    expect(nextStage('final_notice')).toBe('legal_review');
    expect(nextStage('legal_review')).toBeNull();
  });

  it('erlaubt auf der ersten Stufe keine kostenpflichtige Massnahme', () => {
    expect(permittedMeasuresUpTo(policy, 'friendly_reminder')).toEqual([]);
    expect(isMeasurePermitted(policy, 'friendly_reminder', 'first_reminder')).toBe(false);
  });

  it('gibt Massnahmen kumulativ frei', () => {
    expect(permittedMeasuresUpTo(policy, 'collection_notice')).toContain('first_reminder');
    const atFinal = permittedMeasuresUpTo(policy, 'final_notice');
    expect(atFinal).toContain('first_reminder');
    expect(atFinal).toContain('second_reminder');
  });

  it('schreitet nicht fort, solange die Frist laeuft', () => {
    const decision = canAdvance(policy, 'collection_notice', {
      paused: false,
      deadlineExpired: false,
      settled: false,
      humanApprovalPresent: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Zahlungsfrist');
  });

  it('schreitet bei pausierter Bearbeitung nicht fort', () => {
    const decision = canAdvance(policy, 'collection_notice', {
      paused: true,
      deadlineExpired: true,
      settled: false,
      humanApprovalPresent: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('pausiert');
  });

  it('verlangt vor der letzten Zahlungsaufforderung eine Freigabe', () => {
    const withoutApproval = canAdvance(policy, 'collection_notice', {
      paused: false,
      deadlineExpired: true,
      settled: false,
      humanApprovalPresent: false,
    });
    expect(withoutApproval.allowed).toBe(false);
    expect(withoutApproval.reason).toContain('Freigabe');

    const withApproval = canAdvance(policy, 'collection_notice', {
      paused: false,
      deadlineExpired: true,
      settled: false,
      humanApprovalPresent: true,
    });
    expect(withApproval.allowed).toBe(true);
    expect(withApproval.target).toBe('final_notice');
  });

  it('schreitet nach Tilgung nicht fort', () => {
    const decision = canAdvance(policy, 'friendly_reminder', {
      paused: false,
      deadlineExpired: true,
      settled: true,
      humanApprovalPresent: true,
    });
    expect(decision.allowed).toBe(false);
  });

  it('endet auf der letzten Stufe', () => {
    const decision = canAdvance(policy, 'legal_review', {
      paused: false,
      deadlineExpired: true,
      settled: false,
      humanApprovalPresent: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.target).toBeNull();
  });
});

describe('Indexgebundene Betraege', () => {
  it('rechnet Basisbetrag mal Indexfaktor', () => {
    expect(
      formatEuro(
        resolveIndexedAmount({
          baseAmountCents: '5087',
          indexFactorBasisPoints: 10_000,
          indexReference: 'x',
        }),
      ),
    ).toBe('€ 50,87');
    expect(
      formatEuro(
        resolveIndexedAmount({
          baseAmountCents: '5087',
          indexFactorBasisPoints: 13_500,
          indexReference: 'x',
        }),
      ),
    ).toBe('€ 68,67');
  });
});
