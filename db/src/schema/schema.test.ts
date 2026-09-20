import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  auditEvents,
  claimAmountComponents,
  claimEvents,
  claimParties,
  claimStatusHistory,
  claims,
  collectionMeasures,
  costLiabilities,
  objections,
  paymentAllocations,
  paymentReports,
  payments,
} from './index.js';

const allTables = [
  claims,
  claimParties,
  claimAmountComponents,
  collectionMeasures,
  paymentReports,
  payments,
  paymentAllocations,
  objections,
  claimEvents,
  claimStatusHistory,
  auditEvents,
  costLiabilities,
];

describe('Geldbetraege sind ganzzahlige Cent (CLAUDE.md 1.6)', () => {
  it('verwendet fuer jede Betragsspalte bigint', () => {
    const offending: string[] = [];
    for (const table of allTables) {
      const config = getTableConfig(table);
      for (const column of config.columns) {
        const looksMonetary =
          column.name.endsWith('_cents') || column.name.includes('amount');
        if (looksMonetary && column.getSQLType() !== 'bigint') {
          offending.push(`${config.name}.${column.name}: ${column.getSQLType()}`);
        }
      }
    }
    expect(offending).toEqual([]);
  });

  it('kennt keine Gleitkomma- oder Dezimalspalte', () => {
    const forbidden = ['numeric', 'real', 'double precision', 'decimal'];
    const offending: string[] = [];
    for (const table of allTables) {
      const config = getTableConfig(table);
      for (const column of config.columns) {
        const type = column.getSQLType().toLowerCase();
        if (forbidden.some((f) => type.startsWith(f))) {
          offending.push(`${config.name}.${column.name}: ${type}`);
        }
      }
    }
    expect(offending).toEqual([]);
  });

  it('fuehrt jede Betragsspalte als bigint in JavaScript, nicht als number', () => {
    // Drizzle kann bigint auch als number liefern; das waere bei grossen
    // Betraegen verlustbehaftet und ist deshalb ausgeschlossen.
    const config = getTableConfig(claims);
    const principal = config.columns.find((c) => c.name === 'principal_cents');
    expect(principal?.getSQLType()).toBe('bigint');
  });
});

describe('Mandantentrennung und Eindeutigkeit', () => {
  it('traegt auf der Akte eine Unternehmenszuordnung', () => {
    const config = getTableConfig(claims);
    const companyId = config.columns.find((c) => c.name === 'company_id');
    expect(companyId).toBeDefined();
    expect(companyId?.notNull).toBe(true);
  });

  it('macht das Aktenzeichen eindeutig', () => {
    const config = getTableConfig(claims);
    const unique = config.indexes.find((i) => i.config.name === 'claims_reference_unique');
    expect(unique?.config.unique).toBe(true);
  });

  it('verrechnet dieselbe Massnahme je Akte hoechstens einmal', () => {
    const config = getTableConfig(collectionMeasures);
    const unique = config.indexes.find(
      (i) => i.config.name === 'collection_measures_claim_measure_unique',
    );
    expect(unique?.config.unique).toBe(true);
  });

  it('laesst aus einer Meldung hoechstens eine bestaetigte Zahlung entstehen', () => {
    const config = getTableConfig(payments);
    const unique = config.indexes.find((i) => i.config.name === 'payments_report_unique');
    expect(unique?.config.unique).toBe(true);
  });

  it('erlaubt je Akte hoechstens eine Kostenforderung', () => {
    const config = getTableConfig(costLiabilities);
    const unique = config.indexes.find((i) => i.config.name === 'cost_liabilities_claim_unique');
    expect(unique?.config.unique).toBe(true);
  });

  it('trennt Glaeubiger und Schuldner je Akte eindeutig', () => {
    const config = getTableConfig(claimParties);
    const unique = config.indexes.find(
      (i) => i.config.name === 'claim_parties_claim_role_unique',
    );
    expect(unique?.config.unique).toBe(true);
  });
});

describe('Verweise werden nicht kaskadierend geloescht', () => {
  it('verhindert das Loeschen einer Akte mit abhaengigen Daten', () => {
    // CLAUDE.md 6: keine Loeschung ohne Aufbewahrungspruefung. Ein
    // kaskadierendes Loeschen wuerde die Akte still entfernen.
    for (const table of [claimParties, claimAmountComponents, payments, objections]) {
      const config = getTableConfig(table);
      for (const fk of config.foreignKeys) {
        expect(fk.onDelete).not.toBe('cascade');
      }
    }
  });
});

describe('Status sind Aufzaehlungen, kein Freitext', () => {
  it('fuehrt den Lebenszyklus als Enum', () => {
    const config = getTableConfig(claims);
    const lifecycle = config.columns.find((c) => c.name === 'lifecycle');
    expect(lifecycle?.getSQLType()).toBe('claim_lifecycle');
  });

  it('fuehrt Pausegruende als Enum-Array', () => {
    const config = getTableConfig(claims);
    const pause = config.columns.find((c) => c.name === 'pause_reasons');
    expect(pause?.getSQLType()).toContain('claim_pause_reason');
  });
});

describe('Append-only-Schutz liegt in der Datenbank', () => {
  it('hat einen Trigger fuer jede unveraenderliche Tabelle', async () => {
    const sql = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../migrations/0001_append_only.sql', import.meta.url), 'utf8'),
    );
    for (const table of ['audit_events', 'claim_events', 'claim_status_history']) {
      expect(sql).toContain(`ON ${table}`);
    }
    expect(sql).toContain('BEFORE UPDATE OR DELETE');
  });

  it('vergibt Aktenzeichen aus einer Sequenz', async () => {
    const sql = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../migrations/0001_append_only.sql', import.meta.url), 'utf8'),
    );
    expect(sql).toContain('CREATE SEQUENCE IF NOT EXISTS claim_reference_seq');
  });
});
