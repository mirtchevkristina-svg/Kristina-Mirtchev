import { useMemo, useState } from 'react'
import { GEBUEHREN, ervRabatt, TARIFSTAND } from '../data/gebuehren.js'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { euro } from '../utils/format.js'
import { useMode } from '../contexts/ModeContext.jsx'

export default function GebuehrenRechner() {
  const { mode } = useMode()
  const [tarifId, setTarifId] = useState(GEBUEHREN[0].id)
  const [basis, setBasis] = useState(10_000)
  const [erv, setErv] = useState(false)

  const tarif = GEBUEHREN.find(t => t.id === tarifId)

  const gebuhr = useMemo(() => {
    if (!tarif) return null
    let amt = tarif.calc(basis || 0)
    if (erv) amt = ervRabatt(amt)
    return amt
  }, [tarif, basis, erv])

  return (
    <div>
      <PageHeader
        title="Gebührenrechner"
        laie="Was kostet mich die Klage, die Berufung oder ein Grundbuchsantrag?"
        jurist="Pauschalgebühren nach GGG — Tarifstand beachten. Zuschläge bei ERV-Nichtnutzung möglich (§ 31a GGG)."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="field">
            <label>Gebührentatbestand</label>
            <select value={tarifId} onChange={(e) => setTarifId(e.target.value)}>
              {GEBUEHREN.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
            {tarif?.norm && <p className="hint">Rechtsgrundlage: {tarif.norm}</p>}
            {tarif?.info && <p className="hint italic">{tarif.info}</p>}
          </div>

          {tarif.basis !== 'pauschal' && (
            <div className="field">
              <label>
                {tarif.basis === 'streitwert'
                  ? 'Streitwert in €'
                  : 'Bemessungsgrundlage in €'}
              </label>
              <input
                type="number"
                min={0}
                value={basis}
                onChange={(e) => setBasis(Number(e.target.value))}
              />
            </div>
          )}

          <div className="field">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={erv}
                onChange={(e) => setErv(e.target.checked)}
              />
              <span>Einbringung über ERV</span>
            </label>
          </div>
        </div>

        <div className="card">
          <h2 className="mt-0">Ergebnis</h2>
          <div className="text-center py-4">
            <div className="text-sm text-justiz-600">Voraussichtliche Gerichtsgebühr</div>
            <div className="text-4xl font-serif font-bold text-justiz-800 mt-1">{euro(gebuhr)}</div>
            <div className="text-xs text-justiz-500 mt-1">
              {tarif?.norm} · Tarifstand {TARIFSTAND}
            </div>
          </div>

          {mode === 'laie' && (
            <div className="info">
              <strong>Gut zu wissen:</strong> Dazu kommen typischerweise
              Anwaltskosten, Barauslagen und — bei Unterliegen — der Ersatz der
              gegnerischen Kosten. Prüfen Sie die <a className="underline" href="/verfahrenshilfe">Verfahrenshilfe</a>{' '}
              und den <a className="underline" href="/prozesskosten">Prozesskosten-Rechner</a>.
            </div>
          )}

          {mode === 'jurist' && (
            <div className="info">
              Zuschläge z.B. bei nicht-elektronischer Einbringung (§ 31a GGG),
              Vielparteienzuschlag (§ 19a GGG) sowie Beilagengebühr sind hier
              nicht berücksichtigt.
            </div>
          )}

          <Disclaimer rechtsstand={TARIFSTAND} />
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="mt-0">Tarif-Übersicht</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-justiz-600">
              <th className="py-1 pr-4">Tatbestand</th>
              <th className="py-1 pr-4">Rechtsgrundlage</th>
              <th className="py-1">Basis</th>
            </tr>
          </thead>
          <tbody>
            {GEBUEHREN.map(g => (
              <tr key={g.id} className="border-t border-justiz-100">
                <td className="py-1 pr-4">{g.label}</td>
                <td className="py-1 pr-4">{g.norm}</td>
                <td className="py-1">
                  {g.basis === 'streitwert' && 'Streitwert'}
                  {g.basis === 'bm' && 'Bemessungsgrundlage'}
                  {g.basis === 'pauschal' && 'Pauschalbetrag'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
