/**
 * Money-Library des Forderungsportals.
 *
 * Invariante (CLAUDE.md 1.6): Geldbetraege sind ganzzahlige Cent.
 * Intern `bigint`, damit die Arithmetik exakt ist und der DB-Typ `bigint`
 * ohne Praezisionsverlust abgebildet wird. Es gibt bewusst KEINE Funktion,
 * die einen Euro-Betrag als `number` (Gleitkomma) entgegennimmt.
 *
 * Waehrung ist ausschliesslich EUR. Sollte das Portal spaeter weitere
 * Waehrungen unterstuetzen, muss der Typ um ein Waehrungsfeld erweitert und
 * jede Operation gegen Waehrungsmischung abgesichert werden.
 */

declare const moneyBrand: unique symbol;

/** Ganzzahliger Cent-Betrag in EUR. Kann negativ sein (z. B. Gutschriften). */
export type Money = bigint & { readonly [moneyBrand]: 'EUR' };

export class MoneyError extends Error {
  override readonly name = 'MoneyError';
}

// Plausibilitaetsgrenze gegen Ueberlauf- und Vorzeichenfehler, nicht gegen
// grosse Forderungen: 10^18 Cent sind 10 Billiarden EUR. Die Grenze wird nur
// auf Ergebnisse angewandt, nie auf Zwischenergebnisse einer Berechnung.
const MAX_CENTS = 10n ** 18n;

function brand(cents: bigint): Money {
  if (cents > MAX_CENTS || cents < -MAX_CENTS) {
    throw new MoneyError(`Betrag ausserhalb des zulaessigen Bereichs: ${cents}`);
  }
  return cents as Money;
}

/** Nullbetrag. */
export const ZERO: Money = brand(0n);

/**
 * Erzeugt einen Betrag aus ganzzahligen Cent.
 * `number` ist nur erlaubt, wenn es eine sichere ganze Zahl ist.
 */
export function fromCents(cents: bigint | number | string): Money {
  if (typeof cents === 'bigint') return brand(cents);
  if (typeof cents === 'number') {
    if (!Number.isSafeInteger(cents)) {
      throw new MoneyError(
        `Cent-Betrag muss eine sichere ganze Zahl sein, erhalten: ${cents}`,
      );
    }
    return brand(BigInt(cents));
  }
  if (!/^-?\d+$/.test(cents)) {
    throw new MoneyError(`Cent-Betrag als String muss ganzzahlig sein: "${cents}"`);
  }
  return brand(BigInt(cents));
}

/**
 * Parst einen Euro-Betrag aus einer Zeichenkette.
 *
 * Akzeptiert oesterreichische Schreibweise ("1.234,56", "1234,5", "-12,00")
 * und maschinelle Schreibweise ("1234.56"). Mehr als zwei Nachkommastellen
 * werden abgelehnt, statt still gerundet zu werden - eine dritte Stelle
 * deutet auf einen Eingabe- oder Importfehler hin.
 */
export function parseEuro(input: string): Money {
  const raw = input.trim().replace(/\s/g, '').replace(/^€/, '').trim();
  if (raw === '') throw new MoneyError('Leere Betragsangabe');

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;

  let normalised: string;
  const hasComma = unsigned.includes(',');
  const hasDot = unsigned.includes('.');

  if (hasComma && hasDot) {
    // "1.234,56" - Punkt ist Tausendertrenner, Komma ist Dezimaltrenner.
    if (unsigned.lastIndexOf(',') < unsigned.lastIndexOf('.')) {
      throw new MoneyError(`Nicht eindeutiges Zahlenformat: "${input}"`);
    }
    normalised = unsigned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalised = unsigned.replace(',', '.');
  } else if (hasDot) {
    // Ein Punkt kann Tausendertrenner ("1.234") oder Dezimaltrenner ("1234.56")
    // sein. Genau drei Nachkommastellen ohne weitere Punkte sind mehrdeutig.
    const parts = unsigned.split('.');
    const last = parts[parts.length - 1] ?? '';
    if (parts.length > 2 || last.length === 3) {
      normalised = unsigned.replace(/\./g, '');
    } else {
      normalised = unsigned;
    }
  } else {
    normalised = unsigned;
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalised);
  if (!match) {
    throw new MoneyError(`Ungueltiger Betrag: "${input}"`);
  }
  const euros = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const cents = BigInt(euros) * 100n + BigInt(fraction);
  return brand(negative ? -cents : cents);
}

/** Rohe Cent als `bigint`. Fuer DB-Schreibvorgaenge. */
export function toCents(amount: Money): bigint {
  return amount;
}

/**
 * Cent als String. Bevorzugte Darstellung fuer JSON/API-Grenzen, weil
 * `bigint` nicht JSON-serialisierbar ist und `number` bei sehr grossen
 * Betraegen an Praezision verlieren wuerde.
 */
export function toCentString(amount: Money): string {
  return amount.toString();
}

export function add(a: Money, b: Money): Money {
  return brand(a + b);
}

export function subtract(a: Money, b: Money): Money {
  return brand(a - b);
}

export function negate(a: Money): Money {
  return brand(-a);
}

export function abs(a: Money): Money {
  return brand(a < 0n ? -a : a);
}

