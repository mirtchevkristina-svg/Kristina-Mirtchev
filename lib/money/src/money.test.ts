import { describe, expect, it } from 'vitest';
import {
  MoneyError,
  ZERO,
  abs,
  add,
  allocate,
  allocateWaterfall,
  applyBasisPoints,
  applyRatio,
  compare,
  divideRounded,
  formatDecimal,
  formatEuro,
  fromCents,
  isNegative,
  isZero,
  multiply,
  negate,
  parseEuro,
  split,
  subtract,
  sum,
  toCentString,
} from './index.js';

describe('fromCents', () => {
  it('akzeptiert bigint, sichere Zahlen und Strings', () => {
    expect(toCentString(fromCents(1234n))).toBe('1234');
    expect(toCentString(fromCents(1234))).toBe('1234');
    expect(toCentString(fromCents('-1234'))).toBe('-1234');
  });

  it('lehnt Gleitkommazahlen ab', () => {
    expect(() => fromCents(12.5)).toThrow(MoneyError);
  });

  it('lehnt nicht-ganzzahlige Strings ab', () => {
    expect(() => fromCents('12.50')).toThrow(MoneyError);
  });
});

describe('parseEuro', () => {
  it('parst oesterreichisches Format mit Tausendertrenner', () => {
    expect(toCentString(parseEuro('1.234,56'))).toBe('123456');
    expect(toCentString(parseEuro('1.234.567,89'))).toBe('123456789');
  });

  it('parst Komma-Dezimaltrenner ohne Tausendertrenner', () => {
    expect(toCentString(parseEuro('1234,56'))).toBe('123456');
    expect(toCentString(parseEuro('12,5'))).toBe('1250');
  });

  it('parst maschinelles Format mit Punkt als Dezimaltrenner', () => {
    expect(toCentString(parseEuro('1234.56'))).toBe('123456');
  });

  it('behandelt einen Punkt mit drei Folgeziffern als Tausendertrenner', () => {
    expect(toCentString(parseEuro('1.234'))).toBe('123400');
  });

  it('parst negative Betraege und Eurozeichen', () => {
    expect(toCentString(parseEuro('-12,00'))).toBe('-1200');
    expect(toCentString(parseEuro('€ 99,99'))).toBe('9999');
  });

  it('lehnt mehr als zwei Nachkommastellen ab, statt still zu runden', () => {
    expect(() => parseEuro('12,345')).toThrow(MoneyError);
  });

  it('lehnt mehrdeutige und leere Eingaben ab', () => {
    expect(() => parseEuro('1,234.56')).toThrow(MoneyError);
    expect(() => parseEuro('')).toThrow(MoneyError);
    expect(() => parseEuro('abc')).toThrow(MoneyError);
  });
});

describe('Grundrechenarten', () => {
  it('addiert, subtrahiert und summiert exakt', () => {
    expect(toCentString(add(fromCents(1999), fromCents(1)))).toBe('2000');
    expect(toCentString(subtract(fromCents(1000), fromCents(2500)))).toBe('-1500');
    expect(toCentString(sum([fromCents(10), fromCents(20), fromCents(30)]))).toBe('60');
    expect(toCentString(sum([]))).toBe('0');
  });

  it('kennt Vorzeichen-Hilfsfunktionen', () => {
    expect(isZero(ZERO)).toBe(true);
    expect(isNegative(fromCents(-1))).toBe(true);
    expect(toCentString(abs(fromCents(-500)))).toBe('500');
    expect(toCentString(negate(fromCents(500)))).toBe('-500');
    expect(compare(fromCents(1), fromCents(2))).toBe(-1);
    expect(compare(fromCents(2), fromCents(2))).toBe(0);
  });

  it('multipliziert mit ganzzahligem Faktor', () => {
    expect(toCentString(multiply(fromCents(333), 3))).toBe('999');
  });

  it('haelt grosse Betraege exakt, wo Gleitkomma versagen wuerde', () => {
    // 90.071.992.547.409,93 EUR liegt ueber Number.MAX_SAFE_INTEGER in Cent.
    const huge = fromCents('9007199254740993');
    expect(toCentString(add(huge, fromCents(1)))).toBe('9007199254740994');
  });
});

