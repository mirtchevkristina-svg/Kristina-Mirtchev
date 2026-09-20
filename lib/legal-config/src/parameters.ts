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

/**
 * Eurobetrag aus einer indexgebundenen Verordnung.
 *
 * § 4 Abs 2 der Hoechstsatzverordnung sieht eine Anpassung an den
 * Verbraucherpreisindex vor. Der im Verordnungstext genannte Basisbetrag
 * bleibt daher unveraendert stehen; der jeweils geltende Betrag ergibt sich
 * aus Basisbetrag mal Indexfaktor. Dadurch ist jede historische Berechnung
 * nachvollziehbar, und eine Indexanpassung erzeugt eine neue
 * Konfigurationsversion statt einen stillen Wertwechsel.
 */
export interface IndexedAmount {
  /** Basisbetrag laut Verordnungstext, in Cent. */
  readonly baseAmountCents: string;
  /** Indexfaktor in Basispunkten. 10000 = unveraendert gegenueber der Basis. */
  readonly indexFactorBasisPoints: number;
  /** Fundstelle des Indexstands, z. B. Verlautbarung oder VPI-Wert. */
  readonly indexReference: string;
}

/**
 * Eine Stufe der Erfolgshonorar-Staffel.
 *
 * Wichtig: Die Stufe wird nach der HOEHE DER HAUPTFORDERUNG ausgewaehlt,
 * der Satz aber auf den TATSAECHLICH EINGEBRACHTEN BETRAG angewandt.
 * Beispiel: Forderung 10.000 EUR waehlt die 6 %-Stufe; zahlt der Schuldner
 * nur 4.000 EUR, betraegt das Honorar 6 % von 4.000 EUR, nicht von 10.000 EUR.
 */
export interface SuccessFeeTier {
  /** Obergrenze der Hauptforderung in Cent (einschliesslich). `null` = offen. */
  readonly uptoPrincipalCents: string | null;
  /** Satz in Basispunkten. Muss unter dem gesetzlichen Hoechstsatz liegen. */
  readonly basisPoints: number;
}

