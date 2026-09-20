/**
 * Schuldnerseitige Kosten nach § 3 der Hoechstsatzverordnung.
 *
 * Drei Regeln bestimmen den Aufbau dieses Moduls:
 *
 * 1. **Der Hoechstsatz ist kein Anspruch.** § 3 nennt eine Obergrenze. Ob ein
 *    Betrag gegenueber dem konkreten Schuldner ersatzfaehig ist, richtet sich
 *    zusaetzlich nach § 1333 Abs 2 ABGB. Die Engine fuellt deshalb niemals
 *    automatisch den Hoechstsatz aus, sondern rechnet aus einem ausdruecklich
 *    konfigurierten Anteil und weist Hoechstsatz und angesetzten Betrag
 *    getrennt aus.
 * 2. **Nur tatsaechlich gesetzte Massnahmen.** Eine Massnahme, die nicht
 *    durchgefuehrt wurde, erzeugt keinen Posten - auch dann nicht, wenn sie
 *    nach der Eskalationsstufe zulaessig waere.
 * 3. **Getrennt vom Erfolgshonorar.** Dieses Modul kennt das Honorar des
 *    Glaeubigers nicht. Die beiden Erloesarten werden nie vermischt.
 *
 * LEGAL-REVIEW L-02: ob diese Kosten ueberhaupt geltend gemacht werden.
 * LEGAL-REVIEW L-17: der geltende Indexstand der Betraege.
 */

import {
  type Money,
  ZERO,
  add,
  applyBasisPoints,
  compare,
  isNegative,
  min,
  sum,
} from '@fp/money';
import type {
  CollectionMeasure,
  DebtorCostSchedule,
  MeasureCap,
  ProcessingCostTier,
} from '@fp/legal-config';
import { formatBasisPoints } from '@fp/legal-config';
import { isIndexUnverified, resolveIndexedAmount } from './indexed.js';

export class DebtorCostError extends Error {
  override readonly name = 'DebtorCostError';
}

/** Eine tatsaechlich durchgefuehrte Massnahme. */
export interface PerformedMeasure {
  readonly measure: CollectionMeasure;
  /** Wann sie durchgefuehrt wurde. Dient dem Nachweis. */
  readonly performedAt: Date;
  /**
   * Ob die Angemessenheit nach § 1333 Abs 2 ABGB fuer diesen Fall bejaht
   * wurde. Ohne diese Bestaetigung wird kein Betrag angesetzt.
   */
  readonly appropriatenessConfirmed: boolean;
  /** Wer die Angemessenheit bestaetigt hat. */
  readonly confirmedBy?: string;
}

export interface DebtorCostLine {
  readonly kind: 'processing' | 'measure';
  readonly measure: CollectionMeasure | null;
  /** Gesetzlicher Hoechstbetrag fuer diesen Posten. */
  readonly statutoryCap: Money;
  /** Tatsaechlich angesetzter Betrag. Immer kleiner oder gleich dem Hoechstsatz. */
  readonly applied: Money;
  /** Warum der Posten nicht oder nur teilweise angesetzt wurde. */
  readonly note: string;
  /** Ob der Posten in die Forderung eingeht. */
  readonly chargeable: boolean;
}

export interface DebtorCostResult {
  readonly lines: readonly DebtorCostLine[];
  /** Summe der tatsaechlich angesetzten Betraege. */
  readonly total: Money;
  /** Summe der gesetzlichen Hoechstbetraege - nur zur Anzeige. */
  readonly statutoryMaximum: Money;
  /** Hinweise, die in der Oberflaeche sichtbar gemacht werden muessen. */
  readonly warnings: readonly string[];
}

export interface DebtorCostInput {
  readonly principal: Money;
  readonly performedMeasures: readonly PerformedMeasure[];
  /**
   * Ob die Angemessenheit der allgemeinen Bearbeitungskosten fuer diesen
   * Fall bejaht wurde.
   */
  readonly processingAppropriatenessConfirmed: boolean;
}

/**
 * Berechnet die gegenueber dem Schuldner ansetzbaren Kosten.
 *
 * Gibt fuer jeden Posten Hoechstsatz und angesetzten Betrag aus, damit die
 * Differenz gegenueber Schuldner und Aufsicht erklaerbar ist.
 */
