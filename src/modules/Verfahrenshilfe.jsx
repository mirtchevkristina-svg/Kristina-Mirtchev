import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { euro } from '../utils/format.js'
import { useMode } from '../contexts/ModeContext.jsx'

// Sehr vereinfachte Heuristik. Tatsächliche Entscheidung trifft das Gericht
// auf Grundlage des Vermögensbekenntnisses (§ 66 ZPO, § 61 AußStrG).

export default function Verfahrenshilfe() {
  const { mode } = useMode()
  const [netto, setNetto] = useState(1500)
  const [unterhaltspflichtig, setUnterhaltspflichtig] = useState(0)
  const [vermoegen, setVermoegen] = useState(0)
  const [schulden, setSchulden] = useState(0)
  const [erfolg, setErfolg] = useState('moeglich')

  const eval_ = useMemo(() => {
    const restEinkommen = netto - unterhaltspflichtig * 300 // grobe Pauschale pro unterhaltsberechtigter Person
    const vermoegenUeber = Math.max(0, vermoegen - 10_000) // Schutzbetrag-Fiktion
    const existenzNah = restEinkommen <= 1300
    const vermoegenArm = vermoegenUeber < 20_000
    const defizit = schulden > (vermoegen + netto * 6)

    const erfolgOk = erfolg !== 'aussichtslos'

    let score = 0
    if (existenzNah) score += 3
    if (vermoegenArm) score += 2
    if (defizit) score += 1
    if (erfolgOk) score += 1

    let stufe = 'eher unwahrscheinlich'
    let tone = 'red'
    if (score >= 5) { stufe = 'wahrscheinlich'; tone = 'emerald' }
    else if (score >= 3) { stufe = 'möglich'; tone = 'gold' }

    return { score, stufe, tone, restEinkommen }
  }, [netto, unterhaltspflichtig, vermoegen, schulden, erfolg])

  return (
    <div>
      <PageHeader
        title="Verfahrenshilfe-Check"
        laie="Prüfen Sie, ob Sie möglicherweise Anspruch auf Verfahrenshilfe (Gebühren- und Anwaltsbefreiung) haben."
        jurist="Indikative Prüfung gem. § 63 ZPO / § 7 AußStrG — die Entscheidung trifft das Gericht auf Grundlage des Vermögensbekenntnisses."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="field">
            <label>Monatliches Nettoeinkommen in €</label>
            <input type="number" min={0} value={netto}
              onChange={(e) => setNetto(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Anzahl unterhaltsberechtigter Personen</label>
            <input type="number" min={0} max={10} value={unterhaltspflichtig}
              onChange={(e) => setUnterhaltspflichtig(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Verwertbares Vermögen (Sparbuch, Wertpapiere, Liegenschaften) in €</label>
            <input type="number" min={0} value={vermoegen}
              onChange={(e) => setVermoegen(Number(e.target.value))} />
            <p className="hint">Selbst bewohnte Wohnung und Haushalt bleiben i.d.R. unberücksichtigt.</p>
          </div>
          <div className="field">
            <label>Schulden in €</label>
            <input type="number" min={0} value={schulden}
              onChange={(e) => setSchulden(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Erfolgsaussichten im Verfahren</label>
            <select value={erfolg} onChange={(e) => setErfolg(e.target.value)}>
              <option value="gut">Gut</option>
              <option value="moeglich">Möglich / unsicher</option>
              <option value="aussichtslos">Aussichtslos</option>
            </select>
            <p className="hint">Bei offensichtlich aussichtslosen Verfahren wird die Verfahrenshilfe regelmäßig verweigert.</p>
          </div>
        </div>

        <div className="card">
          <h2 className="mt-0">Einschätzung</h2>
          <div className={`rounded-xl p-4 border text-center ${
            eval_.tone === 'emerald' ? 'bg-emerald-50 border-emerald-300' :
            eval_.tone === 'gold'    ? 'bg-gold-400/10 border-gold-400' :
                                       'bg-red-50 border-red-300'
          }`}>
            <div className="text-sm text-justiz-600">Verfahrenshilfe ist</div>
            <div className="text-2xl font-serif font-bold mt-1 capitalize">{eval_.stufe}</div>
            <div className="text-xs text-justiz-500 mt-1">Heuristischer Score: {eval_.score}/7</div>
          </div>

          <div className="info mt-4">
            <strong>Verbleibendes Einkommen (nach Unterhalts-Pauschale):</strong>{' '}
            {euro(eval_.restEinkommen)} / Monat
          </div>

          {mode === 'laie' && (
            <ul className="list-disc ml-5 mt-4 space-y-1 text-sm text-justiz-700">
              <li>Antrag mit Vermögensbekenntnis beim zuständigen Gericht einbringen.</li>
              <li>Formular "Vermögensbekenntnis" (z.B. oesterreich.gv.at) verwenden.</li>
              <li>Die Verfahrenshilfe kann Gebühren-Befreiung und die Beigebung einer Rechtsanwältin / eines Rechtsanwalts umfassen.</li>
              <li>Bei Änderung Ihrer wirtschaftlichen Verhältnisse ist dies dem Gericht mitzuteilen.</li>
            </ul>
          )}

          <Disclaimer />
        </div>
      </div>
    </div>
  )
}
