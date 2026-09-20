/**
 * Darstellung von Betraegen im oesterreichischen Format.
 * CLAUDE.md 5: Betraege als `€ 1.234,56`.
 */

import type { Money } from './money.js';

export interface FormatOptions {
  /** Waehrungszeichen voranstellen. Standard: true. */
  readonly withSymbol?: boolean;
  /**
   * Vorzeichen auch bei positiven Betraegen anzeigen (z. B. in Buchungslisten).
   * Standard: false.
   */
  readonly explicitSign?: boolean;
}

/**
 * Formatiert einen Cent-Betrag als oesterreichische Euro-Angabe.
 *
 * Bewusst ohne `Intl.NumberFormat`: der Eingabewert ist ein `bigint` und
 * muesste fuer `Intl` erst in `number` umgewandelt werden. Bei sehr grossen
 * Betraegen wuerde das Praezision kosten. Die Formatierung erfolgt daher
 * direkt auf der Ziffernfolge.
 */
export function formatEuro(amount: Money, options: FormatOptions = {}): string {
  const withSymbol = options.withSymbol ?? true;
  const explicitSign = options.explicitSign ?? false;

  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;

  const centsPart = (absolute % 100n).toString().padStart(2, '0');
  const eurosPart = groupThousands((absolute / 100n).toString());

  const sign = negative ? '-' : explicitSign ? '+' : '';
  const symbol = withSymbol ? '€ ' : '';
  return `${sign}${symbol}${eurosPart},${centsPart}`;
}

/** Maschinenlesbare Darstellung: "1234.56". Fuer Exporte und Belege. */
export function formatDecimal(amount: Money): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const centsPart = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${absolute / 100n}.${centsPart}`;
}

function groupThousands(digits: string): string {
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    out += digits[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += '.';
  }
  return out;
}
