/**
 * Redaktion personenbezogener Daten (CLAUDE.md 1.11).
 *
 * Zwei getrennte Anwendungsfaelle:
 *  - `redact`: entfernt PII aus Logs, Fehlermeldungen und Audit-Metadaten.
 *    Das Ergebnis ist nicht umkehrbar.
 *  - `pseudonymize`: ersetzt PII vor einem LLM-Aufruf durch stabile
 *    Platzhalter und liefert ein Mapping, das serverseitig bleibt.
 */

/** Feldnamen, deren Werte niemals im Klartext protokolliert werden. */
const SENSITIVE_KEYS = new Set(
  [
    'name', 'firstname', 'first_name', 'lastname', 'last_name', 'fullname', 'full_name',
    'vorname', 'nachname', 'geburtsdatum', 'dateofbirth', 'date_of_birth', 'birthdate',
    'email', 'e_mail', 'mail', 'phone', 'telefon', 'telephone', 'mobile', 'fax',
    'address', 'adresse', 'street', 'strasse', 'city', 'ort', 'zip', 'plz', 'postcode',
    'iban', 'bic', 'accountnumber', 'account_number', 'kontonummer',
    'token', 'accesstoken', 'access_token', 'secret', 'password', 'passwort',
    'verificationcode', 'verification_code', 'authorization', 'cookie', 'ip', 'ipaddress',
  ].map((k) => k.toLowerCase()),
);

export const REDACTED = '[redigiert]';

/** Maximale Tiefe, um zyklische oder sehr tiefe Strukturen zu begrenzen. */
const MAX_DEPTH = 8;

/**
 * Entfernt personenbezogene Daten aus einer beliebigen Struktur.
 *
 * Es werden sowohl Felder anhand ihres Namens als auch Werte anhand ihres
 * Musters (E-Mail, IBAN, Telefonnummer) redigiert. Der Namensabgleich allein
 * genuegt nicht, weil PII auch in Freitextfeldern landen kann.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redact(v, depth + 1);
    }
    return out;
  }
  return REDACTED;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// IBAN: 2 Buchstaben, 2 Pruefziffern, 11-30 alphanumerische Zeichen.
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g;
// Telefonnummern mit mindestens 7 Ziffern, optional mit Laendervorwahl.
const PHONE_RE = /(?:\+|00)\d[\d\s/-]{6,}\d|\b0\d[\d\s/-]{5,}\d\b/g;

/** Redigiert PII-Muster innerhalb eines Freitexts. */
export function redactString(input: string): string {
  return input
    .replace(EMAIL_RE, REDACTED)
    .replace(IBAN_RE, REDACTED)
    .replace(PHONE_RE, REDACTED);
}

export interface PseudonymMapping {
  /** Platzhalter -> Originalwert. Verlaesst niemals den Server. */
  readonly mapping: ReadonlyMap<string, string>;
}

export interface PseudonymizeResult extends PseudonymMapping {
  readonly text: string;
}

/**
 * Ersetzt bekannte Klartextwerte durch stabile Platzhalter, bevor ein Text an
 * ein Sprachmodell geht.
 *
 * Die zu ersetzenden Werte werden ausdruecklich uebergeben (Name, Adresse,
 * IBAN, E-Mail des Schuldners aus der Akte). Zusaetzlich werden verbleibende
 * PII-Muster im Freitext erfasst, damit ein in einer Rechnung erwaehnter
 * Dritter nicht ungeschuetzt durchrutscht.
 */
export function pseudonymize(
  text: string,
  knownValues: Readonly<Record<string, string>>,
): PseudonymizeResult {
  const mapping = new Map<string, string>();
  let result = text;
  let counter = 0;

  // Laengste Werte zuerst, damit "Max Mustermann" nicht durch die Ersetzung
  // von "Max" zerstueckelt wird.
  const entries = Object.entries(knownValues)
    .filter(([, v]) => typeof v === 'string' && v.trim().length >= 3)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [label, value] of entries) {
    if (!result.includes(value)) continue;
    counter += 1;
    const placeholder = `[${label.toUpperCase()}_${counter}]`;
    mapping.set(placeholder, value);
    result = result.split(value).join(placeholder);
  }

  result = result
    .replace(EMAIL_RE, (m) => store(mapping, m, 'EMAIL', () => (counter += 1)))
    .replace(IBAN_RE, (m) => store(mapping, m, 'IBAN', () => (counter += 1)))
    .replace(PHONE_RE, (m) => store(mapping, m, 'TELEFON', () => (counter += 1)));

  return { text: result, mapping };
}

function store(
  mapping: Map<string, string>,
  value: string,
  label: string,
  nextIndex: () => number,
): string {
  for (const [placeholder, original] of mapping) {
    if (original === value) return placeholder;
  }
  const placeholder = `[${label}_${nextIndex()}]`;
  mapping.set(placeholder, value);
  return placeholder;
}

/**
 * Setzt Platzhalter in einer Modellantwort wieder auf die Originalwerte
 * zurueck - nur serverseitig und nur fuer die Anzeige gegenueber Berechtigten.
 */
export function rehydrate(text: string, { mapping }: PseudonymMapping): string {
  let result = text;
  for (const [placeholder, original] of mapping) {
    result = result.split(placeholder).join(original);
  }
  return result;
}
