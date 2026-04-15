// Claude API Integration für den Dokument-Scanner (Modul 0).
//
// WICHTIG — Architektur-Hinweis:
// ------------------------------------------------------------
// Die Anthropic-API erlaubt direkte Aufrufe aus dem Browser mit
// `anthropic-dangerous-direct-browser-access: true`. Für produktiven
// Einsatz wird dringend empfohlen, einen schmalen eigenen Backend-Proxy
// vorzuschalten, damit der API-Key nicht dem Client ausgeliefert wird.
//
// Dieser Client unterstützt zwei Betriebsmodi:
// 1. "proxy"  – POSTet an `${VITE_SCANNER_PROXY_URL}` (Default: `/api/scan`)
// 2. "direct" – ruft direkt die Anthropic-API mit `VITE_ANTHROPIC_API_KEY` auf
//               (nur zu Entwicklungs-/Demozwecken).

const MODEL = 'claude-opus-4-6'

const SYSTEM_PROMPT = `Du bist eine juristische Assistenz für österreichisches Recht.
Analysiere das beigefügte Dokument (Foto oder Scan) und gib EINE JSON-Antwort im
folgenden Schema zurück. Erfinde keine Inhalte. Wenn unsicher: "unsicher".

{
  "dokumentTyp": "Klage" | "Klagebeantwortung" | "Zahlungsbefehl" | "Versäumungsurteil" |
                 "Urteil" | "Beschluss" | "Vergleichsvorschlag" | "Ladung" |
                 "Einstweilige Verfügung" | "Exekutionsbewilligung" | "Pfändungsbeschluss" |
                 "Räumungsexekution" | "Europäischer Zahlungsbefehl" | "Strafverfügung" |
                 "Bescheid" | "Straferkenntnis" | "Mandatsbescheid" | "Kündigung" |
                 "Räumungsklage" | "Anwaltsschreiben" | "Inkassoschreiben" |
                 "Zahlungsaufforderung" | "Unterlassungsaufforderung" | "unsicher",
  "absender": string | null,
  "gerichtOderBehoerde": string | null,
  "aktenzeichen": string | null,
  "streitwert": number | null,
  "parteiAktiv": string | null,
  "parteiPassiv": string | null,
  "zustelldatum": string | null,   // YYYY-MM-DD wenn im Dokument erkennbar
  "fristenTage": number | null,    // erkennbare Frist in Tagen
  "fristBezeichnung": string | null,
  "rechtsmittelbelehrung": string | null,
  "dringlichkeit": "hoch" | "mittel" | "niedrig",
  "laienZusammenfassung": string,
  "sofortMassnahmen": string[],    // max 5, klare Handlungsanweisungen
  "warnungen": string[],
  "anwaltEmpfohlen": boolean,
  "unsicherheitNotiz": string | null
}

Antworte ausschließlich mit gültigem JSON — ohne Markdown-Codeblock, ohne Kommentare.`

export async function analyzeDocument({ imageBase64s, mimeType = 'image/jpeg' }) {
  const proxyUrl = import.meta.env.VITE_SCANNER_PROXY_URL
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const payload = {
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBase64s.map(data => ({
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data }
          })),
          {
            type: 'text',
            text:
              'Analysiere das/die Dokument(e). Antworte ausschließlich mit JSON laut Schema.'
          }
        ]
      }
    ]
  }

  let response
  if (proxyUrl) {
    response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } else if (apiKey) {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(payload)
    })
  } else {
    throw new Error(
      'Claude-API nicht konfiguriert. Setzen Sie VITE_ANTHROPIC_API_KEY ' +
      '(nur für Entwicklung!) oder VITE_SCANNER_PROXY_URL.'
    )
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API-Fehler ${response.status}: ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const text = extractText(data)
  return parseJSON(text)
}

function extractText(data) {
  // Anthropic Messages-API Format
  if (Array.isArray(data?.content)) {
    return data.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')
  }
  // Falls Proxy abweichend wrappt
  if (typeof data?.text === 'string') return data.text
  if (typeof data === 'string') return data
  return JSON.stringify(data)
}

function parseJSON(text) {
  // Entferne eventuelle Markdown-Codefences
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // versuche JSON-Substring zu finden
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) {
      try { return JSON.parse(m[0]) } catch {}
    }
    throw new Error('Antwort der KI konnte nicht als JSON interpretiert werden.')
  }
}

export async function fileToBase64(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
