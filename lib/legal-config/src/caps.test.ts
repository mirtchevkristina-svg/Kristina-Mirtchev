import { describe, expect, it } from 'vitest';
import { applyBasisPoints, formatEuro, fromCents, parseEuro, toCentString } from '@fp/money';
import {
  CapExceededError,
  addVat,
  MAX_ORDER_FEE_BASIS_POINTS,
  MAX_SUCCESS_FEE_BASIS_POINTS,
  MAX_SUCCESS_FEE_BASIS_POINTS_SPECIAL,
  assertSuccessFeeWithinCap,
  cappedOrderFee,
  computeOrderFee,
  demoRegistry,
  minimumPrincipalForFee,
  resolve,
  successFeeCapBasisPoints,
  validateRegistry,
} from './index.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');

describe('Auftragsgebuehr: Deckel von 6 % der Forderung', () => {
  it('deckelt 30 EUR bei einer Forderung von 200 EUR auf 12 EUR', () => {
    const fee = cappedOrderFee(parseEuro('30,00'), parseEuro('200,00'));
    expect(formatEuro(fee)).toBe('€ 12,00');
  });

  it('laesst 30 EUR ab einer Forderung von 500 EUR unveraendert', () => {
    expect(formatEuro(cappedOrderFee(parseEuro('30,00'), parseEuro('500,00')))).toBe('€ 30,00');
    expect(formatEuro(cappedOrderFee(parseEuro('30,00'), parseEuro('5.000,00')))).toBe('€ 30,00');
  });

  it('nennt 500 EUR als kleinste Forderung, bei der 30 EUR gedeckt sind', () => {
    expect(formatEuro(minimumPrincipalForFee(parseEuro('30,00')))).toBe('€ 500,00');
    expect(formatEuro(minimumPrincipalForFee(parseEuro('12,00')))).toBe('€ 200,00');
  });

  it('rundet die Mindestforderung auf, damit der Deckel sicher eingehalten ist', () => {
    // 0,01 EUR Gebuehr -> 6 % von X >= 0,01 -> X >= 0,1667 EUR -> aufgerundet 0,17 EUR
    const minimum = minimumPrincipalForFee(fromCents(1));
    expect(toCentString(minimum)).toBe('17');
    expect(toCentString(cappedOrderFee(fromCents(1), minimum))).toBe('1');
  });

  it('rundet den Deckel zugunsten des Glaeubigers ab', () => {
    // 6 % von 100,05 EUR = 6,003 EUR -> 6,00 EUR, nicht 6,01 EUR
    expect(formatEuro(cappedOrderFee(parseEuro('30,00'), parseEuro('100,05')))).toBe('€ 6,00');
  });

  it('haelt den Deckel ueber einen breiten Betragsbereich ein', () => {
    for (const euro of ['1,00', '50,00', '199,99', '200,00', '499,99', '500,00', '10.000,00']) {
      const principal = parseEuro(euro);
      const fee = cappedOrderFee(parseEuro('30,00'), principal);
      // fee * 10000 <= principal * 600
      expect(fee * 10_000n <= principal * BigInt(MAX_ORDER_FEE_BASIS_POINTS)).toBe(true);
    }
  });
});

describe('computeOrderFee', () => {
  const rule = resolve(demoRegistry, 'platform_fee', NOW).value;

  it('waehlt die Stufe und wendet danach den Deckel an', () => {
    const small = computeOrderFee(rule, parseEuro('100,00'));
    expect(small.cappedByStatute).toBe(true);
    expect(formatEuro(small.feeCents)).toBe('€ 6,00');

    const large = computeOrderFee(rule, parseEuro('4.000,00'));
    expect(large.cappedByStatute).toBe(false);
    expect(formatEuro(large.feeCents)).toBe('€ 30,00');
  });

  it('waehlt die offene Stufe fuer sehr grosse Forderungen', () => {
    const result = computeOrderFee(rule, parseEuro('50.000,00'));
    expect(formatEuro(result.tierFeeCents)).toBe('€ 90,00');
    expect(result.cappedByStatute).toBe(false);
  });

  it('lehnt eine Forderung von null oder weniger ab', () => {
    expect(() => computeOrderFee(rule, fromCents(0))).toThrow(/groesser als null/);
  });

  it('gibt den Stufenbetrag mit aus, damit die Deckelung erklaerbar ist', () => {
    const result = computeOrderFee(rule, parseEuro('100,00'));
    expect(formatEuro(result.tierFeeCents)).toBe('€ 15,00');
    expect(formatEuro(result.feeCents)).toBe('€ 6,00');
  });
});

