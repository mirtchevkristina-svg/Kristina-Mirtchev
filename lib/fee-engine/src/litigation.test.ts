import { describe, expect, it } from 'vitest';
import { ZERO, formatEuro, parseEuro } from '@fp/money';
import { type LitigationCostRule, demoRegistry, resolve } from '@fp/legal-config';
import {
  ESTIMATE_DISCLAIMER,
  HANDOVER_CONFIRMATION,
  HANDOVER_REQUIREMENTS,
  type HandoverChecklist,
  checkHandoverReadiness,
  describeTransferScope,
  estimateLitigationCosts,
} from './index.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const demoRule = resolve(demoRegistry, 'litigation_cost_estimate', NOW).value;

const unindexed = (cents: string) => ({
  baseAmountCents: cents,
  indexFactorBasisPoints: 10_000,
  indexReference: 'Test',
});

const filledRule: LitigationCostRule = {
  courtFeeTiers: [
    { uptoValueCents: '100000', amount: unindexed('10700') },
    { uptoValueCents: null, amount: unindexed('23600') },
  ],
  ownLegalCostTiers: [
    { uptoValueCents: '100000', amount: unindexed('50000') },
    { uptoValueCents: null, amount: unindexed('120000') },
  ],
  opposingRiskShareBasisPoints: 10_000,
  vatBasisPoints: 2000,
};

describe('Prozesskostenschaetzung', () => {
  it('liefert keine Zahl, solange die Tabellen nicht belegt sind', () => {
    const result = estimateLitigationCosts(demoRule, parseEuro('5.000,00'));
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toContain('L-19');
      expect(result.reason).toContain('ohne Grundlage');
    }
  });

  it('begleitet auch die Absage mit dem Pflichthinweis', () => {
    const result = estimateLitigationCosts(demoRule, parseEuro('5.000,00'));
    expect(result.disclaimer).toBe(ESTIMATE_DISCLAIMER);
  });

  it('lehnt einen Streitwert von null ab', () => {
    const result = estimateLitigationCosts(filledRule, ZERO);
    expect(result.available).toBe(false);
  });

  it('rechnet mit hinterlegten Tabellen und trennt die Posten', () => {
    const result = estimateLitigationCosts(filledRule, parseEuro('5.000,00'));
    expect(result.available).toBe(true);
    if (!result.available) return;

    // Gerichtsgebuehr traegt keine Umsatzsteuer.
    expect(formatEuro(result.courtFees)).toBe('€ 236,00');
    expect(formatEuro(result.ownLegalCostsNet)).toBe('€ 1.200,00');
    expect(formatEuro(result.ownLegalCostsVat)).toBe('€ 240,00');
    expect(formatEuro(result.ownLegalCostsGross)).toBe('€ 1.440,00');
    expect(formatEuro(result.ownTotal)).toBe('€ 1.676,00');
  });

  it('weist das Risiko der Gegenseite getrennt aus', () => {
    const result = estimateLitigationCosts(filledRule, parseEuro('5.000,00'));
    if (!result.available) throw new Error('erwartet verfuegbar');
    expect(formatEuro(result.opposingRisk)).toBe('€ 1.440,00');
    expect(formatEuro(result.worstCase)).toBe('€ 3.116,00');
    // Das schlimmste Szenario ist echt groesser als die eigenen Kosten.
    expect(result.worstCase > result.ownTotal).toBe(true);
  });

  it('waehlt die Stufe nach dem Streitwert', () => {
    const small = estimateLitigationCosts(filledRule, parseEuro('800,00'));
    if (!small.available) throw new Error('erwartet verfuegbar');
    expect(formatEuro(small.courtFees)).toBe('€ 107,00');
  });

  it('nennt bei jedem Ergebnis, dass die Vereinbarung mit der Kanzlei zustande kommt', () => {
    const result = estimateLitigationCosts(filledRule, parseEuro('5.000,00'));
    expect(result.disclaimer).toContain('ausschliesslich zwischen Ihnen und der Kanzlei');
    expect(result.disclaimer).toContain('keine Rechtsberatung');
  });
});

