import { describe, expect, it } from 'vitest';
import {
  ConfigError,
  type ConfigParameter,
  type Registry,
  assertStartupSafe,
  demoRegistry,
  listDemoValues,
  resolve,
  resolveById,
  validateRegistry,
} from './index.js';

const NOW = new Date('2026-06-01T00:00:00.000Z');

function withParameter(
  overrides: Partial<Record<keyof Registry, ConfigParameter<never>>>,
): Registry {
  return { ...demoRegistry, ...overrides } as Registry;
}

describe('demoRegistry', () => {
  it('ist strukturell gueltig', () => {
    expect(validateRegistry(demoRegistry)).toEqual([]);
  });

  it('enthaelt ausschliesslich Demo-Werte', () => {
    for (const parameter of Object.values(demoRegistry)) {
      for (const version of parameter.versions) {
        expect(version.status).toBe('DEMO_ONLY');
      }
    }
  });

  it('verweist bei jedem Demo-Wert auf eine offene Rechtsfrage', () => {
    for (const parameter of Object.values(demoRegistry)) {
      for (const version of parameter.versions) {
        expect(version.legalReview).toMatch(/^L-\d{2}$/);
      }
    }
  });

  it('traegt keine Zinssaetze als Produktivwerte ein', () => {
    const interest = resolve(demoRegistry, 'default_interest', NOW).value;
    expect(interest.consumerBasisPoints).toBe(0);
    expect(interest.commercialSpreadBasisPoints).toBe(0);
    expect(resolve(demoRegistry, 'base_rate_table', NOW).value.entries).toEqual([]);
  });
});

describe('resolve', () => {
  it('liefert die zum Zeitpunkt gueltige Version', () => {
    const version = resolve(demoRegistry, 'success_fee', NOW);
    expect(version.id).toBe('demo-success-fee-v2');
  });

  it('waehlt zwischen mehreren Versionen nach Zeitpunkt', () => {
    const registry = withParameter({
      success_fee: {
        key: 'success_fee',
        description: 'test',
        versions: [
          {
            id: 'v1',
            value: { tiers: [{ uptoPrincipalCents: null, basisPoints: 1000 }], vatBasisPoints: 2000, basis: 'principal_only', minimumCents: null },
            validFrom: new Date('2020-01-01T00:00:00Z'),
            validTo: new Date('2026-01-01T00:00:00Z'),
            status: 'SUPERSEDED',
          },
          {
            id: 'v2',
            value: { tiers: [{ uptoPrincipalCents: null, basisPoints: 1200 }], vatBasisPoints: 2000, basis: 'principal_only', minimumCents: null },
            validFrom: new Date('2026-01-01T00:00:00Z'),
            validTo: null,
            status: 'APPROVED',
            approval: { by: 'RA Muster', at: new Date('2025-12-01T00:00:00Z'), note: 'Freigabe 2025/12' },
          },
        ],
      } as unknown as ConfigParameter<never>,
    });

    expect(resolve(registry, 'success_fee', new Date('2022-05-01T00:00:00Z')).id).toBe('v1');
    expect(resolve(registry, 'success_fee', NOW).id).toBe('v2');
  });

  it('wirft, wenn keine Version greift - kein stiller Standardwert', () => {
    const registry = withParameter({
      success_fee: {
        key: 'success_fee',
        description: 'test',
        versions: [
          {
            id: 'v1',
            value: { tiers: [{ uptoPrincipalCents: null, basisPoints: 1000 }], vatBasisPoints: 2000, basis: 'principal_only', minimumCents: null },
            validFrom: new Date('2030-01-01T00:00:00Z'),
            validTo: null,
            status: 'DEMO_ONLY',
            legalReview: 'L-04',
          },
        ],
      } as unknown as ConfigParameter<never>,
    });
    expect(() => resolve(registry, 'success_fee', NOW)).toThrow(ConfigError);
  });

  it('findet historische Versionen ueber die ID', () => {
    expect(resolveById(demoRegistry, 'platform_fee', 'demo-platform-fee-v1').status).toBe(
      'DEMO_ONLY',
    );
    expect(() => resolveById(demoRegistry, 'platform_fee', 'unbekannt')).toThrow(ConfigError);
  });
});

