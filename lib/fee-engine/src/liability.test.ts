import { describe, expect, it } from 'vitest';
import { ZERO, formatEuro, fromCents, parseEuro } from '@fp/money';
import { demoRegistry, resolve } from '@fp/legal-config';
import {
  CostLiabilityError,
  InvoiceError,
  applyRecovery,
  buildCreditorInvoice,
  computeDebtorCosts,
  computeSuccessFee,
  creditorNetProceeds,
  isUncollectible,
  openCostLiability,
  outstanding,
  successFeeBaseFromAllocation,
  waiveRemaining,
} from './index.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const rule = resolve(demoRegistry, 'cost_liability', NOW).value;
const flatFee = resolve(demoRegistry, 'commercial_flat_fee', NOW).value;
const schedule = resolve(demoRegistry, 'debtor_cost_schedule', NOW).value;
const successFee = resolve(demoRegistry, 'success_fee', NOW).value;

describe('Kostenforderung gegen den Glaeubiger (Stundung und Verzicht)', () => {
  it('entsteht bei Auftragserteilung und ist zunaechst gestundet', () => {
    const liability = openCostLiability(rule, 'clm_1', parseEuro('300,00'), NOW);
    expect(liability.state).toBe('deferred');
    expect(formatEuro(outstanding(liability))).toBe('€ 300,00');
  });

  it('verweigert die Begruendung, wenn die Konfiguration sie nicht vorsieht', () => {
    // Ohne Forderung gegen den Glaeubiger fehlt der Schaden, den der
    // Schuldner ersetzen soll. Das muss auffallen, nicht stillschweigend
    // funktionieren.
    expect(() =>
      openCostLiability({ ...rule, creditorOwesAtOrder: false }, 'clm_1', parseEuro('300,00'), NOW),
    ).toThrow(/fehlt die Grundlage/);
  });

  it('bucht eingebrachte Betraege und meldet Teil- und Volldeckung', () => {
    let liability = openCostLiability(rule, 'clm_1', parseEuro('300,00'), NOW);

    const first = applyRecovery(liability, parseEuro('100,00'));
    liability = first.liability;
    expect(liability.state).toBe('partially_settled');
    expect(formatEuro(outstanding(liability))).toBe('€ 200,00');
    expect(formatEuro(first.excess)).toBe('€ 0,00');

    const second = applyRecovery(liability, parseEuro('200,00'));
    expect(second.liability.state).toBe('settled');
    expect(formatEuro(outstanding(second.liability))).toBe('€ 0,00');
  });

  it('behaelt einen ueberschiessenden Betrag nicht ein', () => {
    const liability = openCostLiability(rule, 'clm_1', parseEuro('300,00'), NOW);
    const result = applyRecovery(liability, parseEuro('500,00'));
    expect(result.liability.state).toBe('settled');
    expect(formatEuro(result.excess)).toBe('€ 200,00');
  });

  it('erlaesst den Rest bei Uneinbringlichkeit', () => {
    let liability = openCostLiability(rule, 'clm_1', parseEuro('300,00'), NOW);
    liability = applyRecovery(liability, parseEuro('50,00')).liability;
    const waived = waiveRemaining(rule, liability, 'Schuldner zahlungsunfaehig');

    expect(waived.state).toBe('waived');
    expect(formatEuro(waived.waived)).toBe('€ 250,00');
    expect(formatEuro(outstanding(waived))).toBe('€ 0,00');
  });

  it('verlangt fuer den Verzicht eine Begruendung', () => {
    const liability = openCostLiability(rule, 'clm_1', parseEuro('300,00'), NOW);
    expect(() => waiveRemaining(rule, liability, '   ')).toThrow(CostLiabilityError);
  });

  it('bucht nach einem Verzicht nichts mehr', () => {
    const liability = openCostLiability(rule, 'clm_1', parseEuro('300,00'), NOW);
    const waived = waiveRemaining(rule, liability, 'uneinbringlich');
    expect(() => applyRecovery(waived, parseEuro('10,00'))).toThrow(/verzichtet/);
  });

  it('meldet Uneinbringlichkeit nach Fristablauf, loest sie aber nicht aus', () => {
    const liability = openCostLiability(rule, 'clm_1', parseEuro('300,00'), NOW);
    const before = new Date(NOW.getTime() + 179 * 24 * 3600 * 1000);
    const after = new Date(NOW.getTime() + 181 * 24 * 3600 * 1000);

    expect(isUncollectible(rule, liability, before)).toBe(false);
    expect(isUncollectible(rule, liability, after)).toBe(true);
    // Der Zustand aendert sich dadurch nicht - der Verzicht bleibt eine Handlung.
    expect(liability.state).toBe('deferred');
  });

  it('lehnt negative Betraege ab', () => {
    expect(() => openCostLiability(rule, 'c', fromCents(-1), NOW)).toThrow(CostLiabilityError);
    const liability = openCostLiability(rule, 'c', parseEuro('10,00'), NOW);
    expect(() => applyRecovery(liability, fromCents(-1))).toThrow(CostLiabilityError);
  });
});

