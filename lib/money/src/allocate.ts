/**
 * Verteilung von Betraegen ohne Cent-Verlust.
 *
 * Wird an zwei Stellen gebraucht:
 *  - Aufteilung eines Betrags in gleich grosse Raten (Ratenplan)
 *  - Verteilung einer Zahlung auf Forderungsbestandteile (payment_allocations)
 *
 * In beiden Faellen gilt: Die Summe der Teile ist exakt gleich dem
 * Ausgangsbetrag. Es wird nie "ungefaehr" verteilt.
 */

import { type Money, MoneyError, ZERO, fromCents, isNegative, min, subtract } from './money.js';

/**
 * Verteilt `amount` auf `parts` Teile so gleichmaessig wie moeglich.
 * Der unvermeidbare Rest wird auf die vorderen Teile verteilt, damit die
 * fruehen Raten eher einen Cent mehr tragen als die letzte.
 *
 * Beispiel: 100,00 EUR auf 3 Teile -> [33,34; 33,33; 33,33]
 */
export function split(amount: Money, parts: number): Money[] {
  if (!Number.isSafeInteger(parts) || parts <= 0) {
    throw new MoneyError(`Anzahl der Teile muss positiv sein, erhalten: ${parts}`);
  }
  const n = BigInt(parts);
  const base = amount / n;
  const remainder = amount - base * n; // gleiches Vorzeichen wie amount
  const step = remainder < 0n ? -1n : 1n;
  let left = remainder < 0n ? -remainder : remainder;

  const result: Money[] = [];
  for (let i = 0; i < parts; i += 1) {
    if (left > 0n) {
      result.push(fromCents(base + step));
      left -= 1n;
    } else {
      result.push(fromCents(base));
    }
  }
  return result;
}

/**
 * Verteilt `amount` im Verhaeltnis der `weights`.
 *
 * Verwendet das Hare-Niemeyer-Verfahren (groesste Reste): erst der
 * abgerundete Anteil, dann werden die verbleibenden Cent nach der Groesse
 * des Restes vergeben. Dadurch ist die Summe exakt `amount` und die
 * Verteilung so nah wie moeglich am exakten Verhaeltnis.
 *
 * Alle `weights` muessen >= 0 sein und ihre Summe > 0.
 */
export function allocate(amount: Money, weights: readonly bigint[]): Money[] {
  if (weights.length === 0) {
    throw new MoneyError('Mindestens ein Gewicht erforderlich');
  }
  let totalWeight = 0n;
  for (const w of weights) {
    if (w < 0n) throw new MoneyError('Gewichte duerfen nicht negativ sein');
    totalWeight += w;
  }
  if (totalWeight === 0n) {
    throw new MoneyError('Summe der Gewichte muss groesser als null sein');
  }

  const negative = amount < 0n;
  const value = negative ? -amount : amount;

  const shares: bigint[] = [];
  const remainders: { index: number; remainder: bigint }[] = [];
  let distributed = 0n;

  for (let i = 0; i < weights.length; i += 1) {
    const w = weights[i] ?? 0n;
    const exact = value * w;
    const share = exact / totalWeight;
    shares.push(share);
    remainders.push({ index: i, remainder: exact % totalWeight });
    distributed += share;
  }

  let left = value - distributed;
  // Groesster Rest zuerst; bei Gleichstand der kleinere Index, damit die
  // Verteilung deterministisch und damit testbar ist.
  remainders.sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const entry of remainders) {
    if (left <= 0n) break;
    shares[entry.index] = (shares[entry.index] ?? 0n) + 1n;
    left -= 1n;
  }

  return shares.map((s) => fromCents(negative ? -s : s));
}

/** Ein Posten, auf den eine Zahlung angerechnet werden kann. */
export interface AllocationTarget {
  readonly id: string;
  /** Noch offener Betrag dieses Postens. Muss >= 0 sein. */
  readonly outstanding: Money;
}

export interface AllocationResult {
  readonly targetId: string;
  readonly amount: Money;
}

export interface WaterfallResult {
  readonly allocations: readonly AllocationResult[];
  /** Betrag, der nach Tilgung aller Posten uebrig bleibt (Ueberzahlung). */
  readonly unallocated: Money;
}

/**
 * Rechnet `payment` der Reihe nach auf `targets` an, bis der Betrag
 * aufgebraucht ist ("Wasserfall").
 *
 * Die REIHENFOLGE der `targets` ist die Anrechnungsreihenfolge und wird
 * bewusst NICHT von dieser Funktion bestimmt. Sie kommt aus der versionierten
 * Konfiguration.
 *
 * LEGAL-REVIEW: Die gesetzliche bzw. vertragliche Anrechnungsreihenfolge
 * (Kosten / Zinsen / Hauptforderung - vgl. § 1416 ABGB und abweichende
 * Vereinbarungen) ist fachlich festzulegen. Siehe
 * docs/LEGAL_OPEN_QUESTIONS.md, Frage L-07.
 */
export function allocateWaterfall(
  payment: Money,
  targets: readonly AllocationTarget[],
): WaterfallResult {
  if (isNegative(payment)) {
    throw new MoneyError('Eine Zahlung kann nicht negativ angerechnet werden');
  }
  const allocations: AllocationResult[] = [];
  let left = payment;

  for (const target of targets) {
    if (isNegative(target.outstanding)) {
      throw new MoneyError(
        `Offener Betrag von "${target.id}" darf nicht negativ sein`,
      );
    }
    if (left === ZERO) break;
    const applied = min(left, target.outstanding);
    if (applied !== ZERO) {
      allocations.push({ targetId: target.id, amount: applied });
      left = subtract(left, applied);
    }
  }

  return { allocations, unallocated: left };
}
