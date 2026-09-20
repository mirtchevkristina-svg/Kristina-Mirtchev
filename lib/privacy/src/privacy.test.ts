import { describe, expect, it } from 'vitest';
import { REDACTED, pseudonymize, redact, redactString, rehydrate } from './index.js';

describe('redact', () => {
  it('redigiert sensible Feldnamen', () => {
    const out = redact({ name: 'Max Mustermann', claimId: 'claim_1', iban: 'AT611904300234573201' });
    expect(out).toEqual({ name: REDACTED, claimId: 'claim_1', iban: REDACTED });
  });

  it('redigiert PII-Muster auch in Freitextfeldern', () => {
    const out = redact({ note: 'Bitte an max@example.com senden, IBAN AT611904300234573201' }) as {
      note: string;
    };
    expect(out.note).not.toContain('max@example.com');
    expect(out.note).not.toContain('AT611904300234573201');
    expect(out.note).toContain(REDACTED);
  });

  it('arbeitet rekursiv und ueber Arrays', () => {
    const out = redact({ parties: [{ email: 'a@b.de' }, { email: 'c@d.de' }] });
    expect(out).toEqual({ parties: [{ email: REDACTED }, { email: REDACTED }] });
  });

  it('laesst unkritische Werte unveraendert', () => {
    expect(redact({ amountCents: 1234, group: 'offen', active: true })).toEqual({
      amountCents: 1234,
      group: 'offen',
      active: true,
    });
  });

  it('begrenzt die Tiefe', () => {
    let deep: Record<string, unknown> = { value: 'x' };
    for (let i = 0; i < 20; i += 1) deep = { nested: deep };
    expect(JSON.stringify(redact(deep))).toContain(REDACTED);
  });

  it('redigiert Telefonnummern in verschiedenen Schreibweisen', () => {
    expect(redactString('Tel. +43 664 1234567')).toContain(REDACTED);
    expect(redactString('Tel. 0664/1234567')).toContain(REDACTED);
  });
});

describe('pseudonymize', () => {
  it('ersetzt bekannte Werte durch stabile Platzhalter', () => {
    const result = pseudonymize('Herr Max Mustermann schuldet den Betrag.', {
      schuldner: 'Max Mustermann',
    });
    expect(result.text).toBe('Herr [SCHULDNER_1] schuldet den Betrag.');
    expect(result.mapping.get('[SCHULDNER_1]')).toBe('Max Mustermann');
  });

  it('ersetzt den laengsten Wert zuerst', () => {
    const result = pseudonymize('Max Mustermann, Max', {
      kurz: 'Max',
      lang: 'Max Mustermann',
    });
    expect(result.text).toContain('[LANG_1]');
    expect(result.text).not.toContain('Mustermann');
  });

  it('erfasst zusaetzlich unbekannte PII-Muster im Freitext', () => {
    const result = pseudonymize('Kontakt: dritter@example.com, IBAN AT611904300234573201', {});
    expect(result.text).not.toContain('dritter@example.com');
    expect(result.text).not.toContain('AT611904300234573201');
    expect(result.mapping.size).toBe(2);
  });

  it('verwendet fuer denselben Wert denselben Platzhalter', () => {
    const result = pseudonymize('a@b.de und nochmal a@b.de', {});
    expect(result.mapping.size).toBe(1);
    const placeholder = [...result.mapping.keys()][0]!;
    expect(result.text.split(placeholder)).toHaveLength(3);
  });

  it('ist ueber rehydrate umkehrbar', () => {
    const original = 'Max Mustermann, max@example.com';
    const result = pseudonymize(original, { schuldner: 'Max Mustermann' });
    expect(rehydrate(result.text, result)).toBe(original);
  });

  it('ignoriert zu kurze Werte, die sonst Text zerstoeren wuerden', () => {
    const result = pseudonymize('Die Ware war ok', { name: 'ok' });
    expect(result.text).toBe('Die Ware war ok');
  });
});
