/**
 * Ermittlung der konkreten Gebuehren aus der Konfiguration, unter Einhaltung
 * der gesetzlichen Hoechstsaetze.
 */

import { type Money, ZERO, compare, fromCents } from '@fp/money';
import { ConfigError } from './types.js';
import type { PlatformFeeRule, PlatformFeeTier } from './parameters.js';
import { addVat, cappedOrderFee } from './caps.js';

export interface OrderFeeResult {
  /** Tatsaechlich zu verrechnende Gebuehr (netto). Der Deckel gilt hier. */
  readonly feeCents: Money;
  /** Umsatzsteuer auf die Gebuehr. */
  readonly vatCents: Money;
  /** Bruttobetrag, der dem Glaeubiger in Rechnung gestellt wird. */
  readonly grossCents: Money;
  /** Der konfigurierte Stufenbetrag vor Anwendung des Deckels. */
  readonly tierFeeCents: Money;
  /** Ob der gesetzliche Deckel gegriffen hat. */
  readonly cappedByStatute: boolean;
  readonly vatBasisPoints: number;
  readonly stripePriceId: string;
}

/**
 * Bestimmt die Auftragsgebuehr fuer eine Forderung.
 *
 * Zuerst wird die passende Stufe gewaehlt, danach der gesetzliche Deckel von
 * 6 % der Forderung angewandt. Der Deckel ist nicht abschaltbar.
 */
export function computeOrderFee(rule: PlatformFeeRule, principal: Money): OrderFeeResult {
  if (compare(principal, ZERO) <= 0) {
    throw new ConfigError('Die Hauptforderung muss groesser als null sein');
  }
  const tier = selectTier(rule, principal);
  const tierFeeCents = fromCents(tier.feeCents);
  const feeCents = cappedOrderFee(tierFeeCents, principal);
  // § 4 Abs 1: Die Umsatzsteuer ist im Hoechstbetrag nicht enthalten und
  // kommt daher auf den bereits gedeckelten Nettobetrag hinzu.
  const { vat, gross } = addVat(feeCents, tier.vatBasisPoints, 'HALF_UP');

  return {
    feeCents,
    vatCents: vat,
    grossCents: gross,
    tierFeeCents,
    cappedByStatute: compare(feeCents, tierFeeCents) < 0,
    vatBasisPoints: tier.vatBasisPoints,
    stripePriceId: tier.stripePriceId,
  };
}

function selectTier(rule: PlatformFeeRule, principal: Money): PlatformFeeTier {
  for (const tier of rule.tiers) {
    if (tier.uptoPrincipalCents === null) return tier;
    if (compare(principal, fromCents(tier.uptoPrincipalCents)) <= 0) return tier;
  }
  const last = rule.tiers[rule.tiers.length - 1];
  if (!last) throw new ConfigError('Die Preisregel enthaelt keine Stufe');
  return last;
}