describe('Rechnung an den Glaeubiger: zwei Posten', () => {
  it('weist Erfolgshonorar und eingebrachte Inkassokosten getrennt aus', () => {
    const invoice = buildCreditorInvoice({
      successFeeNet: parseEuro('350,00'),
      successFeeVatBasisPoints: 2000,
      recoveredCollectionCosts: parseEuro('300,00'),
      collectionCostsVatBasisPoints: 2000,
      reference: 'FR-2026-1048',
    });

    expect(invoice.items).toHaveLength(2);
    expect(invoice.items[0]?.kind).toBe('success_fee');
    expect(invoice.items[1]?.kind).toBe('recovered_collection_costs');
    expect(formatEuro(invoice.netTotal)).toBe('€ 650,00');
    expect(formatEuro(invoice.vatTotal)).toBe('€ 130,00');
    expect(formatEuro(invoice.grossTotal)).toBe('€ 780,00');
  });

  it('erklaert die Stundung auf der Rechnung', () => {
    const invoice = buildCreditorInvoice({
      successFeeNet: parseEuro('350,00'),
      successFeeVatBasisPoints: 2000,
      recoveredCollectionCosts: parseEuro('300,00'),
      collectionCostsVatBasisPoints: 2000,
      reference: 'FR-2026-1048',
    });
    expect(invoice.notes.join(' ')).toContain('gestundet');
    expect(invoice.notes.join(' ')).toContain('auf Ihrem Konto eingegangen');
  });

  it('laesst einen Posten mit Betrag null weg', () => {
    const invoice = buildCreditorInvoice({
      successFeeNet: parseEuro('350,00'),
      successFeeVatBasisPoints: 2000,
      recoveredCollectionCosts: ZERO,
      collectionCostsVatBasisPoints: 2000,
      reference: 'FR-2026-1',
    });
    expect(invoice.items).toHaveLength(1);
    expect(invoice.items[0]?.kind).toBe('success_fee');
  });

  it('stellt bei erfolgloser Einbringung nichts in Rechnung', () => {
    const invoice = buildCreditorInvoice({
      successFeeNet: ZERO,
      successFeeVatBasisPoints: 2000,
      recoveredCollectionCosts: ZERO,
      collectionCostsVatBasisPoints: 2000,
      reference: 'FR-2026-1',
    });
    expect(invoice.items).toHaveLength(0);
    expect(formatEuro(invoice.grossTotal)).toBe('€ 0,00');
    expect(invoice.notes.join(' ')).toContain('kein Entgelt');
  });

  it('lehnt negative Posten ab', () => {
    expect(() =>
      buildCreditorInvoice({
        successFeeNet: fromCents(-1),
        successFeeVatBasisPoints: 2000,
        recoveredCollectionCosts: ZERO,
        collectionCostsVatBasisPoints: 2000,
        reference: 'x',
      }),
    ).toThrow(InvoiceError);
  });

  it('berechnet, was dem Glaeubiger bleibt', () => {
    const invoice = buildCreditorInvoice({
      successFeeNet: parseEuro('350,00'),
      successFeeVatBasisPoints: 2000,
      recoveredCollectionCosts: parseEuro('300,00'),
      collectionCostsVatBasisPoints: 2000,
      reference: 'FR-2026-1048',
    });
    // Schuldner zahlt 5.000 Hauptforderung + 300 Kosten an den Glaeubiger.
    expect(formatEuro(creditorNetProceeds(parseEuro('5.300,00'), invoice))).toBe(
      '€ 4.520,00',
    );
  });

  it('wird nie negativ', () => {
    const invoice = buildCreditorInvoice({
      successFeeNet: parseEuro('350,00'),
      successFeeVatBasisPoints: 2000,
      recoveredCollectionCosts: ZERO,
      collectionCostsVatBasisPoints: 2000,
      reference: 'x',
    });
    expect(formatEuro(creditorNetProceeds(parseEuro('10,00'), invoice))).toBe('€ 0,00');
  });
});

