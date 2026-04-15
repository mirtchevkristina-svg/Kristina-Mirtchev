import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { GEBUEHREN } from '../data/gebuehren.js'
import { euro } from '../utils/format.js'
import { useMode } from '../contexts/ModeContext.jsx'

// Sehr grobe RATG-Tarifmodellierung über eine logarithmische Funktion,
// plus fiktive Verhandlungs-Multiplikatoren.
// Produktionsnutzung: echten RATG-Tarif als Lookup pflegen.
function anwaltskostenProVerhandlung(streitwert) {
  if (streitwert <= 0) return 0
  // Kombination aus Bemessungs-Komponente und festem Sockel.
  const log = Math.log10(Math.max(streitwert, 100))
  return Math.round(60 + Math.pow(log, 3.2) * 18)
}

export default function Prozesskosten() {
  const { mode } = useMode()
  const [streitwert, setStreitwert] = useState(20_000)
  const [instanz, setInstanz] = useState('1')
  const [verhandlungen, setVerhandlungen] = useState(2)
  const [streitgenossen, setStreitgenossen] = useState(1)
  const [erfolg, setErfolg] = useState(50)
  const [sachverstaendiger, setSachverstaendiger] = useState(0)

  const gerichtsgebuehr = useMemo(() => {
    const tp = instanz === '1' ? 'tp1' : instanz === '2' ? 'tp2' : 'tp3'
    const calc = GEBUEHREN.find(g => g.id === tp).calc
    return calc(streitwert)
  }, [streitwert, instanz])

  const eigeneAK = useMemo(() => {
    const pro = anwaltskostenProVerhandlung(streitwert)
    // + Klage/Berufung als Hauptleistung grob 2x Verhandlungssatz
    return Math.round(pro * (2 + verhandlungen))
  }, [streitwert, verhandlungen])

  const gegnerAK = eigeneAK // Annahme: symmetrisch
  const streitgenossenZuschlag = Math.max(0, (streitgenossen - 1)) * 0.1
  const gegnerMitZuschlag = Math.round(gegnerAK * (1 + streitgenossenZuschlag))

  const best = gerichtsgebuehr // eigene GGG-Kosten sind zurückzuerstatten bei Obsiegen
  const worst =
    gerichtsgebuehr + eigeneAK + gegnerMitZuschlag + Number(sachverstaendiger || 0)

  const erwartungswert = useMemo(() => {
    const p = Math.max(0, Math.min(100, Number(erfolg))) / 100
    return Math.round(best * p + worst * (1 - p))
  }, [erfolg, best, worst])

  return (
    <div>
      <PageHeader
        title="Prozesskostenrisiko-Rechner"
        laie="Was kostet der Prozess im besten und im schlechtesten Fall?"
        jurist="Best-/Worst-Case nach Obsiegens- und Kostenersatzwahrscheinlichkeit. RATG-Modellierung vereinfacht."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="field">
            <label>Streitwert in €</label>
            <input type="number" min={0} value={streitwert}
              onChange={(e) => setStreitwert(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Instanz</label>
            <select value={instanz} onChange={(e) => setInstanz(e.target.value)}>
              <option value="1">1. Instanz</option>
              <option value="2">Berufung</option>
              <option value="3">Revision</option>
            </select>
          </div>
          <div className="field">
            <label>Anzahl Verhandlungen / Tagsatzungen</label>
            <input type="number" min={0} max={20} value={verhandlungen}
              onChange={(e) => setVerhandlungen(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Streitgenossen (eigene Seite)</label>
            <input type="number" min={1} max={20} value={streitgenossen}
              onChange={(e) => setStreitgenossen(Number(e.target.value))} />
            <p className="hint">Mehrkostenzuschlag nach RATG (vereinfacht 10 % pro zusätzlichem Streitgenossen).</p>
          </div>
          <div className="field">
            <label>Sachverständigen-/Dolmetscherkosten (Schätzung) in €</label>
            <input type="number" min={0} value={sachverstaendiger}
              onChange={(e) => setSachverstaendiger(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Erfolgswahrscheinlichkeit: {erfolg} %</label>
            <input type="range" min={0} max={100} step={5}
              value={erfolg} onChange={(e) => setErfolg(Number(e.target.value))}
              className="w-full" />
          </div>
        </div>

        <div className="card">
          <h2 className="mt-0">Ergebnis</h2>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <KPI label="Best-Case" value={euro(best)} tone="emerald" />
            <KPI label="Erwartungswert" value={euro(erwartungswert)} tone="gold" />
            <KPI label="Worst-Case" value={euro(worst)} tone="red" />
          </div>

          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-justiz-100">
                <td className="py-1">Gerichtsgebühr (GGG)</td>
                <td className="py-1 text-right">{euro(gerichtsgebuehr)}</td>
              </tr>
              <tr className="border-t border-justiz-100">
                <td className="py-1">Eigene Anwaltskosten (RATG, vereinfacht)</td>
                <td className="py-1 text-right">{euro(eigeneAK)}</td>
              </tr>
              <tr className="border-t border-justiz-100">
                <td className="py-1">Gegner-Anwaltskosten bei Unterliegen</td>
                <td className="py-1 text-right">{euro(gegnerMitZuschlag)}</td>
              </tr>
              <tr className="border-t border-justiz-100">
                <td className="py-1">Sachverständiger / Dolmetscher</td>
                <td className="py-1 text-right">{euro(Number(sachverstaendiger || 0))}</td>
              </tr>
            </tbody>
          </table>

          {mode === 'laie' && (
            <div className="info mt-4">
              <strong>Wichtig:</strong> Bei <em>Teilobsiegen</em> werden Kosten oft
              anteilig verteilt. Ein Vergleich beendet den Streit häufig
              kostengünstiger als ein streitiges Urteil.
            </div>
          )}
          {mode === 'jurist' && (
            <div className="info mt-4">
              Modellierung ist RATG-näherungsweise über logarithmische Funktion.
              Kostenersatzanspruch nach § 41 ZPO (volles Obsiegen) bzw.
              § 43 ZPO (Teilobsiegen) im Einzelfall zu prüfen.
            </div>
          )}

          <Disclaimer />
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, tone }) {
  const tones = {
    emerald: 'border-emerald-300 text-emerald-900 bg-emerald-50',
    red: 'border-red-300 text-red-900 bg-red-50',
    gold: 'border-gold-400 text-justiz-800 bg-gold-400/10'
  }
  return (
    <div className={`rounded-xl border ${tones[tone]} p-3`}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="text-xl font-serif font-bold mt-1">{value}</div>
    </div>
  )
}
