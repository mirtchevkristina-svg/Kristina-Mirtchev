/**
 * Erfolgshonorar des Glaeubigers.
 *
 * Zwei Dinge, die leicht verwechselt werden und hier bewusst getrennt sind:
 *
 *  - Die STUFE wird nach der Hoehe der Hauptforderung ausgewaehlt.
 *  - Der SATZ wird auf den tatsaechlich eingebrachten Betrag angewandt.
 *
 * Beispiel: Forderung 10.000 EUR waehlt die 6 %-Stufe. Zahlt der Schuldner
 * nur 4.000 EUR, betraegt das Honorar 6 % von 4.000 EUR = 240 EUR, nicht
 * 6 % von 10.000 EUR. Das entspricht der Systematik des § 2, der auf die
 * Minderung der Schuld durch Leistungen des Schuldners abstellt.
 *
 * Dieses Modul kennt die schuldnerseitigen Kosten nicht und darf sie nicht
 * kennen - die beiden Erloesarten werden getrennt gefuehrt.
 */

import {
  type Money,
  ZERO,
  applyBasisPoints,
  compare,
  fromCents,
  isNegative,
} from '@fp/money';
import {
  type SuccessFeeRule,
  type SuccessFeeTier,
  MAX_SUCCESS_FEE_BASIS_POINTS,
  addVat,
  assertSuccessFeeWithinCap,
  formatBasisPoints,
} from '@fp/legal-config';

export class SuccessFeeError extends Error {
  override readonly name = 'SuccessFeeError';
}

export interface SuccessFeeInput {
  /** Hauptforderung - bestimmt ausschliesslich die Stufe. */
  readonly principal: Money;
  /** Tatsaechlich eingebrachter Betrag - Bemessungsgrundlage des Satzes. */
  readonly recovered: Money;
}

export interface SuccessFeeResult {
  readonly appliedBasisPoints: number;
  /** Betrag, auf den der Satz angewandt wurde. */
  readonly base: Money;
  readonly net: Money;
  readonly vat: Money;
  readonly gross: Money;
  /** Ob ein konfigurierter Mindestbetrag gegriffen hat. */
  readonly minimumApplied: boolean;
}

/**
 * Waehlt die Stufe nach der Hauptforderung.
 * Exportiert, damit die Oberflaeche den Satz schon vor Auftragserteilung
 * anzeigen kann, ohne die Berechnung zu wiederholen.
 */
export function selectSuccessFeeTier(rule: SuccessFeeRule, principal: Money): SuccessFeeTier {
  if (rule.tiers.length === 0) {
    throw new SuccessFeeError('Die Erfolgshonorar-Staffel enthaelt keine Stufe');
  }
  for (const tier of rule.tiers) {
    if (tier.uptoPrincipalCents === null) return tier;
    if (compare(principal, fromCents(tier.uptoPrincipalCents)) <= 0) return tier;
  }
  return rule.tiers[rule.tiers.length - 1]!;
}

/**
 * Berechnet das Erfolgshonorar fuer einen eingebrachten Betrag.
 *
 * Bei Teilzahlungen wird die Funktion je bestaetigter Zahlung aufgerufen;
 * die Summe der Einzelbetraege entspricht dem Honorar auf die Gesamtsumme,
 * abgesehen von hoechstens einem Cent Rundungsdifferenz je Zahlung.
 */
export function computeSuccessFee(
  rule: SuccessFeeRule,
  input: SuccessFeeInput,
): SuccessFeeResult {
  if (isNegative(input.principal) || compare(input.principal, ZERO) === 0) {
    throw new SuccessFeeError('Die Hauptforderung muss groesser als null sein');
  }
  if (isNegative(input.recovered)) {
    throw new SuccessFeeError('Der eingebrachte Betrag darf nicht negativ sein');
  }

  const tier = selectSuccessFeeTier(rule, input.principal);
  // Ein zu hoch konfigurierter Satz ist ein Konfigurationsfehler und wird
  // nie still auf den Hoechstsatz gekappt.
  assertSuccessFeeWithinCap(tier.basisPoints);

  let net = applyBasisPoints(input.recovered, tier.basisPoints, 'HALF_UP');
  let minimumApplied = false;

  if (rule.minimumCents !== null && compare(input.recovered, ZERO) > 0) {
    const minimum = fromCents(rule.minimumCents);
    if (compare(net, minimum) < 0) {
      net = minimum;
      minimumApplied = true;
    }
  }

  // Auch ein Mindestbetrag darf den gesetzlichen Hoechstsatz nicht ueberschreiten.
  const statutoryCap = applyBasisPoints(
    input.recovered,
    MAX_SUCCESS_FEE_BASIS_POINTS,
    'DOWN',
  );
  if (compare(net, statutoryCap) > 0) {
    throw new SuccessFeeError(
      `Das berechnete Honorar ueberschreitet den Hoechstsatz von ` +
        `${formatBasisPoints(MAX_SUCCESS_FEE_BASIS_POINTS)} des eingebrachten Betrages. ` +
        'Der konfigurierte Mindestbetrag ist fuer diese Zahlung unzulaessig.',
    );
  }

  const { vat, gross } = addVat(net, rule.vatBasisPoints, 'HALF_UP');
  return {
    appliedBasisPoints: tier.basisPoints,
    base: input.recovered,
    net,
    vat,
    gross,
    minimumApplied,
  };
}

/**
 * Vorschau fuer die Oberflaeche: was kostet es bei vollstaendiger Einbringung.
 * Zeigt dem Glaeubiger vor Auftragserteilung den Satz und den Betrag.
 */
export function previewSuccessFee(rule: SuccessFeeRule, principal: Money): SuccessFeeResult {
  return computeSuccessFee(rule, { principal, recovered: principal });
}
