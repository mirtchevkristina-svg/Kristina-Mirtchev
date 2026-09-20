/**
 * Demo-Registry.
 *
 * ACHTUNG: Saemtliche Werte in dieser Datei sind Platzhalter mit dem Status
 * `DEMO_ONLY`. Sie sind NICHT rechtlich geprueft und NICHT freigegeben. Sie
 * existieren ausschliesslich, damit Entwicklung, Tests und Vorfuehrungen
 * funktionieren.
 *
 * Der Startup-Check (`assertStartupSafe`) verweigert den Start, sobald diese
 * Werte in einer Umgebung ohne Demo-Freigabe wirksam wuerden. Jede Position
 * verweist auf die zugehoerige offene Frage in docs/LEGAL_OPEN_QUESTIONS.md.
 *
 * CLAUDE.md 6: Es werden hier bewusst keine Zinssaetze, Pauschalen oder
 * Fristen "aus dem Gedaechtnis" als Produktivwerte eingetragen.
 */

import type { ConfigParameter } from './types.js';
import type { ParameterKey, ParameterMap } from './parameters.js';
import type { Registry } from './registry.js';

const EPOCH = new Date('2000-01-01T00:00:00.000Z');

function demo<K extends ParameterKey>(
  key: K,
  description: string,
  id: string,
  legalReview: string,
  value: ParameterMap[K],
  legalBasis?: string,
): ConfigParameter<ParameterMap[K]> {
  return {
    key,
    description,
    versions: [
      {
        id,
        value,
        validFrom: EPOCH,
        validTo: null,
        status: 'DEMO_ONLY',
        legalReview,
        ...(legalBasis === undefined ? {} : { legalBasis }),
      },
    ],
  };
}

export const demoRegistry: Registry = {
  platform_fee: demo(
    'platform_fee',
    'Bearbeitungsgebuehr des Portals, gestaffelt nach Hauptforderung',
    'demo-platform-fee-v1',
    'L-03',
    {
      tiers: [
        {
          uptoPrincipalCents: '50000',
          feeCents: '1500',
          vatBasisPoints: 2000,
          stripePriceId: '',
        },
        {
          uptoPrincipalCents: '500000',
          feeCents: '3000',
          vatBasisPoints: 2000,
          stripePriceId: '',
        },
        {
          uptoPrincipalCents: null,
          feeCents: '9000',
          vatBasisPoints: 2000,
          stripePriceId: '',
        },
      ],
    },
  ),

  success_fee: demo(
    'success_fee',
    'Erfolgshonorar auf bestaetigte Zahlungen',
    'demo-success-fee-v1',
    'L-04',
    {
      basisPoints: 1000,
      vatBasisPoints: 2000,
      basis: 'principal_only',
      minimumCents: null,
    },
  ),

  default_interest: demo(
    'default_interest',
    'Verzugszinsen fuer Verbraucher- und Unternehmensgeschaefte',
    'demo-default-interest-v1',
    'L-05',
    {
      consumerBasisPoints: 0,
      commercialSpreadBasisPoints: 0,
      dayCountConvention: 'ACT/365',
    },
    'zu pruefen: § 1000 ABGB, § 456 UGB',
  ),

  base_rate_table: demo(
    'base_rate_table',
    'Historie des Basiszinssatzes fuer den unternehmerischen Aufschlag',
    'demo-base-rate-v1',
    'L-05',
    { entries: [] },
  ),

  allocation_order: demo(
    'allocation_order',
    'Reihenfolge der Anrechnung einer Zahlung auf die Forderungsbestandteile',
    'demo-allocation-order-v1',
    'L-07',
    {
      order: ['collection_costs', 'platform_costs', 'other_costs', 'interest', 'principal'],
      debtorMayDesignate: false,
    },
    'zu pruefen: § 1416 ABGB und abweichende Vereinbarung',
  ),

  installment_rules: demo(
    'installment_rules',
    'Rahmen fuer Ratenvereinbarungen',
    'demo-installment-v1',
    'L-08',
    {
      minInstallmentCents: '2500',
      maxDurationMonths: 12,
      interestAllowedForConsumers: false,
      missedInstallmentsUntilDefault: 2,
    },
    'zu pruefen: VKrG bei entgeltlichem Zahlungsaufschub',
  ),

  deadlines: demo(
    'deadlines',
    'Zahlungsfristen und Mahnstufen',
    'demo-deadlines-v1',
    'L-09',
    {
      firstRequestDays: 14,
      reminderIntervalDays: [14, 14],
      objectionResponseDays: 14,
    },
  ),

  limitation_warning: demo(
    'limitation_warning',
    'Hinweis auf drohende Verjaehrung (kein verbindlicher Fristenlauf)',
    'demo-limitation-v1',
    'L-10',
    {
      assumedPeriodMonths: 36,
      warnMonthsBefore: [6, 3, 1],
    },
    'zu pruefen: § 1486 ABGB, Beginn und Hemmung im Einzelfall',
  ),

  cost_recovery: demo(
    'cost_recovery',
    'Ob Portalkosten dem Schuldner als Betreibungskosten angelastet werden',
    'demo-cost-recovery-v1',
    'L-02',
    {
      chargePlatformFeeToDebtor: false,
      chargeSuccessFeeToDebtor: false,
      commercialFlatFeeCents: '0',
      commercialFlatFeeEnabled: false,
    },
    'zu pruefen: § 1333 Abs 2 ABGB, § 458 UGB, Hoechstsatzverordnung',
  ),
};