describe('Anrechnung bestimmt die Bemessungsgrundlage (§ 1416 ABGB)', () => {
  it('rechnet bei principal_only nur den Kapitalanteil', () => {
    const allocations = [
      { targetId: 'collection_costs', amount: parseEuro('300,00') },
      { targetId: 'interest', amount: parseEuro('120,00') },
      { targetId: 'principal', amount: parseEuro('580,00') },
    ];
    const base = successFeeBaseFromAllocation(successFee, allocations);
    expect(formatEuro(base)).toBe('€ 580,00');
  });

  it('loest kein Honorar aus, wenn die Zahlung nur Kosten und Zinsen deckt', () => {
    const allocations = [
      { targetId: 'collection_costs', amount: parseEuro('300,00') },
      { targetId: 'interest', amount: parseEuro('700,00') },
    ];
    const base = successFeeBaseFromAllocation(successFee, allocations);
    expect(formatEuro(base)).toBe('€ 0,00');

    const fee = computeSuccessFee(successFee, {
      principal: parseEuro('5.000,00'),
      recovered: base,
    });
    expect(formatEuro(fee.net)).toBe('€ 0,00');
  });

  it('rechnet bei all_components die gesamte Zahlung', () => {
    const allocations = [
      { targetId: 'collection_costs', amount: parseEuro('300,00') },
      { targetId: 'principal', amount: parseEuro('700,00') },
    ];
    const base = successFeeBaseFromAllocation(
      { ...successFee, basis: 'all_components' },
      allocations,
    );
    expect(formatEuro(base)).toBe('€ 1.000,00');
  });
});

describe('Pauschale nach § 458 UGB', () => {
  const enabled = { ...flatFee, enabled: true };

  it('ist in der Voreinstellung abgeschaltet', () => {
    expect(flatFee.enabled).toBe(false);
  });

  it('gilt nicht gegenueber Verbrauchern', () => {
    const result = computeDebtorCosts(
      schedule,
      {
        principal: parseEuro('5.000,00'),
        performedMeasures: [],
        processingAppropriatenessConfirmed: false,
        debtorIsBusiness: false,
      },
      enabled,
    );
    const line = result.lines.find((l) => l.kind === 'commercial_flat_fee');
    expect(line?.chargeable).toBe(false);
    expect(line?.note).toContain('unternehmerischen Verkehr');
  });

  it('kommt nicht zusaetzlich zu den uebrigen Kosten, sondern wird angerechnet', () => {
    const result = computeDebtorCosts(
      schedule,
      {
        principal: parseEuro('5.000,00'),
        performedMeasures: [],
        processingAppropriatenessConfirmed: true,
        debtorIsBusiness: true,
      },
      enabled,
    );
    // Bearbeitungskosten 240,00 angesetzt; Pauschale 40,00 wird angerechnet.
    const credit = result.lines.find((l) => l.kind === 'flat_fee_credit');
    expect(formatEuro(credit!.applied)).toBe('-€ 40,00');
    expect(formatEuro(result.total)).toBe('€ 240,00');
  });

  it('wirkt als Untergrenze, wenn sonst kaum Kosten anfielen', () => {
    const result = computeDebtorCosts(
      schedule,
      {
        principal: parseEuro('5.000,00'),
        performedMeasures: [],
        processingAppropriatenessConfirmed: false,
        debtorIsBusiness: true,
      },
      enabled,
    );
    // Ohne Angemessenheitspruefung keine Bearbeitungskosten; es bleibt die Pauschale.
    expect(formatEuro(result.total)).toBe('€ 40,00');
  });

  it('weist die Anrechnung als eigene Zeile aus, statt still zu kuerzen', () => {
    const result = computeDebtorCosts(
      schedule,
      {
        principal: parseEuro('5.000,00'),
        performedMeasures: [],
        processingAppropriatenessConfirmed: true,
        debtorIsBusiness: true,
      },
      enabled,
    );
    const credit = result.lines.find((l) => l.kind === 'flat_fee_credit');
    expect(credit?.note).toContain('angerechnet');
  });
});
