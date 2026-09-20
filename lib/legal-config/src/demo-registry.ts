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
    'Auftragsgebuehr des Portals, gestaffelt nach Hauptforderung. Der ' +
      'gesetzliche Deckel von 6 % der Forderung wird zusaetzlich in ' +
      'computeOrderFee() angewandt und ist nicht abschaltbar.',
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
    'Erfolgshonorar, gestaffelt nach Hauptforderung, angewandt auf den ' +
      'tatsaechlich eingebrachten Betrag',
    'demo-success-fee-v2',
    'L-04',
    {
      // Stufenauswahl nach Hauptforderung, Anwendung auf den eingebrachten
      // Betrag. Alle Saetze liegen unter dem Hoechstsatz von 15 %.
      tiers: [
        { uptoPrincipalCents: '50000', basisPoints: 1000 },
        { uptoPrincipalCents: '150000', basisPoints: 900 },
        { uptoPrincipalCents: '500000', basisPoints: 700 },
        { uptoPrincipalCents: '1000000', basisPoints: 600 },
        { uptoPrincipalCents: null, basisPoints: 500 },
      ],
      vatBasisPoints: 2000,
      basis: 'principal_only',
      minimumCents: null,
    },
  ),

  debtor_cost_schedule: demo(
    'debtor_cost_schedule',
    'Schuldnerseitige Hoechstsaetze nach § 3 und der Anteil, den das Portal ' +
      'davon tatsaechlich ansetzt',
    'demo-debtor-costs-v1',
    'L-02',
    {
      // Basisbetraege laut Verordnungstext. Der Indexfaktor steht auf 10000,
      // also unveraendert gegenueber der Basis - das ist NICHT der geltende
      // Stand, sondern ein Platzhalter bis zur Klaerung von L-17.
      processingCostTiers: [
        {
          uptoPrincipal: {
            baseAmountCents: '7300',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          basisPoints: null,
          fixedAmount: {
            baseAmountCents: '2035',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
        },
        {
          uptoPrincipal: {
            baseAmountCents: '36400',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          basisPoints: 2200,
          fixedAmount: null,
        },
        {
          uptoPrincipal: {
            baseAmountCents: '72700',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          basisPoints: 1700,
          fixedAmount: null,
        },
        { uptoPrincipal: null, basisPoints: 800, fixedAmount: null },
      ],
      // Das Portal setzt bewusst weniger an als der Hoechstsatz zulaesst.
      // Die konkrete Hoehe ist eine Geschaeftsentscheidung (L-18).
      processingPolicyShareBasisPoints: 6000,
      measureCaps: [
        {
          measure: 'first_reminder',
          cap: {
            baseAmountCents: '5087',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          minimumPrincipal: {
            baseAmountCents: '72700',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          policyShareBasisPoints: 5000,
        },
        {
          measure: 'second_reminder',
          cap: {
            baseAmountCents: '5814',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          minimumPrincipal: {
            baseAmountCents: '72700',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          policyShareBasisPoints: 7500,
        },
        {
          measure: 'further_reminder',
          cap: {
            baseAmountCents: '5814',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          minimumPrincipal: null,
          policyShareBasisPoints: 10_000,
        },
        {
          measure: 'installment_agreement',
          cap: {
            baseAmountCents: '5814',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          minimumPrincipal: null,
          // Eine Ratenvereinbarung soll nicht zusaetzlich belasten.
          policyShareBasisPoints: 0,
        },
        {
          measure: 'deferral_agreement',
          cap: {
            baseAmountCents: '5814',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          minimumPrincipal: null,
          policyShareBasisPoints: 0,
        },
        {
          measure: 'settlement_agreement',
          cap: {
            baseAmountCents: '5814',
            indexFactorBasisPoints: 10_000,
            indexReference: 'ungeprueft, siehe L-17',
          },
          minimumPrincipal: null,
          policyShareBasisPoints: 0,
        },
      ],
      allowWithoutAppropriatenessCheck: false,
    },
    'zu pruefen: § 3 Verordnung BGBl 141/1996, § 1333 Abs 2 ABGB',
  ),

  escalation_policy: demo(
    'escalation_policy',
    'Stufen der aussergerichtlichen Eskalation und je Stufe zulaessige Massnahmen',
    'demo-escalation-v1',
    'L-09',
    {
      stages: [
        {
          stage: 'friendly_reminder',
          permittedMeasures: [],
          deadlineDays: 14,
          requiresHumanApproval: false,
        },
        {
          stage: 'collection_notice',
          permittedMeasures: ['first_reminder'],
          deadlineDays: 14,
          requiresHumanApproval: false,
        },
        {
          stage: 'final_notice',
          permittedMeasures: ['second_reminder', 'installment_agreement'],
          deadlineDays: 14,
          requiresHumanApproval: true,
        },
        {
          stage: 'legal_review',
          permittedMeasures: [],
          deadlineDays: 0,
          requiresHumanApproval: true,
        },
      ],
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

  litigation_cost_estimate: demo(
    'litigation_cost_estimate',
    'Tabellen fuer die unverbindliche Prozesskostenschaetzung (GGG und RATG)',
    'demo-litigation-v1',
    'L-19',
    {
      // ACHTUNG: Platzhalter. Diese Werte sind NICHT belegt und NICHT
      // freigegeben. Sie stehen hier ausschliesslich, damit die Berechnung
      // technisch pruefbar ist. Der Startup-Check verhindert den
      // Produktivbetrieb, solange sie DEMO_ONLY sind.
      courtFeeTiers: [],
      ownLegalCostTiers: [],
      opposingRiskShareBasisPoints: 10_000,
      vatBasisPoints: 2000,
    },
    'zu belegen: GGG (Gerichtsgebuehren) und RATG (Anwaltskosten)',
  ),

  cost_liability: demo(
    'cost_liability',
    'Stundungs- und Verzichtskonstruktion fuer die Inkassokosten',
    'demo-cost-liability-v1',
    'L-20',
    {
      creditorOwesAtOrder: true,
      deferredUntilRecovered: true,
      waivedIfUncollectible: true,
      uncollectibleAfterDays: 180,
    },
    'zu pruefen: § 1333 Abs 2 ABGB, OGH-Judikatur zum Verzicht gegenueber dem Auftraggeber',
  ),

  commercial_flat_fee: demo(
    'commercial_flat_fee',
    'Pauschalentschaedigung im unternehmerischen Verkehr (§ 458 UGB)',
    'demo-commercial-flat-fee-v1',
    'L-21',
    {
      enabled: false,
      amount: {
        baseAmountCents: '4000',
        indexFactorBasisPoints: 10_000,
        indexReference: 'ungeprueft',
      },
      creditedAgainstOtherCosts: true,
      businessDebtorsOnly: true,
    },
    'zu pruefen: § 458 UGB, Anrechnung auf weitere Betreibungskosten',
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
