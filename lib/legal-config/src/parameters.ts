/**
 * Fachliche Form der einzelnen Konfigurationsparameter.
 *
 * Alle Geldbetraege sind ganzzahlige Cent, alle Saetze Basispunkte
 * (1 Basispunkt = 0,01 %). Damit kommt in der gesamten Kette kein
 * Gleitkommawert vor.
 */

/** Anrechenbare Bestandteile einer Forderung. */
export type AmountComponentKind =
  | 'principal'
  | 'interest'
  | 'collection_costs'
  | 'platform_costs'
  | 'other_costs';

/**
 * Preisregel fuer die Bearbeitungsgebuehr des Portals.
 * Gestaffelt nach Hoehe der Hauptforderung (CLAUDE.md 4.5: kein fixer
 * Betrag im Code, Abbildung auf eine Stripe Price ID).
 */
export interface PlatformFeeTier {
  /** Obergrenze der Hauptforderung in Cent (einschliesslich). `null` = offen. */
  readonly uptoPrincipalCents: string | null;
  /** Gebuehr in Cent (netto). */
  readonly feeCents: string;
  /** Umsatzsteuer auf die Gebuehr, in Basispunkten. */
  readonly vatBasisPoints: number;
  /** Zugehoerige Stripe Price ID. Leer = noch nicht angelegt. */
  readonly stripePriceId: string;
}

export interface PlatformFeeRule {
  readonly tiers: readonly PlatformFeeTier[];
}

/** Erfolgshonorar auf bestaetigte Zahlungen. */
export interface SuccessFeeRule {
  /** Satz in Basispunkten, bezogen auf die Bemessungsgrundlage. */
  readonly basisPoints: number;
  /** Umsatzsteuer auf das Honorar, in Basispunkten. */
  readonly vatBasisPoints: number;
  /**
   * Worauf sich der Satz bezieht. `principal_only` rechnet nur auf die
   * getilgte Hauptforderung, `all_components` auf die gesamte Zahlung.
   */
  readonly basis: 'principal_only' | 'all_components';
  /** Mindestbetrag je Abrechnung in Cent, `null` = keiner. */
  readonly minimumCents: string | null;
}

/** Verzugszinsen. */
export interface DefaultInterestRule {
  /** Satz fuer Verbrauchergeschaefte in Basispunkten. */
  readonly consumerBasisPoints: number;
  /**
   * Aufschlag auf den Basiszinssatz fuer unternehmerische Geldforderungen,
   * in Basispunkten.
   */
  readonly commercialSpreadBasisPoints: number;
  /** Zinstage-Konvention fuer die Berechnung. */
  readonly dayCountConvention: 'ACT/365' | 'ACT/360' | '30E/360';
}

/** Historie des Basiszinssatzes, auf den sich der B2B-Aufschlag bezieht. */
export interface BaseRateEntry {
  /** ISO-Datum, ab dem der Satz gilt. */
  readonly from: string;
  readonly basisPoints: number;
}

export interface BaseRateTable {
  readonly entries: readonly BaseRateEntry[];
}

/**
 * Reihenfolge, in der eine Zahlung auf die Bestandteile angerechnet wird.
 * LEGAL-REVIEW L-07: gesetzliche bzw. vertragliche Reihenfolge festlegen.
 */
export interface AllocationOrderRule {
  readonly order: readonly AmountComponentKind[];
  /**
   * Ob der Schuldner bei der Zahlung eine abweichende Widmung bestimmen darf.
   */
  readonly debtorMayDesignate: boolean;
}

/** Regeln fuer Ratenvereinbarungen. */
export interface InstallmentRule {
  readonly minInstallmentCents: string;
  readonly maxDurationMonths: number;
  /** Ob gegenueber Verbrauchern verzinste Raten zulaessig sind. */
  readonly interestAllowedForConsumers: boolean;
  /** Anzahl ueberfaelliger Raten, nach der der Plan als gescheitert gilt. */
  readonly missedInstallmentsUntilDefault: number;
}

/** Fristen und Mahnstufen. */
export interface DeadlineRule {
  /** Zahlungsfrist der ersten Zahlungsaufforderung, in Tagen. */
  readonly firstRequestDays: number;
  /** Abstaende der Erinnerungen in Tagen, jeweils ab der Vorstufe. */
  readonly reminderIntervalDays: readonly number[];
  /** Frist, innerhalb derer der Glaeubiger eine Einwendung beantworten soll. */
  readonly objectionResponseDays: number;
}

/**
 * Warnung vor drohender Verjaehrung.
 * Bewusst nur ein Hinweis, keine verbindliche Fristberechnung: Beginn und
 * Hemmung sind Einzelfallfragen (siehe docs/VERBESSERUNGSVORSCHLAEGE.md 1.5).
 */
export interface LimitationWarningRule {
  /** Angenommene Regelfrist in Monaten, nur fuer die Hinweisberechnung. */
  readonly assumedPeriodMonths: number;
  /** Vorlaufzeiten der Warnungen in Monaten. */
  readonly warnMonthsBefore: readonly number[];
}

/**
 * Ob die Kosten des Portals dem Schuldner als Betreibungskosten angelastet
 * werden. Diese Entscheidung bestimmt Gebuehrenrecht, UI-Texte und
 * Betragsaufstellung (siehe docs/VERBESSERUNGSVORSCHLAEGE.md 1.3).
 */
export interface CostRecoveryRule {
  readonly chargePlatformFeeToDebtor: boolean;
  readonly chargeSuccessFeeToDebtor: boolean;
  /** Pauschalentschaedigung im unternehmerischen Verkehr, in Cent. */
  readonly commercialFlatFeeCents: string;
  readonly commercialFlatFeeEnabled: boolean;
}

/** Typzuordnung aller bekannten Parameter. */
export interface ParameterMap {
  readonly platform_fee: PlatformFeeRule;
  readonly success_fee: SuccessFeeRule;
  readonly default_interest: DefaultInterestRule;
  readonly base_rate_table: BaseRateTable;
  readonly allocation_order: AllocationOrderRule;
  readonly installment_rules: InstallmentRule;
  readonly deadlines: DeadlineRule;
  readonly limitation_warning: LimitationWarningRule;
  readonly cost_recovery: CostRecoveryRule;
}

export type ParameterKey = keyof ParameterMap;