describe('Kanzleiuebergabe', () => {
  const none: HandoverChecklist = {
    collection_concluded: false,
    cost_estimate_shown: false,
    mandate_signed_with_firm: false,
    data_transfer_consented: false,
    no_open_objection: false,
    human_approval_recorded: false,
  };
  const all: HandoverChecklist = {
    collection_concluded: true,
    cost_estimate_shown: true,
    mandate_signed_with_firm: true,
    data_transfer_consented: true,
    no_open_objection: true,
    human_approval_recorded: true,
  };

  it('ist ohne jede Voraussetzung nicht bereit', () => {
    const readiness = checkHandoverReadiness(none);
    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toHaveLength(HANDOVER_REQUIREMENTS.length);
  });

  it('ist erst bereit, wenn alles vorliegt', () => {
    expect(checkHandoverReadiness(all).ready).toBe(true);
  });

  it('blockiert bei fehlender Freigabe, auch wenn alles andere vorliegt', () => {
    const readiness = checkHandoverReadiness({ ...all, human_approval_recorded: false });
    expect(readiness.ready).toBe(false);
    expect(readiness.summary).toContain('Freigabe dokumentiert');
  });

  it('blockiert bei offener Einwendung', () => {
    expect(checkHandoverReadiness({ ...all, no_open_objection: false }).ready).toBe(false);
  });

  it('blockiert ohne unterzeichnetes Mandat mit der Kanzlei', () => {
    const readiness = checkHandoverReadiness({ ...all, mandate_signed_with_firm: false });
    expect(readiness.ready).toBe(false);
    expect(readiness.summary).toContain('Mandatsvertrag');
  });

  it('blockiert ohne Zustimmung zur Datenuebermittlung', () => {
    expect(checkHandoverReadiness({ ...all, data_transfer_consented: false }).ready).toBe(false);
  });

  it('nennt vor der Zustimmung den Umfang der Uebermittlung', () => {
    const text = describeTransferScope({
      claimId: 'clm_1',
      reference: 'FR-2026-1048',
      documentCount: 2,
      eventCount: 5,
      includesAmountBreakdown: true,
    });
    expect(text).toContain('FR-2026-1048');
    expect(text).toContain('2 Dokumente');
    expect(text).toContain('5 Eintraege');
    expect(text).toContain('Betragsaufstellung');
  });

  it('formuliert Einzahl und Mehrzahl richtig', () => {
    const text = describeTransferScope({
      claimId: 'clm_1',
      reference: 'FR-2026-1',
      documentCount: 1,
      eventCount: 1,
      includesAmountBreakdown: false,
    });
    expect(text).toContain('1 Dokument,');
    expect(text).toContain('1 Eintrag');
    expect(text).not.toContain('Betragsaufstellung');
  });

  it('suggeriert im Bestaetigungstext kein Mandat des Portals', () => {
    expect(HANDOVER_CONFIRMATION).toContain('eigenstaendig');
    expect(HANDOVER_CONFIRMATION).toContain('unmittelbar durch die Kanzlei');
    for (const forbidden of ['wir vertreten', 'unser Anwalt', 'garantiert']) {
      expect(HANDOVER_CONFIRMATION.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('kennt kein Feld fuer eine Verguetung zwischen Portal und Kanzlei', async () => {
    // LEGAL-REVIEW L-11: Provisionsverbot. Ein Feld, das es nicht gibt, kann
    // auch niemand versehentlich befuellen.
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./handover.ts', import.meta.url), 'utf8'),
    );
    for (const term of ['commission', 'provision', 'kickback', 'referralFee', 'revenueShare']) {
      expect(source.toLowerCase()).not.toContain(`readonly ${term.toLowerCase()}`);
    }
  });
});
