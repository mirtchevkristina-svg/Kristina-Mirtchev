/**
 * Aufloesung indexgebundener Eurobetraege.
 *
 * § 4 Abs 2 der Hoechstsatzverordnung sieht eine Anpassung an den
 * Verbraucherpreisindex vor. Im Code steht deshalb kein Eurobetrag; die
 * Basisbetraege stehen in der versionierten Konfiguration, der geltende
 * Betrag wird hier berechnet.
 *
 * Der Indexstand ist eine offene Frage (LEGAL-REVIEW L-17). Solange er nicht
 * geklaert ist, steht der Faktor auf "unveraendert" - das ist ein Platzhalter,
 * kein geltender Wert, und der Startup-Check verhindert den Produktivbetrieb.
 */

import { type Money, applyBasisPoints, fromCents } from '@fp/money';
import type { IndexedAmount } from '@fp/legal-config';

/** Faktor 10000 bedeutet: unveraendert gegenueber dem Basisbetrag. */
export const INDEX_FACTOR_UNCHANGED = 10_000;

/**
 * Geltender Betrag aus Basisbetrag und Indexfaktor.
 * Wird zugunsten des Schuldners abgerundet.
 */
export function resolveIndexedAmount(amount: IndexedAmount): Money {
  return applyBasisPoints(
    fromCents(amount.baseAmountCents),
    amount.indexFactorBasisPoints,
    'DOWN',
  );
}

/** Ob der Indexstand noch der ungeprueften Voreinstellung entspricht. */
export function isIndexUnverified(amount: IndexedAmount): boolean {
  return amount.indexFactorBasisPoints === INDEX_FACTOR_UNCHANGED;
}
