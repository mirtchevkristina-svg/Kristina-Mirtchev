/**
 * Stufenweise aussergerichtliche Eskalation.
 *
 * Der Schuldner wird nicht am ersten Tag mit dem gesetzlichen Maximum
 * belastet. Jede Stufe gibt frei, welche Massnahmen ueberhaupt zulaessig
 * sind; erst eine tatsaechlich durchgefuehrte Massnahme erzeugt einen
 * Kostenposten.
 *
 * Invariante 2 (CLAUDE.md): Der Uebergang auf die letzte Stufe bereitet
 * nur vor. Eine Uebergabe an die Kanzlei erfolgt ausschliesslich nach
 * dokumentierter Freigabe durch den Glaeubiger und auf Grundlage eines
 * eigenen Mandats zwischen Glaeubiger und Kanzlei.
 */

import type {
  CollectionMeasure,
  EscalationPolicy,
  EscalationStage,
  EscalationStageRule,
} from '@fp/legal-config';

export class EscalationError extends Error {
  override readonly name = 'EscalationError';
}

export const STAGE_ORDER: readonly EscalationStage[] = [
  'friendly_reminder',
  'collection_notice',
  'final_notice',
  'legal_review',
];

export const STAGE_LABELS: Record<EscalationStage, string> = {
  friendly_reminder: 'Zahlungserinnerung',
  collection_notice: 'Zahlungsaufforderung',
  final_notice: 'Letzte Zahlungsaufforderung',
  legal_review: 'Gerichtliche Durchsetzung pruefen',
};

export function stageRule(policy: EscalationPolicy, stage: EscalationStage): EscalationStageRule {
  const rule = policy.stages.find((s) => s.stage === stage);
  if (!rule) {
    throw new EscalationError(`Fuer die Stufe "${stage}" ist keine Regel konfiguriert`);
  }
  return rule;
}

/** Naechste Stufe, oder `null`, wenn die letzte erreicht ist. */
export function nextStage(stage: EscalationStage): EscalationStage | null {
  const index = STAGE_ORDER.indexOf(stage);
  if (index < 0) throw new EscalationError(`Unbekannte Stufe "${stage}"`);
  return STAGE_ORDER[index + 1] ?? null;
}

export interface AdvanceContext {
  /** Ob die Bearbeitung derzeit pausiert ist, etwa wegen einer Einwendung. */
  readonly paused: boolean;
  /** Ob die Frist der aktuellen Stufe abgelaufen ist. */
  readonly deadlineExpired: boolean;
  /** Ob die Forderung inzwischen vollstaendig getilgt ist. */
  readonly settled: boolean;
  /** Ob fuer diese Stufe eine menschliche Freigabe vorliegt. */
  readonly humanApprovalPresent: boolean;
}

export interface AdvanceDecision {
  readonly allowed: boolean;
  readonly target: EscalationStage | null;
  readonly reason: string;
}

/**
 * Entscheidet, ob von `current` auf die naechste Stufe gewechselt werden darf.
 *
 * Die Funktion ist rein und trifft keine Seiteneffekte. Sie wird von einem
 * geplanten Job unmittelbar vor der Ausfuehrung aufgerufen, weil sich der
 * Zustand seit der Einplanung geaendert haben kann.
 */
export function canAdvance(
  policy: EscalationPolicy,
  current: EscalationStage,
  context: AdvanceContext,
): AdvanceDecision {
  const target = nextStage(current);

  if (context.settled) {
    return { allowed: false, target: null, reason: 'Die Forderung ist getilgt.' };
  }
  if (context.paused) {
    return {
      allowed: false,
      target: null,
      reason: 'Die Bearbeitung ist pausiert, etwa wegen einer Einwendung.',
    };
  }
  if (target === null) {
    return { allowed: false, target: null, reason: 'Die letzte Stufe ist erreicht.' };
  }
  if (!context.deadlineExpired) {
    return { allowed: false, target, reason: 'Die Zahlungsfrist laeuft noch.' };
  }

  const rule = stageRule(policy, target);
  if (rule.requiresHumanApproval && !context.humanApprovalPresent) {
    return {
      allowed: false,
      target,
      reason: 'Diese Stufe erfordert eine dokumentierte menschliche Freigabe.',
    };
  }
  return { allowed: true, target, reason: 'Frist abgelaufen, naechste Stufe zulaessig.' };
}

/** Ob eine Massnahme auf der angegebenen Stufe ueberhaupt zulaessig ist. */
export function isMeasurePermitted(
  policy: EscalationPolicy,
  stage: EscalationStage,
  measure: CollectionMeasure,
): boolean {
  return stageRule(policy, stage).permittedMeasures.includes(measure);
}

/**
 * Alle bis einschliesslich `stage` zulaessigen Massnahmen.
 * Grundlage dafuer, welche Kostenposten ueberhaupt entstehen koennen.
 */
export function permittedMeasuresUpTo(
  policy: EscalationPolicy,
  stage: EscalationStage,
): readonly CollectionMeasure[] {
  const limit = STAGE_ORDER.indexOf(stage);
  if (limit < 0) throw new EscalationError(`Unbekannte Stufe "${stage}"`);
  const result = new Set<CollectionMeasure>();
  for (const s of STAGE_ORDER.slice(0, limit + 1)) {
    for (const m of stageRule(policy, s).permittedMeasures) result.add(m);
  }
  return [...result];
}
