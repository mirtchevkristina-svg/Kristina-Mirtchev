/**
 * Rechnung des Portals an den Glaeubiger.
 *
 * Im Direktzahlungsmodell zahlt der Schuldner alles an den Glaeubiger -
 * also auch die Inkassokosten. Diese Betraege kommen damit auf dem Konto
 * des Glaeubigers an, nicht auf dem des Portals.
 *
 * Die Rechnung hat deshalb zwei Posten:
 *
 *  1. das Erfolgshonorar auf den eingebrachten Betrag,
 *  2. die eingebrachten, bisher gestundeten Inkassokosten.
 *
 * Daraus folgt unmittelbar: das Umgehungsrisiko verdoppelt sich, weil der
 * Glaeubiger bei beiden Posten einen Anreiz hat, eine Zahlung nicht zu
 * melden. Die Zahlungsmeldung durch den Schuldner und die Bestaetigung
 * durch den Glaeubiger sind daher keine Bequemlichkeit, sondern die
 * Kontrolle, auf der dieses Modell beruht.
 */

import { type Money, ZERO, compare, isNegative, subtract, sum } from '@fp/money';
import { addVat } from '@fp/legal-config';

export class InvoiceError extends Error {
  override readonly name = 'InvoiceError';
}

export type InvoiceItemKind = 'success_fee' | 'recovered_collection_costs';

export interface InvoiceItem {
  readonly kind: InvoiceItemKind;
  readonly description: string;
  readonly net: Money;
  readonly vat: Money;
  readonly gross: Money;
}

export interface CreditorInvoice {
  readonly items: readonly InvoiceItem[];
  readonly netTotal: Money;
  readonly vatTotal: Money;
  readonly grossTotal: Money;
  /** Hinweise, die auf der Rechnung erscheinen muessen. */
  readonly notes: readonly string[];
}

export interface InvoiceInput {
  /** Erfolgshonorar, netto. */
  readonly successFeeNet: Money;
  readonly successFeeVatBasisPoints: number;
  /**
   * Beim Schuldner eingebrachte Inkassokosten, die auf die gestundete
   * Kostenforderung gebucht wurden.
   */
  readonly recoveredCollectionCosts: Money;
  readonly collectionCostsVatBasisPoints: number;
  /** Zeitraum oder Zahlungsbezug, rein beschreibend. */
  readonly reference: string;
}

/**
 * Baut die Rechnung aus den beiden Posten.
 *
 * Ein Posten mit Betrag null wird weggelassen, statt mit 0,00 zu erscheinen -
 * eine Rechnungszeile ueber null verwirrt mehr, als sie erklaert.
 */
export function buildCreditorInvoice(input: InvoiceInput): CreditorInvoice {
  if (isNegative(input.successFeeNet) || isNegative(input.recoveredCollectionCosts)) {
    throw new InvoiceError('Rechnungsposten duerfen nicht negativ sein');
  }

  const items: InvoiceItem[] = [];

  if (compare(input.successFeeNet, ZERO) > 0) {
    const { vat, gross } = addVat(input.successFeeNet, input.successFeeVatBasisPoints, 'HALF_UP');
    items.push({
      kind: 'success_fee',
      description: `Erfolgshonorar auf den eingebrachten Betrag (${input.reference})`,
      net: input.successFeeNet,
      vat,
      gross,
    });
  }

  if (compare(input.recoveredCollectionCosts, ZERO) > 0) {
    const { vat, gross } = addVat(
      input.recoveredCollectionCosts,
      input.collectionCostsVatBasisPoints,
      'HALF_UP',
    );
    items.push({
      kind: 'recovered_collection_costs',
      description:
        'Beim Schuldner eingebrachte Inkassokosten, bisher gestundet ' +
        `(${input.reference})`,
      net: input.recoveredCollectionCosts,
      vat,
      gross,
    });
  }

  const notes: string[] = [];
  if (items.some((i) => i.kind === 'recovered_collection_costs')) {
    notes.push(
      'Die Inkassokosten wurden bei Auftragserteilung begruendet und bis zur ' +
        'Einbringung beim Schuldner gestundet. Der eingebrachte Betrag ist auf ' +
        'Ihrem Konto eingegangen und wird hiermit abgerechnet.',
    );
  }
  if (items.length === 0) {
    notes.push('Es wurde nichts eingebracht. Es faellt kein Entgelt an.');
  }

  return {
    items,
    netTotal: sum(items.map((i) => i.net)),
    vatTotal: sum(items.map((i) => i.vat)),
    grossTotal: sum(items.map((i) => i.gross)),
    notes,
  };
}

/**
 * Betrag, der dem Glaeubiger nach Abzug dieser Rechnung bleibt.
 *
 * Wird nie negativ: uebersteigt die Rechnung den eingebrachten Betrag,
 * bleibt null uebrig und die Differenz ist eine offene Forderung, kein
 * negativer Erloes.
 */
export function creditorNetProceeds(recovered: Money, invoice: CreditorInvoice): Money {
  if (isNegative(recovered)) {
    throw new InvoiceError('Der eingebrachte Betrag darf nicht negativ sein');
  }
  return compare(recovered, invoice.grossTotal) > 0
    ? subtract(recovered, invoice.grossTotal)
    : ZERO;
}