export function sum(amounts: readonly Money[]): Money {
  let total = 0n;
  for (const amount of amounts) total += amount;
  return brand(total);
}

/** Multiplikation mit einem ganzzahligen Faktor (z. B. Anzahl Raten). */
export function multiply(amount: Money, factor: bigint | number): Money {
  const f = typeof factor === 'bigint' ? factor : BigInt(assertSafeInteger(factor));
  return brand(amount * f);
}

export function isZero(a: Money): boolean {
  return a === 0n;
}

export function isNegative(a: Money): boolean {
  return a < 0n;
}

export function isPositive(a: Money): boolean {
  return a > 0n;
}

/** -1, 0 oder 1 - fuer Sortierung und Vergleiche. */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function equals(a: Money, b: Money): boolean {
  return a === b;
}

export function min(a: Money, b: Money): Money {
  return a <= b ? a : b;
}

export function max(a: Money, b: Money): Money {
  return a >= b ? a : b;
}

/**
 * Rundungsmodi.
 *
 * `HALF_UP` entspricht der kaufmaennischen Rundung und ist der Standard fuer
 * Betraege gegenueber Schuldnern und Glaeubigern. `HALF_EVEN` steht fuer
 * Anwendungsfaelle bereit, in denen eine statistisch unverzerrte Rundung
 * gefordert wird. `DOWN` rundet immer zugunsten des Zahlenden ab.
 *
 * LEGAL-REVIEW: Welcher Rundungsmodus fuer die Umsatzsteuer auf das
 * Erfolgshonorar zu verwenden ist, ist fachlich festzulegen. Bis dahin wird
 * an den Aufrufstellen der Modus explizit uebergeben, nie implizit gewaehlt.
 */
export type RoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'DOWN' | 'UP';

/**
 * Teilt `amount` durch `divisor` und rundet auf ganze Cent.
 * Arbeitet durchgaengig auf ganzen Zahlen, daher keine Gleitkommafehler.
 */
export function divideRounded(
  amount: Money,
  divisor: bigint | number,
  mode: RoundingMode,
): Money {
  const d = typeof divisor === 'bigint' ? divisor : BigInt(assertSafeInteger(divisor));
  if (d === 0n) throw new MoneyError('Division durch null');
  return brand(roundedQuotient(amount, d, mode));
}

/**
 * Wendet einen Satz in Basispunkten an (1 Basispunkt = 0,01 %).
 * Beispiel: 15 % Erfolgshonorar entspricht `basisPoints = 1500`.
 *
 * Saetze werden als Basispunkte uebergeben, damit kein Gleitkommawert in die
 * Berechnung geraet (CLAUDE.md 1.6/1.7).
 */
export function applyBasisPoints(
  amount: Money,
  basisPoints: bigint | number,
  mode: RoundingMode,
): Money {
  const bp =
    typeof basisPoints === 'bigint' ? basisPoints : BigInt(assertSafeInteger(basisPoints));
  if (bp < 0n) throw new MoneyError('Negative Basispunkte sind nicht zulaessig');
  // Bewusst ohne brand() auf dem Zwischenergebnis: amount * bp kann die
  // Plausibilitaetsgrenze ueberschreiten, obwohl das Ergebnis darunter liegt.
  return brand(roundedQuotient(amount * bp, 10_000n, mode));
}

/**
 * Anteil `numerator/denominator` eines Betrags, exakt gerundet.
 * Nuetzlich fuer Quoten, die nicht als Basispunkte ausgedrueckt sind.
 */
export function applyRatio(
  amount: Money,
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode,
): Money {
  if (denominator === 0n) throw new MoneyError('Division durch null');
  return brand(roundedQuotient(amount * numerator, denominator, mode));
}

function assertSafeInteger(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Ganzzahliger Wert erwartet, erhalten: ${value}`);
  }
  return value;
}

/**
 * Ganzzahlige Division mit Rundung. `divisor` muss ungleich null sein.
 * Negative Betraege werden symmetrisch behandelt: der Betrag wird vom
 * Vorzeichen getrennt gerundet, damit -0,005 und +0,005 gleich behandelt
 * werden ("round half away from zero" bei HALF_UP).
 */
function roundedQuotient(value: bigint, divisor: bigint, mode: RoundingMode): bigint {
  const negative = value < 0n !== divisor < 0n;
  const v = value < 0n ? -value : value;
  const d = divisor < 0n ? -divisor : divisor;

  const quotient = v / d;
  const remainder = v % d;
  if (remainder === 0n) return negative ? -quotient : quotient;

  let rounded: bigint;
  switch (mode) {
    case 'DOWN':
      rounded = quotient;
      break;
    case 'UP':
      rounded = quotient + 1n;
      break;
    case 'HALF_UP': {
      rounded = remainder * 2n >= d ? quotient + 1n : quotient;
      break;
    }
    case 'HALF_EVEN': {
      const twice = remainder * 2n;
      if (twice > d) rounded = quotient + 1n;
      else if (twice < d) rounded = quotient;
      else rounded = quotient % 2n === 0n ? quotient : quotient + 1n;
      break;
    }
  }
  return negative ? -rounded : rounded;
}
