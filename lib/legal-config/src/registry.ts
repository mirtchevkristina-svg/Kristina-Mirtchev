/**
 * Registry, Aufloesung und Startup-Check fuer die versionierte Konfiguration.
 */

import { ConfigError, type ConfigParameter, type ConfigVersion } from './types.js';
import type { ParameterKey, ParameterMap } from './parameters.js';
import { MAX_SUCCESS_FEE_BASIS_POINTS, formatBasisPoints } from './caps.js';

export type Registry = {
  readonly [K in ParameterKey]: ConfigParameter<ParameterMap[K]>;
};

/**
 * Liefert die zum Zeitpunkt `at` gueltige Version eines Parameters.
 * Wirft, wenn keine Version greift - ein stillschweigender Rueckfall auf
 * einen Standardwert waere ein rechtliches Risiko.
 */
export function resolve<K extends ParameterKey>(
  registry: Registry,
  key: K,
  at: Date,
): ConfigVersion<ParameterMap[K]> {
  const parameter = registry[key];
  const time = at.getTime();
  for (const version of parameter.versions) {
    const from = version.validFrom.getTime();
    const to = version.validTo?.getTime() ?? Number.POSITIVE_INFINITY;
    if (time >= from && time < to) return version;
  }
  throw new ConfigError(
    `Keine gueltige Version fuer Parameter "${key}" zum Zeitpunkt ${at.toISOString()}`,
  );
}

/**
 * Liefert eine Version anhand ihrer ID - fuer die Rekonstruktion
 * historischer Berechnungen aus `claim_amount_components`.
 */
export function resolveById<K extends ParameterKey>(
  registry: Registry,
  key: K,
  versionId: string,
): ConfigVersion<ParameterMap[K]> {
  const found = registry[key].versions.find((v) => v.id === versionId);
  if (!found) {
    throw new ConfigError(`Version "${versionId}" des Parameters "${key}" ist unbekannt`);
  }
  return found;
}

export interface ValidationIssue {
  readonly key: string;
  readonly versionId: string | null;
  readonly message: string;
}

/**
 * Strukturelle Pruefung der Registry, unabhaengig von der Umgebung:
 * eindeutige IDs, sortierte und ueberschneidungsfreie Gueltigkeitszeitraeume,
 * Freigabevermerk bei `APPROVED`, Review-Verweis bei `DEMO_ONLY`.
 */
export function validateRegistry(registry: Registry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const key of Object.keys(registry) as ParameterKey[]) {
    const parameter = registry[key];
    if (parameter.key !== key) {
      issues.push({
        key,
        versionId: null,
        message: `Schluessel stimmt nicht mit der Registry-Position ueberein ("${parameter.key}")`,
      });
    }
    if (parameter.versions.length === 0) {
      issues.push({ key, versionId: null, message: 'Keine Version hinterlegt' });
      continue;
    }

    let previousTo: number | null = null;
    for (const version of parameter.versions) {
      if (seenIds.has(version.id)) {
        issues.push({
          key,
          versionId: version.id,
          message: 'Versions-ID wird mehrfach verwendet',
        });
      }
      seenIds.add(version.id);

      const from = version.validFrom.getTime();
      const to = version.validTo?.getTime() ?? Number.POSITIVE_INFINITY;
      if (!(to > from)) {
        issues.push({
          key,
          versionId: version.id,
          message: 'validTo muss nach validFrom liegen',
        });
      }
      if (previousTo !== null && from < previousTo) {
        issues.push({
          key,
          versionId: version.id,
          message: 'Gueltigkeitszeitraum ueberschneidet die Vorgaengerversion',
        });
      }
      previousTo = to;

      if (version.status === 'APPROVED' && !version.approval) {
        issues.push({
          key,
          versionId: version.id,
          message: 'APPROVED ohne Freigabevermerk',
        });
      }
      if (version.status === 'DEMO_ONLY' && !version.legalReview) {
        issues.push({
          key,
          versionId: version.id,
          message: 'DEMO_ONLY ohne Verweis auf die offene Rechtsfrage',
        });
      }
      // Gesetzlicher Hoechstsatz: ein zu hoch konfigurierter Erfolgshonorar-
      // satz ist ein Konfigurationsfehler, der den Start verhindern muss.
      // Eine durch eine offene Rechtsfrage gesperrte Erloessaeule darf
      // nicht aktiv sein. Das ist kein Hinweis, sondern ein Startfehler.
      if (key === 'revenue_model') {
        const model = version.value as ParameterMap['revenue_model'];
        for (const [stream, rule] of Object.entries(model.streams)) {
          if (rule.blockedBy !== null && rule.enabled) {
            issues.push({
              key,
              versionId: version.id,
              message:
                `Erloessaeule "${stream}" ist aktiv, obwohl sie durch ` +
                `${rule.blockedBy} gesperrt ist`,
            });
          }
        }
      }
      if (key === 'success_fee') {
        const rule = version.value as ParameterMap['success_fee'];
        for (const tier of rule.tiers) {
          if (tier.basisPoints > MAX_SUCCESS_FEE_BASIS_POINTS) {
            issues.push({
              key,
              versionId: version.id,
              message:
                `Erfolgshonorarsatz ${formatBasisPoints(tier.basisPoints)} ueberschreitet den ` +
                `Hoechstsatz von ${formatBasisPoints(MAX_SUCCESS_FEE_BASIS_POINTS)} ` +
                '(§ 2 Verordnung BGBl 141/1996 idF BGBl II 103/2005)',
            });
          }
        }
        if (rule.tiers.length === 0) {
          issues.push({ key, versionId: version.id, message: 'Staffel enthaelt keine Stufe' });
        }
      }
    }
  }
  return issues;
}

