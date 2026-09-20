/**
 * Gesetzliche Hoechstsaetze fuer die Verguetung von Inkassoinstituten.
 *
 * Grundlage: Verordnung ueber die Hoechstsaetze der Inkassoinstituten
 * gebuehrenden Verguetungen (BGBl 141/1996 idF BGBl II 103/2005), § 2.
 *
 * Wichtig und haeufig missverstanden: Die Verordnung deckelt die
 * AUFTRAGGEBERGEBUEHR, also das, was das Portal dem GLAEUBIGER verrechnet -
 * nicht in erster Linie das, was dem Schuldner angelastet wird.
 *
 * Diese Werte sind daher keine frei waehlbaren Geschaeftsparameter, sondern
 * Obergrenzen. Sie stehen bewusst hier als Konstanten und nicht in der
 * versionierten Konfiguration: die Konfiguration legt fest, WAS verrechnet
 * wird, diese Datei prueft, ob das zulaessig ist.
 *
 * Netto oder brutto (L-13): Nach § 4 Abs 1 der Verordnung ist die
 * Umsatzsteuer in den Hoechstbetraegen NICHT enthalten. Die Deckel gelten
 * also fuer den Nettobetrag, die Umsatzsteuer kommt zulaessig hinzu.
 * Konfidenz hoch bis moderat: die geltende Fassung des § 4 wurde nicht
 * unmittelbar im RIS geprueft, sondern ueber eine Sekundaerquelle und den
 * Urtext von 1996 belegt.
 *
 * Achtung bei der Einordnung: "Deckel auf netto" ist die WEITERE Auslegung,
 * nicht die engere. Netto bis 6 % zuzueglich 20 % Umsatzsteuer ergibt 7,2 %
 * der Forderung in Summe; ein Deckel auf den Bruttobetrag haette nur 5 %
 * netto zugelassen. Eine fruehere Fassung dieser Datei hat das umgekehrt
 * bezeichnet - das Verhalten war richtig, die Begruendung falsch.
 *
 * Offen (siehe docs/LEGAL_OPEN_QUESTIONS.md):
 *  - L-14: Erlaubt der Gesamtdeckel ("Summe der Hoechstsaetze") eine
 *    Verschiebung zwischen den Posten? Bis zur Klaerung wird jeder Posten
 *    einzeln eingehalten - hier ist das tatsaechlich die engere Auslegung.
 *  - L-17: Die EUROBETRAEGE der Verordnung sind an den Verbraucherpreis-
 *    index gebunden und liegen heute vermutlich ueber den Werten im Text.
 *    Die PROZENTSAETZE sind davon nicht betroffen. Deshalb stehen in dieser
 *    Datei ausschliesslich Prozentsaetze; jeder Eurobetrag aus der
 *    Verordnung gehoert in die versionierte Konfiguration, nie in den Code.
 */

import {
  type Money,
  type RoundingMode,
  add,
  applyBasisPoints,
  fromCents,
  min,
} from '@fp/money';

/**
 * Im Voraus zu zahlende Auftragsgebuehr: hoechstens 6 % der Forderung.
 * Daraus folgt rechnerisch, dass eine Gebuehr von 30 EUR erst ab einer
 * Forderung von 500 EUR gedeckt ist.
 */
export const MAX_ORDER_FEE_BASIS_POINTS = 600;

/**
 * Erfolgsabhaengige Verguetung bei nicht eingeklagten Forderungen:
 * hoechstens 15 % des eingebrachten Betrages.
 */
export const MAX_SUCCESS_FEE_BASIS_POINTS = 1500;

/**
 * Erhoehter Satz von hoechstens 40 %, nur in den Sonderfaellen der
 * Verordnung: nach wiederholten vergeblichen Inkassoversuchen, bei
 * verjaehrten Forderungen und bei Konkursforderungen.
 *
 * Ob ein Fall darunter faellt, ist eine rechtliche Wertung und wird nie
 * automatisch angenommen (LEGAL-REVIEW L-15).
 */
export const MAX_SUCCESS_FEE_BASIS_POINTS_SPECIAL = 4000;

/**
 * Stellt sich die Forderung als nicht bestehend heraus: hoechstens 20 %
 * der Forderung.
 */
export const MAX_FEE_BASIS_POINTS_CLAIM_NOT_EXISTING = 2000;

/**
 * Bemessungsgrundlage der erfolgsabhaengigen Verguetung sind die Betraege,
 * um die sich die Schuld durch Leistungen des Schuldners waehrend der
 * Vertragsdauer mindert.
 *
 * Daraus folgt: auch eine Direktzahlung des Schuldners an den Glaeubiger
 * loest die Verguetung aus. Das stuetzt das Modell "kein Kundengeld".
 * (Inferenz, moderat bis hoch - nicht hoechstgerichtlich geklaert.)
 */