export function computeDebtorCosts(
  schedule: DebtorCostSchedule,
  input: DebtorCostInput,
): DebtorCostResult {
  if (compare(input.principal, ZERO) <= 0) {
    throw new DebtorCostError('Die Hauptforderung muss groesser als null sein');
  }

  const lines: DebtorCostLine[] = [];
  const warnings: string[] = [];

  const tier = selectProcessingTier(schedule.processingCostTiers, input.principal);
  const processingCap = processingCapFor(tier, input.principal);

  if (isProcessingTierIndexUnverified(tier)) {
    warnings.push(
      'Der Indexstand der Hoechstbetraege ist nicht geprueft (LEGAL-REVIEW L-17). ' +
        'Die Betraege entsprechen dem Verordnungstext ohne Anpassung.',
    );
  }

  const processingApplied = input.processingAppropriatenessConfirmed
    ? applyBasisPoints(processingCap, schedule.processingPolicyShareBasisPoints, 'DOWN')
    : ZERO;

  lines.push({
    kind: 'processing',
    measure: null,
    statutoryCap: processingCap,
    applied: processingApplied,
    note: input.processingAppropriatenessConfirmed
      ? `Angesetzt werden ${formatBasisPoints(schedule.processingPolicyShareBasisPoints)} ` +
        'des gesetzlichen Hoechstsatzes.'
      : 'Nicht angesetzt: die Angemessenheit nach § 1333 Abs 2 ABGB wurde nicht bestaetigt.',
    chargeable: input.processingAppropriatenessConfirmed,
  });

  const seen = new Map<CollectionMeasure, number>();
  for (const performed of input.performedMeasures) {
    const cap = schedule.measureCaps.find((c) => c.measure === performed.measure);
    if (!cap) {
      lines.push({
        kind: 'measure',
        measure: performed.measure,
        statutoryCap: ZERO,
        applied: ZERO,
        note: 'Fuer diese Massnahme ist kein Hoechstsatz konfiguriert; kein Ansatz.',
        chargeable: false,
      });
      continue;
    }

    const occurrence = (seen.get(performed.measure) ?? 0) + 1;
    seen.set(performed.measure, occurrence);

    const statutoryCap = resolveIndexedAmount(cap.cap);
    const reason = measureBlockReason(cap, performed, input.principal, occurrence, schedule);

    if (reason !== null) {
      lines.push({
        kind: 'measure',
        measure: performed.measure,
        statutoryCap,
        applied: ZERO,
        note: reason,
        chargeable: false,
      });
      continue;
    }

    const applied = applyBasisPoints(statutoryCap, cap.policyShareBasisPoints, 'DOWN');
    lines.push({
      kind: 'measure',
      measure: performed.measure,
      statutoryCap,
      applied,
      note:
        cap.policyShareBasisPoints === 0
          ? 'Diese Massnahme wird dem Schuldner bewusst nicht angelastet.'
          : `Angesetzt werden ${formatBasisPoints(cap.policyShareBasisPoints)} ` +
            'des gesetzlichen Hoechstsatzes.',
      chargeable: compare(applied, ZERO) > 0,
    });
  }

  const total = sum(lines.map((l) => l.applied));
  const statutoryMaximum = sum(lines.map((l) => l.statutoryCap));

  // Sicherheitsnetz: kein Posten und keine Summe darf den Hoechstsatz
  // ueberschreiten. Ein Verstoss ist ein Programmfehler, kein Sonderfall.
  for (const line of lines) {
    if (compare(line.applied, line.statutoryCap) > 0) {
      throw new DebtorCostError(
        `Angesetzter Betrag ueberschreitet den Hoechstsatz (${line.kind}/${line.measure ?? '-'})`,
      );
    }
  }

  return { lines, total, statutoryMaximum, warnings };
}

function measureBlockReason(
  cap: MeasureCap,
  performed: PerformedMeasure,
  principal: Money,
  occurrence: number,
  schedule: DebtorCostSchedule,
): string | null {
  if (!performed.appropriatenessConfirmed && !schedule.allowWithoutAppropriatenessCheck) {
    return 'Nicht angesetzt: die Angemessenheit nach § 1333 Abs 2 ABGB wurde nicht bestaetigt.';
  }
  if (cap.minimumPrincipal !== null) {
    const minimum = resolveIndexedAmount(cap.minimumPrincipal);
    if (compare(principal, minimum) <= 0) {
      return 'Nicht angesetzt: die Forderung liegt unter der Mindesthoehe fuer diesen Hoechstsatz.';
    }
  }
  if (occurrence > 1) {
    return 'Nicht angesetzt: diese Massnahme wurde fuer diesen Fall bereits verrechnet.';
  }
  return null;
}

function selectProcessingTier(
  tiers: readonly ProcessingCostTier[],
  principal: Money,
): ProcessingCostTier {
  if (tiers.length === 0) {
    throw new DebtorCostError('Es ist keine Stufe fuer die Bearbeitungskosten konfiguriert');
  }
  for (const tier of tiers) {
    if (tier.uptoPrincipal === null) return tier;
    if (compare(principal, resolveIndexedAmount(tier.uptoPrincipal)) <= 0) return tier;
  }
  return tiers[tiers.length - 1]!;
}

function processingCapFor(tier: ProcessingCostTier, principal: Money): Money {
  if (tier.fixedAmount !== null) {
    // Ein fester Hoechstbetrag kann die Forderung selbst nicht uebersteigen.
    return min(resolveIndexedAmount(tier.fixedAmount), principal);
  }
  if (tier.basisPoints === null) {
    throw new DebtorCostError(
      'Eine Stufe muss entweder einen Satz oder einen festen Hoechstbetrag haben',
    );
  }
  return applyBasisPoints(principal, tier.basisPoints, 'DOWN');
}

function isProcessingTierIndexUnverified(tier: ProcessingCostTier): boolean {
  if (tier.fixedAmount !== null) return isIndexUnverified(tier.fixedAmount);
  if (tier.uptoPrincipal !== null) return isIndexUnverified(tier.uptoPrincipal);
  return false;
}

/** Gesamtforderung gegenueber dem Schuldner: Hauptforderung, Zinsen, Kosten. */
export function debtorTotal(
  principal: Money,
  interest: Money,
  costs: DebtorCostResult,
): Money {
  if (isNegative(interest)) {
    throw new DebtorCostError('Zinsen duerfen nicht negativ sein');
  }
  return add(add(principal, interest), costs.total);
}