export interface StartupCheckOptions {
  /**
   * Ob Demo-Werte erlaubt sind. In Produktion immer `false`.
   * Entspricht der Umgebungsvariable ALLOW_DEMO_CONFIG.
   */
  readonly allowDemoValues: boolean;
  /** Bezugszeitpunkt, standardmaessig jetzt. */
  readonly now?: Date;
}

/**
 * Startup-Check gemaess CLAUDE.md 1.7.
 *
 * Bricht ab, wenn die Registry strukturell fehlerhaft ist oder wenn in einer
 * Umgebung ohne Demo-Freigabe noch Demo-Werte wirksam werden koennten. Als
 * "wirksam" gilt jede DEMO_ONLY-Version, die aktuell gilt oder deren
 * Gueltigkeit in der Zukunft noch beginnt oder andauert.
 */
export function assertStartupSafe(registry: Registry, options: StartupCheckOptions): void {
  const issues = validateRegistry(registry);
  if (issues.length > 0) {
    throw new ConfigError(
      `Konfiguration ist strukturell fehlerhaft:\n${formatIssues(issues)}`,
    );
  }
  if (options.allowDemoValues) return;

  const now = options.now ?? new Date();
  const offending: ValidationIssue[] = [];

  for (const key of Object.keys(registry) as ParameterKey[]) {
    for (const version of registry[key].versions) {
      if (version.status !== 'DEMO_ONLY') continue;
      const to = version.validTo?.getTime() ?? Number.POSITIVE_INFINITY;
      if (to > now.getTime()) {
        offending.push({
          key,
          versionId: version.id,
          message: `DEMO_ONLY-Wert ist noch wirksam (${version.legalReview ?? 'ohne Review-Verweis'})`,
        });
      }
    }
  }

  if (offending.length > 0) {
    throw new ConfigError(
      'Start abgebrochen: In dieser Umgebung duerfen keine Demo-Werte wirksam sein. ' +
        'Betroffene Parameter muessen fachlich freigegeben werden ' +
        `(siehe docs/LEGAL_OPEN_QUESTIONS.md):\n${formatIssues(offending)}`,
    );
  }
}

function formatIssues(issues: readonly ValidationIssue[]): string {
  return issues
    .map((i) => `  - ${i.key}${i.versionId ? ` [${i.versionId}]` : ''}: ${i.message}`)
    .join('\n');
}

/** Alle aktuell wirksamen Demo-Werte - fuer Betriebs- und Statusanzeigen. */
export function listDemoValues(registry: Registry, now: Date = new Date()): ValidationIssue[] {
  const result: ValidationIssue[] = [];
  for (const key of Object.keys(registry) as ParameterKey[]) {
    for (const version of registry[key].versions) {
      if (version.status !== 'DEMO_ONLY') continue;
      const from = version.validFrom.getTime();
      const to = version.validTo?.getTime() ?? Number.POSITIVE_INFINITY;
      if (now.getTime() >= from && now.getTime() < to) {
        result.push({
          key,
          versionId: version.id,
          message: version.legalReview ?? 'ohne Review-Verweis',
        });
      }
    }
  }
  return result;
}
