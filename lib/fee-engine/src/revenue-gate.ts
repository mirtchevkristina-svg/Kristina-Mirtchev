/**
 * Sperre der Erloessaeulen.
 *
 * Jede Saeule haengt an eigenen Rechtsfragen und kann einzeln ausfallen,
 * ohne die anderen mitzunehmen. Die Sperre wird hier zentral geprueft,
 * damit keine Berechnung an ihr vorbeikommt.
 *
 * Das Erfolgshonorar ist bewusst nicht von den anderen beiden abhaengig:
 * faellt L-20 negativ aus, laeuft das Grundgeschaeft unveraendert weiter.
 */

import type { RevenueModelRule, RevenueStream } from '@fp/legal-config';

export class RevenueStreamBlockedError extends Error {
  override readonly name = 'RevenueStreamBlockedError';
  constructor(
    readonly stream: RevenueStream,
    readonly blockedBy: string | null,
    message: string,
  ) {
    super(message);
  }
}

export function isStreamEnabled(model: RevenueModelRule, stream: RevenueStream): boolean {
  const rule = model.streams[stream];
  return rule.enabled && rule.blockedBy === null;
}

/**
 * Wirft, wenn die Saeule nicht freigeschaltet ist - mit der offenen Frage
 * im Text, damit im Betrieb sofort erkennbar ist, worauf gewartet wird.
 */
export function assertStreamEnabled(model: RevenueModelRule, stream: RevenueStream): void {
  const rule = model.streams[stream];
  if (rule.blockedBy !== null) {
    throw new RevenueStreamBlockedError(
      stream,
      rule.blockedBy,
      `Die Erloessaeule "${stream}" ist durch die offene Rechtsfrage ${rule.blockedBy} ` +
        `gesperrt und darf nicht berechnet werden. ${rule.note} ` +
        'Siehe docs/LEGAL_OPEN_QUESTIONS.md.',
    );
  }
  if (!rule.enabled) {
    throw new RevenueStreamBlockedError(
      stream,
      null,
      `Die Erloessaeule "${stream}" ist abgeschaltet. ${rule.note}`,
    );
  }
}

/** Alle gesperrten Saeulen - fuer die Betriebsanzeige. */
export function blockedStreams(
  model: RevenueModelRule,
): readonly { readonly stream: RevenueStream; readonly blockedBy: string; readonly note: string }[] {
  return (Object.entries(model.streams) as [RevenueStream, RevenueModelRule['streams'][RevenueStream]][])
    .filter(([, rule]) => rule.blockedBy !== null)
    .map(([stream, rule]) => ({ stream, blockedBy: rule.blockedBy!, note: rule.note }));
}