describe('Rundung', () => {
  it('rundet HALF_UP kaufmaennisch', () => {
    expect(toCentString(divideRounded(fromCents(5), 2, 'HALF_UP'))).toBe('3');
    expect(toCentString(divideRounded(fromCents(7), 2, 'HALF_UP'))).toBe('4');
  });

  it('rundet HALF_EVEN zur geraden Zahl', () => {
    expect(toCentString(divideRounded(fromCents(5), 2, 'HALF_EVEN'))).toBe('2');
    expect(toCentString(divideRounded(fromCents(7), 2, 'HALF_EVEN'))).toBe('4');
  });

  it('rundet DOWN und UP richtungsgebunden', () => {
    expect(toCentString(divideRounded(fromCents(9), 2, 'DOWN'))).toBe('4');
    expect(toCentString(divideRounded(fromCents(9), 2, 'UP'))).toBe('5');
  });

  it('rundet negative Betraege symmetrisch zum Betrag', () => {
    expect(toCentString(divideRounded(fromCents(-5), 2, 'HALF_UP'))).toBe('-3');
    expect(toCentString(divideRounded(fromCents(-9), 2, 'DOWN'))).toBe('-4');
  });

  it('lehnt Division durch null ab', () => {
    expect(() => divideRounded(fromCents(100), 0, 'HALF_UP')).toThrow(MoneyError);
  });
});

describe('applyBasisPoints', () => {
  it('berechnet Prozentsaetze ohne Gleitkomma', () => {
    // 15 % von 1.000,00 EUR
    expect(toCentString(applyBasisPoints(fromCents(100_000), 1500, 'HALF_UP'))).toBe('15000');
    // 20 % USt auf 12,34 EUR = 2,468 -> 2,47
    expect(toCentString(applyBasisPoints(fromCents(1234), 2000, 'HALF_UP'))).toBe('247');
  });

  it('trifft den klassischen Gleitkomma-Fehlerfall exakt', () => {
    // 0,1 + 0,2 !== 0,3 in Gleitkomma; hier muss 10 % von 0,35 = 0,04 (HALF_UP) sein.
    expect(toCentString(applyBasisPoints(fromCents(35), 1000, 'HALF_UP'))).toBe('4');
    expect(toCentString(applyBasisPoints(fromCents(35), 1000, 'HALF_EVEN'))).toBe('4');
  });

  it('lehnt negative Saetze ab', () => {
    expect(() => applyBasisPoints(fromCents(100), -1, 'HALF_UP')).toThrow(MoneyError);
  });

  it('berechnet beliebige Verhaeltnisse', () => {
    expect(toCentString(applyRatio(fromCents(1000), 1n, 3n, 'HALF_UP'))).toBe('333');
  });
});

describe('split', () => {
  it('verteilt ohne Cent-Verlust', () => {
    const parts = split(fromCents(10_000), 3);
    expect(parts.map(toCentString)).toEqual(['3334', '3333', '3333']);
    expect(toCentString(sum(parts))).toBe('10000');
  });

  it('funktioniert bei glatter Teilung', () => {
    const parts = split(fromCents(900), 3);
    expect(parts.map(toCentString)).toEqual(['300', '300', '300']);
  });

  it('funktioniert bei negativen Betraegen', () => {
    const parts = split(fromCents(-10), 3);
    expect(toCentString(sum(parts))).toBe('-10');
  });

  it('lehnt ungueltige Teilungen ab', () => {
    expect(() => split(fromCents(100), 0)).toThrow(MoneyError);
    expect(() => split(fromCents(100), 1.5)).toThrow(MoneyError);
  });
});

