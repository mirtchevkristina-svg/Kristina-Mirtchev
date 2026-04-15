import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { analyzeDocument, fileToBase64 } from '../utils/claudeApi.js'
import { useMode } from '../contexts/ModeContext.jsx'
import { euro } from '../utils/format.js'

const DOC_TYPES = [
  'Klage','Klagebeantwortung','Zahlungsbefehl','Versäumungsurteil','Urteil','Beschluss',
  'Vergleichsvorschlag','Ladung','Einstweilige Verfügung','Exekutionsbewilligung',
  'Pfändungsbeschluss','Räumungsexekution','Europäischer Zahlungsbefehl','Strafverfügung',
  'Bescheid','Straferkenntnis','Mandatsbescheid','Kündigung','Räumungsklage',
  'Anwaltsschreiben','Inkassoschreiben','Zahlungsaufforderung','Unterlassungsaufforderung',
  'unsicher'
]

export default function DocumentScanner() {
  const { mode } = useMode()
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [manualType, setManualType] = useState('')
  const fileRef = useRef(null)

  function onSelect(e) {
    const list = Array.from(e.target.files || [])
    if (!list.length) return
    setFiles(list)
    setPreviews(list.map(f => URL.createObjectURL(f)))
    setResult(null)
    setError(null)
  }

  async function onAnalyze() {
    if (!files.length) return
    setLoading(true)
    setError(null)
    try {
      const base64s = []
      for (const f of files) base64s.push(await fileToBase64(f))
      const mimeType = files[0].type || 'image/jpeg'
      const json = await analyzeDocument({ imageBase64s: base64s, mimeType })
      setResult(json)
      if (json.dokumentTyp) setManualType(json.dokumentTyp)
    } catch (err) {
      setError(err.message || 'Analyse fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  function onReset() {
    setFiles([]); setPreviews([]); setResult(null); setError(null); setManualType('')
  }

  return (
    <div>
      <PageHeader
        title="Dokument-Scanner"
        laie="Fotografieren Sie Ihr Schreiben — wir ordnen es ein und nennen Ihnen die wichtigsten nächsten Schritte."
        jurist="KI-gestützte Ersterkennung. Schema-validierte JSON-Ausgabe. Keine verbindliche Auskunft."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="mt-0">Dokument hochladen</h3>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={onSelect}
            className="w-full text-sm"
          />
          <p className="hint">
            Sie können mehrere Seiten hochladen. Datenschutz: Die Datei wird
            nur zur Analyse an die KI übermittelt und nicht dauerhaft
            gespeichert.
          </p>

          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {previews.map((url, i) => (
                <img key={i} src={url} alt={`Seite ${i + 1}`}
                  className="rounded-lg border border-justiz-200 object-cover w-full h-32" />
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={onAnalyze}
              disabled={!files.length || loading}
              className="btn-primary"
            >
              {loading ? 'Analyse läuft …' : 'Analysieren'}
            </button>
            {files.length > 0 && (
              <button onClick={onReset} className="btn-secondary">
                Zurücksetzen
              </button>
            )}
          </div>

          {error && (
            <div className="danger mt-4">
              <strong>Fehler:</strong> {error}
              <div className="hint mt-2">
                Hinweis: Der Dokument-Scanner benötigt eine konfigurierte
                Claude-API-Verbindung (Backend-Proxy unter{' '}
                <code>VITE_SCANNER_PROXY_URL</code> oder, nur für Entwicklung,{' '}
                <code>VITE_ANTHROPIC_API_KEY</code>). Nutzen Sie alternativ die
                manuelle Auswahl unten.
              </div>
            </div>
          )}

          <div className="mt-6">
            <label>Manuelle Auswahl (falls Erkennung unsicher):</label>
            <select value={manualType} onChange={(e) => setManualType(e.target.value)}>
              <option value="">— bitte wählen —</option>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {manualType && !result && (
              <ManuelleHinweise type={manualType} />
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mt-0">Ersteinschätzung</h3>
          {!result && !loading && (
            <p className="text-justiz-600">
              Laden Sie ein Dokument hoch und klicken Sie auf „Analysieren“ —
              oder wählen Sie den Typ links manuell aus.
            </p>
          )}
          {loading && (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-justiz-100 rounded w-3/4" />
              <div className="h-4 bg-justiz-100 rounded w-1/2" />
              <div className="h-4 bg-justiz-100 rounded w-2/3" />
            </div>
          )}

          {result && <ResultView result={result} mode={mode} />}
          <Disclaimer />
        </div>
      </div>
    </div>
  )
}

function ResultView({ result, mode }) {
  const dring = result.dringlichkeit || 'mittel'
  const dringBg = dring === 'hoch' ? 'bg-red-50 border-red-300'
    : dring === 'mittel' ? 'bg-amber-50 border-amber-300'
    : 'bg-emerald-50 border-emerald-300'
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-3 ${dringBg}`}>
        <div className="text-xs uppercase tracking-wide text-justiz-500">
          Erkannter Dokumenttyp · Dringlichkeit {dring}
        </div>
        <div className="text-2xl font-serif font-bold">{result.dokumentTyp}</div>
      </div>

      <Grid>
        <Item k="Absender" v={result.absender} />
        <Item k="Gericht / Behörde" v={result.gerichtOderBehoerde} />
        <Item k="Aktenzeichen" v={result.aktenzeichen} />
        <Item k="Zustelldatum" v={result.zustelldatum} />
        <Item k="Streitwert / Forderung" v={result.streitwert != null ? euro(result.streitwert) : null} />
        <Item k="Frist" v={result.fristBezeichnung
          ? `${result.fristBezeichnung}${result.fristenTage ? ` (${result.fristenTage} Tage)` : ''}`
          : null} />
        <Item k="Kläger / Antragsteller" v={result.parteiAktiv} />
        <Item k="Beklagter / Antragsgegner" v={result.parteiPassiv} />
      </Grid>

      {result.laienZusammenfassung && mode === 'laie' && (
        <div className="info">
          <strong>Was ist das?</strong> {result.laienZusammenfassung}
        </div>
      )}

      {result.sofortMassnahmen?.length > 0 && (
        <div>
          <h4 className="font-serif text-lg text-justiz-800">Was jetzt zu tun ist</h4>
          <ol className="list-decimal ml-5 space-y-1 mt-1">
            {result.sofortMassnahmen.map((m, i) => <li key={i}>{m}</li>)}
          </ol>
        </div>
      )}

      {result.warnungen?.length > 0 && (
        <div className="warn">
          <strong>Achtung:</strong>
          <ul className="list-disc ml-5 mt-1">
            {result.warnungen.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {result.rechtsmittelbelehrung && (
        <div className="info">
          <strong>Rechtsmittelbelehrung (erkannt):</strong>{' '}
          {result.rechtsmittelbelehrung}
        </div>
      )}

      {result.anwaltEmpfohlen && (
        <div className="danger">
          <strong>Empfehlung:</strong> In diesem Fall ist anwaltliche
          Unterstützung empfohlen.{' '}
          <a className="underline" href="https://www.oerak.at/buergerservice/servicecorner/rechtsanwalt-finden/" target="_blank" rel="noreferrer">
            Anwaltssuche öffnen
          </a>
        </div>
      )}

      {result.unsicherheitNotiz && (
        <div className="warn">
          <strong>Hinweis zur Unsicherheit:</strong> {result.unsicherheitNotiz}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/fristen" className="btn-gold">Frist berechnen</Link>
        <Link to="/gebuehren" className="btn-secondary">Gebühren schätzen</Link>
        <Link to="/rechtsmittel" className="btn-secondary">Rechtsmittel prüfen</Link>
        <Link to="/verfahrenshilfe" className="btn-secondary">Verfahrenshilfe?</Link>
      </div>
    </div>
  )
}

function Grid({ children }) {
  return <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">{children}</dl>
}

function Item({ k, v }) {
  if (v == null || v === '') return null
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-justiz-500">{k}</dt>
      <dd className="font-semibold text-justiz-800">{v}</dd>
    </div>
  )
}

function ManuelleHinweise({ type }) {
  const TIPPS = {
    'Zahlungsbefehl': ['Einspruchsfrist: 4 Wochen (§ 248 ZPO)', 'Ohne Einspruch wird der Zahlungsbefehl vollstreckbar.'],
    'Klage': ['Klagebeantwortung: i.d.R. 4 Wochen (§ 230 ZPO)', 'Ab € 5.000 Streitwert Anwaltspflicht.'],
    'Strafverfügung': ['Einspruch: 14 Tage (StPO) bzw. 2 Wochen (VStG).'],
    'Bescheid': ['Beschwerde an VwG: 4 Wochen (§ 7 VwGVG).'],
    'Urteil': ['Berufung: i.d.R. 4 Wochen (§ 464 ZPO), anwaltliche Unterfertigung.'],
    'Beschluss': ['Rekurs: 14 Tage (§ 521 ZPO).'],
    'Kündigung': ['Anfechtung: 2 Wochen über Betriebsrat (§ 105 ArbVG).'],
    'Räumungsklage': ['Klagebeantwortung: i.d.R. 4 Wochen.'],
    'Ladung': ['Termin unbedingt wahrnehmen oder begründet absagen.']
  }
  const tips = TIPPS[type] || []
  if (!tips.length) return (
    <p className="hint mt-2">Individuelle Prüfung empfohlen.</p>
  )
  return (
    <ul className="list-disc ml-5 mt-2 text-sm text-justiz-700">
      {tips.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  )
}