/** Erfolgshonorar auf bestaetigte Zahlungen. */
export interface SuccessFeeRule {
  readonly tiers: readonly SuccessFeeTier[];
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

/**
 * Massnahmen, fuer die § 3 der Hoechstsatzverordnung eigene Hoechstsaetze
 * gegenueber dem Schuldner vorsieht.
 */
export type CollectionMeasure =
  | 'first_reminder'
  | 'second_reminder'
  | 'further_reminder'
  | 'phone_collection'
  | 'installment_agreement'
  | 'deferral_agreement'
  | 'settlement_agreement'
  | 'address_inquiry'
  | 'asset_investigation'
  | 'record_keeping';

/** Stufe der allgemeinen Bearbeitungskosten nach § 3. */
export interface ProcessingCostTier {
  /** Obergrenze der Hauptforderung. `null` = offen. */
  readonly uptoPrincipal: IndexedAmount | null;
  /**
   * Hoechstsatz in Basispunkten. Genau eines von `basisPoints` und
   * `fixedAmount` ist gesetzt.
   */
  readonly basisPoints: number | null;
  /** Fester Hoechstbetrag statt eines Satzes. */
  readonly fixedAmount: IndexedAmount | null;
}

export interface MeasureCap {
  readonly measure: CollectionMeasure;
  /** Hoechstbetrag je Vorgang. */
  readonly cap: IndexedAmount;
  /**
   * Mindesthoehe der Hauptforderung, ab der dieser Hoechstsatz gilt.
   * `null` = keine Untergrenze.
   */
  readonly minimumPrincipal: IndexedAmount | null;
  /**
   * Anteil des Hoechstbetrags, den das Portal tatsaechlich ansetzt, in
   * Basispunkten. 10000 = voller Hoechstsatz.
   *
   * Bewusst getrennt vom Hoechstsatz: die Verordnung nennt eine Obergrenze,
   * keinen Anspruch. Das Portal setzt aus Fairnessgruenden weniger an und
   * macht das ueber diesen Faktor sichtbar und aenderbar.
   */
  readonly policyShareBasisPoints: number;
}

/**
 * Schuldnerseitige Kosten nach § 3.
 *
 * LEGAL-REVIEW L-02: ob diese Kosten ueberhaupt geltend gemacht werden.
 * LEGAL-REVIEW L-17: Indexstand der Betraege.
 */
export interface DebtorCostSchedule {
  readonly processingCostTiers: readonly ProcessingCostTier[];
  /** Anteil der allgemeinen Bearbeitungskosten, den das Portal ansetzt. */
  readonly processingPolicyShareBasisPoints: number;
  readonly measureCaps: readonly MeasureCap[];
  /**
   * Ob ein Kostenposten ohne ausdrueckliche Angemessenheitspruefung nach
   * § 1333 Abs 2 ABGB angesetzt werden darf. Steht auf `false`.
   */
  readonly allowWithoutAppropriatenessCheck: boolean;
}

/**
 * Wem die Inkassokosten zustehen und wie sie entstehen.
 *
 * Der Schuldner schuldet Inkassokosten nicht dem Portal, sondern dem
 * Glaeubiger - und zwar als Schadenersatz (§ 1333 Abs 2 ABGB). Ein Schaden
 * setzt voraus, dass dem Glaeubiger Kosten tatsaechlich entstanden sind.
 *
 * Bei einem reinen Erfolgshonorar ohne Grundgebuehr schuldet der Glaeubiger
 * dem Portal aber keine Inkassokosten. Damit fehlt die Grundlage, sie beim
 * Schuldner geltend zu machen.
 *
 * Die Konstruktion loest das so: Die Inkassokosten entstehen dem Glaeubiger
 * in voller Hoehe bei Auftragserteilung, werden gestundet, beim Schuldner
 * als Schadenersatz eingefordert und bei Uneinbringlichkeit erlassen.
 * "Keine Grundgebuehr" bleibt damit wirtschaftlich wahr, ist rechtlich aber
 * anders aufgebaut.
 *
 * LEGAL-REVIEW L-20: Ob diese Konstruktion traegt, insbesondere gegenueber
 * Verbrauchern als Schuldnern, ist nicht geklaert. Zu recherchieren ist die
 * OGH-Judikatur zur Ersatzfaehigkeit von Inkassokosten bei Verzicht
 * gegenueber dem Auftraggeber.
 */
export interface CostLiabilityRule {
  /** Ob der Glaeubiger die Inkassokosten bei Auftragserteilung schuldet. */
  readonly creditorOwesAtOrder: boolean;
  /** Ob die Forderung bis zur Einbringung gestundet wird. */
  readonly deferredUntilRecovered: boolean;
  /** Ob bei Uneinbringlichkeit darauf verzichtet wird. */
  readonly waivedIfUncollectible: boolean;
  /** Nach wie vielen Tagen ohne Einbringung als uneinbringlich gilt. */
  readonly uncollectibleAfterDays: number;
}

/**
 * Pauschalentschaedigung im unternehmerischen Verkehr (§ 458 UGB).
 *
 * Nach hiesigem Verstaendnis wird sie auf weitere Betreibungskosten
 * angerechnet und kommt nicht zusaetzlich zu ihnen hinzu
 * (LEGAL-REVIEW L-21, moderate Konfidenz).
 */
export interface CommercialFlatFeeRule {
  readonly enabled: boolean;
  readonly amount: IndexedAmount;
  /** Ob sie auf weitere Betreibungskosten angerechnet wird. */
  readonly creditedAgainstOtherCosts: boolean;
  /** Nur gegenueber unternehmerischen Schuldnern. */
  readonly businessDebtorsOnly: boolean;
}

/**
 * Die drei Erloessaeulen, jede einzeln schaltbar.
 *
 * Sie sind bewusst getrennt, weil sie an unterschiedlichen Rechtsfragen
 * haengen und unterschiedlich ausfallen koennen:
 *
 *  - `creditor_success_fee` - Erfolgshonorar des Glaeubigers. Haengt an
 *    keiner offenen Frage und traegt das Grundgeschaeft allein.
 *  - `creditor_collection_fee` - die bei Auftragserteilung begruendete,
 *    gestundete Kostenforderung gegen den Glaeubiger.
 *  - `debtor_recoverable_costs` - die beim Schuldner geltend gemachten
 *    Kosten. Haengt an L-20 (ersatzfaehiger Schaden) und L-01
 *    (Gewerbeberechtigung).
 *
 * Faellt L-20 negativ aus, werden die beiden hinteren Saeulen abgeschaltet
 * und das Grundgeschaeft laeuft unveraendert weiter. Kein Umbau der
 * Plattform, nur eine Konfigurationsaenderung.
 */
export type RevenueStream =
  | 'creditor_success_fee'
  | 'creditor_collection_fee'
  | 'debtor_recoverable_costs';

export interface RevenueStreamRule {
  readonly enabled: boolean;
  /**
   * Offene Rechtsfrage, die diese Saeule sperrt, z. B. "L-20".
   * `null` = keine Sperre. Ist ein Wert gesetzt, darf `enabled` nicht
   * true sein; die Registry-Pruefung setzt das durch.
   */
  readonly blockedBy: string | null;
  /** Begruendung fuer den aktuellen Stand, fuer Betrieb und Review. */
  readonly note: string;
}

export interface RevenueModelRule {
  readonly streams: Readonly<Record<RevenueStream, RevenueStreamRule>>;
}

/** Stufen der aussergerichtlichen Eskalation. */
export type EscalationStage =
  | 'friendly_reminder'
  | 'collection_notice'
  | 'final_notice'
  | 'legal_review';

export interface EscalationStageRule {
  readonly stage: EscalationStage;
  /** Massnahmen, die auf dieser Stufe ueberhaupt zulaessig sind. */
  readonly permittedMeasures: readonly CollectionMeasure[];
  /** Zahlungsfrist dieser Stufe in Tagen. */
  readonly deadlineDays: number;
  /** Ob diese Stufe eine menschliche Freigabe erfordert. */
  readonly requiresHumanApproval: boolean;
}

export interface EscalationPolicy {
  readonly stages: readonly EscalationStageRule[];
}

/**
 * Tabellen fuer die unverbindliche Prozesskostenschaetzung.
 *
 * Zwei getrennte Regime, die nicht vermischt werden duerfen:
 *  - Gerichtsgebuehren nach dem GGG
 *  - Rechtsanwaltskosten nach dem RATG
 *
 * Beide Tabellen sind Eurobetraege und aendern sich. Sie stehen deshalb
 * ausschliesslich hier und niemals im Code.
 *
 * LEGAL-REVIEW L-19: Die Tabellenwerte sind fachlich zu belegen und
 * freizugeben. Bis dahin sind sie DEMO_ONLY und der Startup-Check
 * verhindert den Produktivbetrieb.
 */
export interface LitigationCostTier {
  /** Obergrenze des Streitwerts in Cent. `null` = offen. */
  readonly uptoValueCents: string | null;
  /** Betrag fuer diese Stufe. */
  readonly amount: IndexedAmount;
}

export interface LitigationCostRule {
  /** Gerichtsgebuehr nach GGG, gestaffelt nach Streitwert. */
  readonly courtFeeTiers: readonly LitigationCostTier[];
  /** Anhaltswert fuer die eigenen Anwaltskosten nach RATG. */
  readonly ownLegalCostTiers: readonly LitigationCostTier[];
  /**
   * Anteil der eigenen Kosten, mit dem das Kostenrisiko der Gegenseite
   * angesetzt wird, in Basispunkten. Nur eine Groessenordnung.
   */
  readonly opposingRiskShareBasisPoints: number;
  /** Umsatzsteuer auf die Anwaltskosten, in Basispunkten. */
  readonly vatBasisPoints: number;
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
  readonly debtor_cost_schedule: DebtorCostSchedule;
  readonly escalation_policy: EscalationPolicy;
  readonly litigation_cost_estimate: LitigationCostRule;
  readonly revenue_model: RevenueModelRule;
  readonly cost_liability: CostLiabilityRule;
  readonly commercial_flat_fee: CommercialFlatFeeRule;
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
