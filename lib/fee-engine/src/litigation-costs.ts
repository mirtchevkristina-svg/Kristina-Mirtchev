/**
 * Unverbindliche Schaetzung der Kosten eines gerichtlichen Verfahrens.
 *
 * Zweck: Der Glaeubiger soll vor der Entscheidung ueber eine gerichtliche
 * Durchsetzung eine Groessenordnung sehen, statt nur den Satz "wenden Sie
 * sich an einen Anwalt" zu bekommen.
 *
 * Drei Dinge, die dieses Modul bewusst NICHT tut:
 *
 * 1. Es enthaelt keine Gebuehrentabelle. Gerichtsgebuehren nach dem GGG und
 *    Rechtsanwaltskosten nach dem RATG sind getrennte Regime mit Betraegen,
 *    die sich aendern. Beide kommen aus der versionierten Konfiguration
 *    (LEGAL-REVIEW L-19). Solange sie nicht belegt und freigegeben sind,
 *    liefert die Funktion kein Ergebnis, sondern sagt das ausdruecklich.
 * 2. Es erzeugt keine Honorarvereinbarung. Die verbindliche Vereinbarung
 *    kommt ausschliesslich zwischen Glaeubiger und Kanzlei zustande.
 * 3. Es bildet keine Abrechnung zwischen Portal und Kanzlei ab. Zwischen
 *    beiden fliesst weder Geld noch ein sonstiger Vorteil (LEGAL-REVIEW
 *    L-11, Provisionsverbot).
 */

import { type Money, ZERO, add, applyBasisPoints, compare, fromCents } from '@fp/money';
import { addVat } from '@fp/legal-config';
import type { LitigationCostRule, LitigationCostTier } from '@fp/legal-config';
import { resolveIndexedAmount } from './indexed.js';

/** Pflichttext, der jede Schaetzung begleitet. */
export const ESTIMATE_DISCLAIMER =
  'Unverbindliche Kostenschaetzung. Die tatsaechlichen Kosten haengen vom ' +
  'Verfahrensverlauf ab. Eine verbindliche Honorarvereinbarung kommt ' +
  'ausschliesslich zwischen Ihnen und der Kanzlei zustande. Diese Berechnung ' +
  'ist keine Rechtsberatung.';

export interface LitigationEstimate {
  readonly available: true;
  readonly claimValue: Money;
  /** Gerichtsgebuehr nach GGG. Keine Umsatzsteuer. */
  readonly courtFees: Money;
  /** Eigene Anwaltskosten, netto. */
  readonly ownLegalCostsNet: Money;
  readonly ownLegalCostsVat: Money;
  readonly ownLegalCostsGross: Money;
  /** Eigene Kosten bei Obsiegen: Gerichtsgebuehr plus eigener Anwalt. */
  readonly ownTotal: Money;
  /**
   * Groessenordnung des zusaetzlichen Risikos bei Unterliegen: die Kosten
   * der Gegenseite. Bewusst getrennt ausgewiesen.
   */
  readonly opposingRisk: Money;
  /** Hoechstes denkbares Kostenrisiko: eigene Kosten plus Gegenseite. */
  readonly worstCase: Money;
  readonly disclaimer: string;
}

export interface LitigationEstimateUnavailable {
  readonly available: false;
  readonly reason: string;
  readonly disclaimer: string;
}

export type LitigationEstimateResult = LitigationEstimate | LitigationEstimateUnavailable;

/**
 * Schaetzt die Kosten eines Verfahrens ueber `claimValue`.
 *
 * Liefert bewusst kein Ergebnis, solange die Gebuehrentabellen nicht
 * hinterlegt sind - eine Zahl ohne Grundlage waere schlechter als keine.
 */
export function estimateLitigationCosts(
  rule: LitigationCostRule,
  claimValue: Money,
): LitigationEstimateResult {
  if (compare(claimValue, ZERO) <= 0) {
    return {
      available: false,
      reason: 'Der Streitwert muss groesser als null sein.',
      disclaimer: ESTIMATE_DISCLAIMER,
    };
  }
  if (rule.courtFeeTiers.length === 0 || rule.ownLegalCostTiers.length === 0) {
    return {
      available: false,
      reason:
        'Die Gebuehrentabellen nach GGG und RATG sind noch nicht hinterlegt und ' +
        'freigegeben (LEGAL-REVIEW L-19). Eine Schaetzung waere ohne Grundlage.',
      disclaimer: ESTIMATE_DISCLAIMER,
    };
  }

  const courtFees = amountForValue(rule.courtFeeTiers, claimValue);
  const ownNet = amountForValue(rule.ownLegalCostTiers, claimValue);
  const { vat: ownVat, gross: ownGross } = addVat(ownNet, rule.vatBasisPoints, 'HALF_UP');
  const ownTotal = add(courtFees, ownGross);
  const opposingRisk = applyBasisPoints(
    ownGross,
    rule.opposingRiskShareBasisPoints,
    'HALF_UP',
  );

  return {
    available: true,
    claimValue,
    courtFees,
    ownLegalCostsNet: ownNet,
    ownLegalCostsVat: ownVat,
    ownLegalCostsGross: ownGross,
    ownTotal,
    opposingRisk,
    worstCase: add(ownTotal, opposingRisk),
    disclaimer: ESTIMATE_DISCLAIMER,
  };
}

function amountForValue(tiers: readonly LitigationCostTier[], value: Money): Money {
  for (const tier of tiers) {
    if (tier.uptoValueCents === null) return resolveIndexedAmount(tier.amount);
    if (compare(value, fromCents(tier.uptoValueCents)) <= 0) {
      return resolveIndexedAmount(tier.amount);
    }
  }
  const last = tiers[tiers.length - 1];
  if (!last) return ZERO;
  return resolveIndexedAmount(last.amount);
}
