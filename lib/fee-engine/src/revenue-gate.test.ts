import { describe, expect, it } from 'vitest';
import { formatEuro, parseEuro } from '@fp/money';
import { demoRegistry, resolve, validateRegistry } from '@fp/legal-config';
import type { RevenueModelRule } from '@fp/legal-config';
import {
  RevenueStreamBlockedError,
  assertStreamEnabled,
  blockedStreams,
  computeDebtorCosts,
  computeSuccessFee,
  isStreamEnabled,
  openCostLiability,
  previewSuccessFee,
} from './index.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const model = resolve(demoRegistry, 'revenue_model', NOW).value;
const schedule = resolve(demoRegistry, 'debtor_cost_schedule', NOW).value;
const successFee = resolve(demoRegistry, 'success_fee', NOW).value;
const liabilityRule = resolve(demoRegistry, 'cost_liability', NOW).value;

const unblocked: RevenueModelRule = {
  streams: {
    creditor_success_fee: { enabled: true, blockedBy: null, note: 'frei' },
    creditor_collection_fee: { enabled: true, blockedBy: null, note: 'frei' },
    debtor_recoverable_costs: { enabled: true, blockedBy: null, note: 'frei' },
  },
};

describe('L-20 als Go/No-Go', () => {
  it('sperrt die beiden schuldnerabhaengigen Saeulen in der Voreinstellung', () => {
    expect(isStreamEnabled(model, 'debtor_recoverable_costs')).toBe(false);
    expect(isStreamEnabled(model, 'creditor_collection_fee')).toBe(false);
  });

  it('nennt beim Sperren die offene Rechtsfrage', () => {
    expect(() => assertStreamEnabled(model, 'debtor_recoverable_costs')).toThrow(
      RevenueStreamBlockedError,
    );
    try {
      assertStreamEnabled(model, 'debtor_recoverable_costs');
    } catch (error) {
      expect((error as RevenueStreamBlockedError).blockedBy).toBe('L-20');
      expect((error as Error).message).toContain('L-20');
      expect((error as Error).message).toContain('LEGAL_OPEN_QUESTIONS');
    }
  });

  it('verhindert, dass die Schuldnerkosten-Engine ueberhaupt rechnet', () => {
    expect(() =>
      computeDebtorCosts(
        schedule,
        {
          principal: parseEuro('5.000,00'),
          performedMeasures: [],
          processingAppropriatenessConfirmed: true,
          debtorIsBusiness: true,
        },
        undefined,
        model,
      ),
    ).toThrow(RevenueStreamBlockedError);
  });

  it('verhindert das Begruenden der gestundeten Kostenforderung', () => {
    expect(() =>
      openCostLiability(liabilityRule, 'clm_1', parseEuro('300,00'), NOW, model),
    ).toThrow(RevenueStreamBlockedError);
  });

  it('rechnet nach Freischaltung wieder', () => {
    const result = computeDebtorCosts(
      schedule,
      {
        principal: parseEuro('5.000,00'),
        performedMeasures: [],
        processingAppropriatenessConfirmed: true,
        debtorIsBusiness: true,
      },
      undefined,
      unblocked,
    );
    expect(result.total > 0n).toBe(true);
  });

  it('listet die gesperrten Saeulen fuer die Betriebsanzeige', () => {
    const blocked = blockedStreams(model);
    expect(blocked).toHaveLength(2);
    expect(blocked.every((b) => b.blockedBy === 'L-20')).toBe(true);
    expect(blocked.every((b) => b.note.length > 0)).toBe(true);
  });

  it('lehnt eine Konfiguration ab, die eine gesperrte Saeule aktiviert', () => {
    const contradictory = {
      ...demoRegistry,
      revenue_model: {
        ...demoRegistry.revenue_model,
        versions: [
          {
            ...demoRegistry.revenue_model.versions[0]!,
            value: {
              streams: {
                ...model.streams,
                debtor_recoverable_costs: {
                  enabled: true,
                  blockedBy: 'L-20',
                  note: 'widerspruechlich',
                },
              },
            },
          },
        ],
      },
    };
    const issues = validateRegistry(contradictory);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('gesperrt');
  });
});

describe('Das Erfolgshonorar bleibt davon unberuehrt', () => {
  it('ist in der Voreinstellung freigeschaltet', () => {
    expect(isStreamEnabled(model, 'creditor_success_fee')).toBe(true);
  });

  it('rechnet, obwohl beide anderen Saeulen gesperrt sind', () => {
    const fee = computeSuccessFee(successFee, {
      principal: parseEuro('5.000,00'),
      recovered: parseEuro('5.000,00'),
    });
    expect(fee.net > 0n).toBe(true);
  });

  it('kennt das Erloesmodell gar nicht', async () => {
    // Die Entkopplung ist strukturell, nicht nur eine Vereinbarung:
    // das Honorarmodul importiert die Sperre nicht.
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./success-fee.ts', import.meta.url), 'utf8'),
    );
    expect(source).not.toContain('revenue-gate');
    expect(source).not.toContain('RevenueModel');
  });

  it('traegt das Grundgeschaeft allein, wenn L-20 negativ ausgeht', () => {
    const fallback: RevenueModelRule = {
      streams: {
        creditor_success_fee: { enabled: true, blockedBy: null, note: 'bleibt' },
        creditor_collection_fee: { enabled: false, blockedBy: null, note: 'L-20 negativ' },
        debtor_recoverable_costs: { enabled: false, blockedBy: null, note: 'L-20 negativ' },
      },
    };
    expect(isStreamEnabled(fallback, 'creditor_success_fee')).toBe(true);
    expect(() => assertStreamEnabled(fallback, 'creditor_success_fee')).not.toThrow();
    expect(formatEuro(previewSuccessFee(successFee, parseEuro('5.000,00')).net)).toBe(
      '\u20ac\u00a0350,00',
    );
  });
});