export const SUCCESS_FEE_COVERS_DIRECT_PAYMENTS = true;

/** Prozentsatz im oesterreichischen Format, z. B. 1500 -> "15,00 %". */
export function formatBasisPoints(basisPoints: number): string {
  const whole = Math.trunc(basisPoints / 100);
  const fraction = Math.abs(basisPoints % 100)
    .toString()
    .padStart(2, '0');
  return `${whole},${fraction} %`;
}

/**
 * Bruttobetrag aus einem gedeckelten Nettobetrag.
 *
 * Die Deckel gelten fuer netto (§ 4 Abs 1), die Umsatzsteuer kommt hinzu.
 * Der Steuersatz wird uebergeben und nie angenommen - er stammt aus der
 * versionierten Konfiguration.
 */
export function addVat(
  net: Money,
  vatBasisPoints: number,
  mode: RoundingMode,
): { readonly net: Money; readonly vat: Money; readonly gross: Money } {
  const vat = applyBasisPoints(net, vatBasisPoints, mode);
  return { net, vat, gross: add(net, vat) };
}

export class CapExceededError extends Error {
  override readonly name = 'CapExceededError';
}

/**
 * Berechnet die tatsaechlich zulaessige Auftragsgebuehr fuer eine Forderung.
 *
 * `tierFeeCents` ist der konfigurierte Stufenbetrag, `principal` die
 * Hauptforderung. Zurueckgegeben wird der kleinere der beiden Werte, also
 * min(Stufenbetrag, 6 % der Forderung).
 *
 * Ein reiner Stufenbetrag ohne diese Deckelung waere am unteren Rand jeder
 * Stufe zwangslaeufig unzulaessig: 30 EUR auf eine Forderung von 200 EUR
 * waeren 15 % statt der erlaubten 6 %.
 */
export function cappedOrderFee(tierFeeCents: Money, principal: Money): Money {
  const cap = applyBasisPoints(principal, MAX_ORDER_FEE_BASIS_POINTS, 'DOWN');
  return min(tierFeeCents, cap);
}

/**
 * Kleinste Forderung, bei der ein bestimmter Gebuehrenbetrag noch gedeckt
 * ist. Fuer 30 EUR sind das 500 EUR.
 *
 * Wird in der Oberflaeche verwendet, um dem Glaeubiger verstaendlich zu
 * machen, warum die Gebuehr bei kleinen Forderungen niedriger ausfaellt.
 */
export function minimumPrincipalForFee(feeCents: Money): Money {
  // fee <= principal * 600 / 10000  =>  principal >= fee * 10000 / 600
  // Aufrunden, damit der Deckel sicher eingehalten ist.
  const numerator = feeCents * 10_000n;
  const quotient = numerator / BigInt(MAX_ORDER_FEE_BASIS_POINTS);
  const remainder = numerator % BigInt(MAX_ORDER_FEE_BASIS_POINTS);
  return fromCents(remainder === 0n ? quotient : quotient + 1n);
}

export interface SuccessFeeCapContext {
  /**
   * Ob einer der Sonderfaelle der Verordnung vorliegt. Wird nie automatisch
   * gesetzt, sondern nur nach dokumentierter rechtlicher Wertung.
   */
  readonly specialCase: boolean;
}

/** Obergrenze des Erfolgshonorarsatzes im jeweiligen Fall. */
export function successFeeCapBasisPoints(context: SuccessFeeCapContext): number {
  return context.specialCase
    ? MAX_SUCCESS_FEE_BASIS_POINTS_SPECIAL
    : MAX_SUCCESS_FEE_BASIS_POINTS;
}

/**
 * Prueft einen konfigurierten Erfolgshonorarsatz gegen den Deckel.
 * Wirft, statt still zu kappen: ein zu hoch konfigurierter Satz ist ein
 * Konfigurationsfehler, der auffallen muss.
 */
export function assertSuccessFeeWithinCap(
  basisPoints: number,
  context: SuccessFeeCapContext = { specialCase: false },
): void {
  const cap = successFeeCapBasisPoints(context);
  if (basisPoints > cap) {
    throw new CapExceededError(
      `Erfolgshonorarsatz von ${formatBasisPoints(basisPoints)} ueberschreitet den ` +
        `Hoechstsatz von ${formatBasisPoints(cap)} ` +
        '(§ 2 Verordnung BGBl 141/1996 idF BGBl II 103/2005)',
    );
  }
}