describe('Erfolgshonorar: Deckel von 15 %', () => {
  it('nennt 15 % als Regelobergrenze und 40 % im Sonderfall', () => {
    expect(successFeeCapBasisPoints({ specialCase: false })).toBe(MAX_SUCCESS_FEE_BASIS_POINTS);
    expect(successFeeCapBasisPoints({ specialCase: true })).toBe(
      MAX_SUCCESS_FEE_BASIS_POINTS_SPECIAL,
    );
  });

  it('akzeptiert genau 15 %', () => {
    expect(() => assertSuccessFeeWithinCap(1500)).not.toThrow();
  });

  it('wirft bei 15,01 % statt still zu kappen', () => {
    expect(() => assertSuccessFeeWithinCap(1501)).toThrow(CapExceededError);
    expect(() => assertSuccessFeeWithinCap(1501)).toThrow(/15,00 %/);
  });

  it('erlaubt bis 40 % nur im ausdruecklich gesetzten Sonderfall', () => {
    expect(() => assertSuccessFeeWithinCap(4000, { specialCase: true })).not.toThrow();
    expect(() => assertSuccessFeeWithinCap(4001, { specialCase: true })).toThrow(CapExceededError);
    expect(() => assertSuccessFeeWithinCap(2000, { specialCase: false })).toThrow(CapExceededError);
  });

  it('nimmt den Sonderfall nie automatisch an', () => {
    expect(successFeeCapBasisPoints({ specialCase: false })).toBe(1500);
  });
});

describe('Registry-Validierung gegen den Hoechstsatz', () => {
  it('meldet einen zu hohen konfigurierten Erfolgshonorarsatz', () => {
    const registry = {
      ...demoRegistry,
      success_fee: {
        ...demoRegistry.success_fee,
        versions: [
          {
            ...demoRegistry.success_fee.versions[0]!,
            value: {
              ...demoRegistry.success_fee.versions[0]!.value,
              basisPoints: 2500,
            },
          },
        ],
      },
    };
    const issues = validateRegistry(registry);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('ueberschreitet den Hoechstsatz');
  });

  it('laesst den Demo-Satz von 10 % durch', () => {
    expect(validateRegistry(demoRegistry)).toEqual([]);
  });
});

describe('Umsatzsteuer: Deckel gilt netto (§ 4 Abs 1)', () => {
  it('rechnet die Umsatzsteuer auf den gedeckelten Nettobetrag', () => {
    // Beispiel: 15 % Erfolgshonorar auf 6.000,00 EUR = 900,00 EUR netto,
    // zuzueglich 20 % USt = 180,00 EUR, in Summe 1.080,00 EUR.
    const net = applyBasisPoints(parseEuro('6.000,00'), 1500, 'HALF_UP');
    expect(formatEuro(net)).toBe('€\u00a0900,00');

    const result = addVat(net, 2000, 'HALF_UP');
    expect(formatEuro(result.vat)).toBe('€\u00a0180,00');
    expect(formatEuro(result.gross)).toBe('€\u00a01.080,00');
  });

  it('deckelt die Auftragsgebuehr netto und legt die Steuer darauf', () => {
    const rule = resolve(demoRegistry, 'platform_fee', NOW).value;
    // 200,00 EUR Forderung: Deckel greift bei 12,00 EUR netto.
    const result = computeOrderFee(rule, parseEuro('200,00'));
    expect(result.cappedByStatute).toBe(true);
    expect(formatEuro(result.feeCents)).toBe('€\u00a012,00');
    expect(formatEuro(result.vatCents)).toBe('€\u00a02,40');
    expect(formatEuro(result.grossCents)).toBe('€\u00a014,40');
  });

  it('haelt netto den Deckel ein, auch wenn brutto darueber liegt', () => {
    // Das ist der Kern von § 4 Abs 1: brutto 14,40 sind 7,2 % von 200,00 -
    // zulaessig, weil der Deckel fuer den Nettobetrag gilt.
    const rule = resolve(demoRegistry, 'platform_fee', NOW).value;
    const principal = parseEuro('200,00');
    const result = computeOrderFee(rule, principal);

    expect(result.feeCents * 10_000n <= principal * 600n).toBe(true);
    expect(result.grossCents * 10_000n > principal * 600n).toBe(true);
  });

  it('nimmt keinen Steuersatz an, sondern verlangt ihn als Parameter', () => {
    expect(formatEuro(addVat(parseEuro('100,00'), 0, 'HALF_UP').gross)).toBe('€\u00a0100,00');
    expect(formatEuro(addVat(parseEuro('100,00'), 1000, 'HALF_UP').gross)).toBe('€\u00a0110,00');
  });

  it('rundet die Steuer kaufmaennisch auf ganze Cent', () => {
    // 20 % von 12,34 EUR = 2,468 -> 2,47
    expect(formatEuro(addVat(parseEuro('12,34'), 2000, 'HALF_UP').vat)).toBe('€\u00a02,47');
  });

  it('drueckt jeden gesetzlichen Wert als Satz aus, nie als Betrag', async () => {
    // Die Eurobetraege der Verordnung sind an den Verbraucherpreisindex
    // gebunden und aendern sich; nur die Prozentsaetze sind indexfest.
    // Deshalb darf in dieser Datei kein Eurobetrag als Konstante stehen -
    // jeder Betrag gehoert in die versionierte Konfiguration.
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./caps.ts', import.meta.url), 'utf8'),
    );
    const numericConstants = [
      ...source.matchAll(/^export const ([A-Z0-9_]+)\s*=\s*-?\d/gm),
    ].map((match) => match[1]!);

    expect(numericConstants.length).toBeGreaterThan(0);
    for (const name of numericConstants) {
      expect(name).toMatch(/_BASIS_POINTS(_[A-Z_]+)?$/);
    }
  });
});