describe('validateRegistry', () => {
  it('meldet APPROVED ohne Freigabevermerk', () => {
    const registry = withParameter({
      deadlines: {
        key: 'deadlines',
        description: 'test',
        versions: [
          {
            id: 'd1',
            value: { firstRequestDays: 14, reminderIntervalDays: [], objectionResponseDays: 14 },
            validFrom: new Date('2020-01-01T00:00:00Z'),
            validTo: null,
            status: 'APPROVED',
          },
        ],
      } as unknown as ConfigParameter<never>,
    });
    const issues = validateRegistry(registry);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('ohne Freigabevermerk');
  });

  it('meldet ueberschneidende Gueltigkeitszeitraeume', () => {
    const registry = withParameter({
      deadlines: {
        key: 'deadlines',
        description: 'test',
        versions: [
          {
            id: 'd1',
            value: { firstRequestDays: 14, reminderIntervalDays: [], objectionResponseDays: 14 },
            validFrom: new Date('2020-01-01T00:00:00Z'),
            validTo: new Date('2026-01-01T00:00:00Z'),
            status: 'SUPERSEDED',
          },
          {
            id: 'd2',
            value: { firstRequestDays: 21, reminderIntervalDays: [], objectionResponseDays: 14 },
            validFrom: new Date('2025-06-01T00:00:00Z'),
            validTo: null,
            status: 'DEMO_ONLY',
            legalReview: 'L-09',
          },
        ],
      } as unknown as ConfigParameter<never>,
    });
    expect(validateRegistry(registry).map((i) => i.message)).toContain(
      'Gueltigkeitszeitraum ueberschneidet die Vorgaengerversion',
    );
  });

  it('meldet doppelt vergebene Versions-IDs', () => {
    const duplicate = {
      key: 'deadlines',
      description: 'test',
      versions: [
        {
          id: 'demo-success-fee-v2',
          value: { firstRequestDays: 14, reminderIntervalDays: [], objectionResponseDays: 14 },
          validFrom: new Date('2020-01-01T00:00:00Z'),
          validTo: null,
          status: 'DEMO_ONLY',
          legalReview: 'L-09',
        },
      ],
    } as unknown as ConfigParameter<never>;
    const issues = validateRegistry(withParameter({ deadlines: duplicate }));
    expect(issues.map((i) => i.message)).toContain('Versions-ID wird mehrfach verwendet');
  });
});

describe('assertStartupSafe', () => {
  it('laesst Demo-Werte zu, wenn sie ausdruecklich erlaubt sind', () => {
    expect(() =>
      assertStartupSafe(demoRegistry, { allowDemoValues: true, now: NOW }),
    ).not.toThrow();
  });

  it('verweigert den Start in Produktion mit Demo-Werten', () => {
    expect(() => assertStartupSafe(demoRegistry, { allowDemoValues: false, now: NOW })).toThrow(
      ConfigError,
    );
  });

  it('nennt jeden betroffenen Parameter und die offene Frage', () => {
    let message = '';
    try {
      assertStartupSafe(demoRegistry, { allowDemoValues: false, now: NOW });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('platform_fee');
    expect(message).toContain('success_fee');
    expect(message).toContain('cost_recovery');
    expect(message).toContain('L-02');
    expect(message).toContain('docs/LEGAL_OPEN_QUESTIONS.md');
  });

  it('akzeptiert eine vollstaendig freigegebene Registry', () => {
    const approved: Registry = Object.fromEntries(
      Object.entries(demoRegistry).map(([key, parameter]) => [
        key,
        {
          ...parameter,
          versions: parameter.versions.map((v) => ({
            ...v,
            status: 'APPROVED' as const,
            approval: { by: 'RA Muster', at: new Date('2026-01-01T00:00:00Z'), note: 'Freigabe' },
          })),
        },
      ]),
    ) as unknown as Registry;

    expect(() => assertStartupSafe(approved, { allowDemoValues: false, now: NOW })).not.toThrow();
  });

  it('erlaubt abgelaufene Demo-Werte, weil sie nicht mehr wirksam sind', () => {
    const expired: Registry = Object.fromEntries(
      Object.entries(demoRegistry).map(([key, parameter]) => [
        key,
        {
          ...parameter,
          versions: [
            {
              ...parameter.versions[0]!,
              validTo: new Date('2026-01-01T00:00:00Z'),
            },
            {
              ...parameter.versions[0]!,
              id: `${parameter.versions[0]!.id}-approved`,
              validFrom: new Date('2026-01-01T00:00:00Z'),
              validTo: null,
              status: 'APPROVED' as const,
              approval: { by: 'RA Muster', at: new Date('2026-01-01T00:00:00Z'), note: 'Freigabe' },
            },
          ],
        },
      ]),
    ) as unknown as Registry;

    expect(() => assertStartupSafe(expired, { allowDemoValues: false, now: NOW })).not.toThrow();
  });

  it('bricht bei struktureller Fehlerhaftigkeit auch mit Demo-Freigabe ab', () => {
    const broken = withParameter({
      deadlines: { key: 'deadlines', description: 'test', versions: [] } as unknown as ConfigParameter<never>,
    });
    expect(() => assertStartupSafe(broken, { allowDemoValues: true, now: NOW })).toThrow(
      /strukturell fehlerhaft/,
    );
  });
});

describe('listDemoValues', () => {
  it('listet alle wirksamen Demo-Werte fuer die Betriebsanzeige', () => {
    const list = listDemoValues(demoRegistry, NOW);
    expect(list).toHaveLength(Object.keys(demoRegistry).length);
    expect(list.every((i) => /^L-\d{2}$/.test(i.message))).toBe(true);
  });
});
