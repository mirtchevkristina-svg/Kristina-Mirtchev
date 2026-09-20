/**
 * Kostenforderung des Portals gegen den Glaeubiger, gestundet und im
 * Uneinbringlichkeitsfall erlassen.
 *
 * Warum es diese Konstruktion ueberhaupt gibt:
 *
 * Der Schuldner schuldet Inkassokosten nicht dem Portal, sondern dem
 * Glaeubiger - als Schadenersatz (§ 1333 Abs 2 ABGB). Ein Schaden setzt
 * voraus, dass dem Glaeubiger Kosten tatsaechlich entstanden sind. Bei
 * einem reinen Erfolgshonorar ohne Grundgebuehr schuldet der Glaeubiger dem
 * Portal aber nichts - dann fehlt die Grundlage, beim Schuldner etwas
 * geltend zu machen.
 *
 * Deshalb: Die Inkassokosten entstehen dem Glaeubiger in voller Hoehe bei
 * Auftragserteilung. Sie werden gestundet, beim Schuldner als Schadenersatz
 * eingefordert und bei Uneinbringlichkeit erlassen. Wirtschaftlich zahlt
 * der Glaeubiger weiterhin nur bei Erfolg; rechtlich besteht die Forderung
 * von Anfang an.
 *
 * LEGAL-REVIEW L-20: Ob das traegt, besonders gegenueber Verbrauchern als
 * Schuldnern, ist nicht geklaert. Zu recherchieren ist die OGH-Judikatur
 * zur Ersatzfaehigkeit von Inkassokosten bei Verzicht gegenueber dem
 * Auftraggeber. Bis dahin bleibt die Konfiguration DEMO_ONLY.
 */

import { type Money, ZERO, add, compare, isNegative, min, subtract } from '@fp/money';
import type { CostLiabilityRule, RevenueModelRule } from '@fp/legal-config';
import { assertStreamEnabled } from './revenue-gate.js';

export class CostLiabilityError extends Error {
  override readonly name = 'CostLiabilityError';
}

export type LiabilityState = 'deferred' | 'partially_settled' | 'settled' | 'waived';

export interface CostLiability {
  readonly claimId: string;
  /** Gesamthoehe der bei Auftragserteilung entstandenen Kosten. */
  readonly total: Money;
  /** Bereits durch Einbringung beim Schuldner gedeckter Teil. */
  readonly settled: Money;
  /** Erlassener Teil. */
  readonly waived: Money;
  readonly state: LiabilityState;
  readonly openedAt: Date;
}

/** Noch offener, weder gedeckter noch erlassener Betrag. */
export function outstanding(liability: CostLiability): Money {
  return subtract(liability.total, add(liability.settled, liability.waived));
}

/**
 * Begruendet die Kostenforderung bei Auftragserteilung.
 * Ohne diese Forderung darf beim Schuldner nichts geltend gemacht werden.
 */
export function openCostLiability(
  rule: CostLiabilityRule,
  claimId: string,
  total: Money,
  openedAt: Date,
  revenueModel?: RevenueModelRule,
): CostLiability {
  if (revenueModel) assertStreamEnabled(revenueModel, 'creditor_collection_fee');
  if (!rule.creditorOwesAtOrder) {
    throw new CostLiabilityError(
      'Die Konfiguration sieht keine Kostenforderung gegen den Glaeubiger vor. ' +
        'Ohne sie fehlt die Grundlage, Inkassokosten beim Schuldner geltend zu machen.',
    );
  }
  if (isNegative(total)) {
    throw new CostLiabilityError('Die Kostenforderung darf nicht negativ sein');
  }
  return {
    claimId,
    total,
    settled: ZERO,
    waived: ZERO,
    state: 'deferred',
    openedAt,
  };
}

/**
 * Bucht einen beim Schuldner eingebrachten Kostenbetrag auf die Forderung.
 *
 * Es wird nie mehr gedeckt als tatsaechlich entstanden ist: ein
 * ueberschiessender Betrag bleibt beim Glaeubiger und wird zurueckgegeben,
 * statt still einbehalten zu werden.
 */
export function applyRecovery(
  liability: CostLiability,
  recovered: Money,
): { readonly liability: CostLiability; readonly excess: Money } {
  if (isNegative(recovered)) {
    throw new CostLiabilityError('Ein eingebrachter Betrag darf nicht negativ sein');
  }
  if (liability.state === 'waived') {
    throw new CostLiabilityError(
      'Auf diese Kostenforderung wurde bereits verzichtet; eine Buchung ist nicht moeglich.',
    );
  }

  const open = outstanding(liability);
  const applied = min(recovered, open);
  const settled = add(liability.settled, applied);
  const next: CostLiability = {
    ...liability,
    settled,
    state: compare(add(settled, liability.waived), liability.total) >= 0
      ? 'settled'
      : compare(settled, ZERO) > 0
        ? 'partially_settled'
        : 'deferred',
  };
  return { liability: next, excess: subtract(recovered, applied) };
}

/**
 * Erlaesst den offenen Rest, wenn er beim Schuldner nicht einbringlich war.
 * Damit wird "keine Grundgebuehr" wirtschaftlich wahr.
 */
export function waiveRemaining(
  rule: CostLiabilityRule,
  liability: CostLiability,
  reason: string,
): CostLiability {
  if (!rule.waivedIfUncollectible) {
    throw new CostLiabilityError(
      'Die Konfiguration sieht keinen Verzicht bei Uneinbringlichkeit vor.',
    );
  }
  if (!reason.trim()) {
    throw new CostLiabilityError('Ein Verzicht erfordert eine Begruendung');
  }
  if (liability.state === 'settled') {
    throw new CostLiabilityError('Die Forderung ist bereits vollstaendig gedeckt');
  }
  const open = outstanding(liability);
  return {
    ...liability,
    waived: add(liability.waived, open),
    state: 'waived',
  };
}

/**
 * Ob die Forderung nach der konfigurierten Frist als uneinbringlich gilt.
 * Loest den Verzicht nicht aus - das bleibt eine bewusste Handlung.
 */
export function isUncollectible(
  rule: CostLiabilityRule,
  liability: CostLiability,
  now: Date,
): boolean {
  if (liability.state === 'settled' || liability.state === 'waived') return false;
  const elapsedDays = Math.floor(
    (now.getTime() - liability.openedAt.getTime()) / (24 * 60 * 60 * 1000),
  );
  return elapsedDays >= rule.uncollectibleAfterDays;
}