describe('allocate', () => {
  it('verteilt nach Gewichten ohne Cent-Verlust', () => {
    const parts = allocate(fromCents(10_000), [1n, 1n, 1n]);
    expect(toCentString(sum(parts))).toBe('10000');
    expect(parts.map(toCentString)).toEqual(['3334', '3333', '3333']);
  });

  it('gibt Restcent nach groesstem Rest und dann nach Index', () => {
    // 100 Cent auf Gewichte 1:2 -> 33,33 / 66,67
    const parts = allocate(fromCents(100), [1n, 2n]);
    expect(parts.map(toCentString)).toEqual(['33', '67']);
  });

  it('beruecksichtigt Nullgewichte', () => {
    const parts = allocate(fromCents(100), [0n, 1n]);
    expect(parts.map(toCentString)).toEqual(['0', '100']);
  });

  it('lehnt ungueltige Gewichte ab', () => {
    expect(() => allocate(fromCents(100), [])).toThrow(MoneyError);
    expect(() => allocate(fromCents(100), [0n, 0n])).toThrow(MoneyError);
    expect(() => allocate(fromCents(100), [-1n, 2n])).toThrow(MoneyError);
  });
});

describe('allocateWaterfall', () => {
  const targets = [
    { id: 'kosten', outstanding: fromCents(3000) },
    { id: 'zinsen', outstanding: fromCents(1500) },
    { id: 'hauptforderung', outstanding: fromCents(100_000) },
  ];

  it('tilgt Posten in der uebergebenen Reihenfolge', () => {
    const result = allocateWaterfall(fromCents(4000), targets);
    expect(result.allocations.map((a) => [a.targetId, toCentString(a.amount)])).toEqual([
      ['kosten', '3000'],
      ['zinsen', '1000'],
    ]);
    expect(toCentString(result.unallocated)).toBe('0');
  });

  it('meldet Ueberzahlung als nicht angerechneten Rest', () => {
    const result = allocateWaterfall(fromCents(200_000), targets);
    expect(toCentString(result.unallocated)).toBe('95500');
  });

  it('ueberspringt bereits getilgte Posten', () => {
    const result = allocateWaterfall(fromCents(500), [
      { id: 'kosten', outstanding: ZERO },
      { id: 'zinsen', outstanding: fromCents(1500) },
    ]);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]?.targetId).toBe('zinsen');
  });

  it('lehnt negative Zahlungen und negative offene Posten ab', () => {
    expect(() => allocateWaterfall(fromCents(-1), targets)).toThrow(MoneyError);
    expect(() =>
      allocateWaterfall(fromCents(100), [{ id: 'x', outstanding: fromCents(-1) }]),
    ).toThrow(MoneyError);
  });

  it('verliert bei Teilzahlungen in Serie keinen Cent', () => {
    let remaining = [...targets];
    let totalAllocated = ZERO;
    for (const payment of [fromCents(1000), fromCents(1000), fromCents(3333)]) {
      const result = allocateWaterfall(payment, remaining);
      for (const a of result.allocations) {
        totalAllocated = add(totalAllocated, a.amount);
        remaining = remaining.map((t) =>
          t.id === a.targetId ? { id: t.id, outstanding: subtract(t.outstanding, a.amount) } : t,
        );
      }
    }
    expect(toCentString(totalAllocated)).toBe('5333');
  });
});

describe('Formatierung', () => {
  it('formatiert im oesterreichischen Format', () => {
    expect(formatEuro(fromCents(123_456))).toBe('€ 1.234,56');
    expect(formatEuro(fromCents(5))).toBe('€ 0,05');
    expect(formatEuro(fromCents(-123_456))).toBe('-€ 1.234,56');
    expect(formatEuro(fromCents(100_000_000))).toBe('€ 1.000.000,00');
  });

  it('kann Symbol weglassen und Vorzeichen erzwingen', () => {
    expect(formatEuro(fromCents(1000), { withSymbol: false })).toBe('10,00');
    expect(formatEuro(fromCents(1000), { withSymbol: false, explicitSign: true })).toBe('+10,00');
  });

  it('formatiert maschinenlesbar', () => {
    expect(formatDecimal(fromCents(123_456))).toBe('1234.56');
    expect(formatDecimal(fromCents(-5))).toBe('-0.05');
  });

  it('ist verlustfrei umkehrbar', () => {
    for (const cents of ['0', '1', '99', '100', '123456789', '-4200']) {
      const money = fromCents(cents);
      expect(toCentString(parseEuro(formatDecimal(money)))).toBe(cents);
    }
  });
});
