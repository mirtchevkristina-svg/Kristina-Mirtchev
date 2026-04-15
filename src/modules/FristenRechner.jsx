import { useMemo, useState } from 'react'
import { FRISTEN, ZUSTELLARTEN, RECHTSSTAND } from '../data/fristen.js'
import { calculateDeadline, formatDateAT } from '../utils/dateCalc.js'
import { buildFristICS, downloadICS } from '../utils/ics.js'
import { useMode } from '../contexts/ModeContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'

const CATS = [...new Set(FRISTEN.map(f => f.category))]

export default function FristenRechner() {
  const { mode } = useMode()
  const [category, setCategory] = useState(CATS[0])
  const [fristId, setFristId] = useState(
    FRISTEN.find(f => f.category === CATS[0])?.id ?? ''
  )
  const [zustellDatum, setZustellDatum] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [zustellart, setZustellart] = useState('eigenhaendig')
  const [sonderHemmung, setSonderHemmung] = useState(false)
  const [abholDatum, setAbholDatum] = useState('')

  const frist = FRISTEN.find(f => f.id === fristId)
  const options = FRISTEN.filter(f => f.category === category)

  const result = useMemo(() => {
    if (!frist || !zustellDatum) return null
    if (frist.manualEnd) return { manual: true }
    const start = new Date(zustellDatum + 'T00:00:00')
    const hinterlegung = zustellart === 'hinterlegung' && abholDatum
      ? new Date(abholDatum + 'T00:00:00')
      : undefined
    return calculateDeadline(start, {
      amount: frist.amount,
      unit: frist.unit,
      ferienHemmung: sonderHemmung || !!frist.ferienHemmung,
      hinterlegungAbholfrist: hinterlegung
    })
  }, [frist, zustellDatum, zustellart, sonderHemmung, abholDatum])

  function ampel(days) {
    if (days == null) return null
    if (days < 0) return { color: 'bg-black', label: 'abgelaufen', cls: 'bg-black text-white' }
    if (days < 7) return { color: 'bg-red-600', label: 'kritisch', cls: 'bg-red-600 text-white' }
    if (days <= 14) return { color: 'bg-amber-500', label: 'eng', cls: 'bg-amber-500 text-white' }
    return { color: 'bg-emerald-600', label: 'komfortabel', cls: 'bg-emerald-600 text-white' }
  }

  function onExportICS() {
    if (!result?.end || !frist) return
    const ics = buildFristICS({
      title: `Frist: ${frist.label}`,
      date: result.end,
      description: `${frist.label} — ${frist.norm ?? ''}\nZustellung: ${zustellDatum}`,
      warnDaysBefore: 3
    })
    downloadICS(`frist-${frist.id}.ics`, ics)
  }

  return (
    <div>
      <PageHeader
        title="Fristenrechner"
        laie="Wann läuft Ihre Frist ab? Tragen Sie Zustelldatum und Verfahrensart ein."
        jurist="Berechnung nach §§ 125 ff ZPO, § 32 AVG, § 108 BAO sinngemäß. Gerichtsferien nach § 222 ZPO."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="field">
            <label>Verfahrensart</label>
            <select
              value={category}
              onChange={(e) => {
                const c = e.target.value
                setCategory(c)
                const first = FRISTEN.find(f => f.category === c)
                if (first) setFristId(first.id)
              }}
            >
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Fristentyp</label>
            <select value={fristId} onChange={(e) => setFristId(e.target.value)}>
              {options.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label} — {o.amount} {
                    { days: 'Tage', weeks: 'Wochen', months: 'Monate', years: 'Jahre' }[o.unit]
                  }
                </option>
              ))}
            </select>
            {frist?.norm && <p className="hint">Rechtsgrundlage: {frist.norm}</p>}
            {frist?.note && <p className="hint italic">{frist.note}</p>}
          </div>

          <div className="field">
            <label>Zustelldatum</label>
            <input
              type="date"
              value={zustellDatum}
              onChange={(e) => setZustellDatum(e.target.value)}
            />
            <p className="hint">Fristbeginn gem. § 125 ZPO ab dem Folgetag.</p>
          </div>

          <div className="field">
            <label>Zustellart</label>
            <select value={zustellart} onChange={(e) => setZustellart(e.target.value)}>
              {ZUSTELLARTEN.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
            </select>
          </div>

          {zustellart === 'hinterlegung' && (
            <div className="field">
              <label>Beginn der Abholfrist</label>
              <input
                type="date"
                value={abholDatum}
                onChange={(e) => setAbholDatum(e.target.value)}
              />
              <p className="hint">Bei Hinterlegung gilt grundsätzlich der Beginn der Abholfrist als Zustellzeitpunkt (§ 17 ZustG).</p>
            </div>
          )}

          <div className="field">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sonderHemmung}
                onChange={(e) => setSonderHemmung(e.target.checked)}
              />
              <span>Verfahrensspezifische Gerichtsferien-Hemmung (§ 222 ZPO) erzwingen</span>
            </label>
          </div>
        </div>

        <div className="card">
          <h2 className="mt-0">Ergebnis</h2>
          {!result && <p>Bitte Fristentyp und Datum wählen.</p>}

          {result?.manual && (
            <div className="warn">
              Diese Frist richtet sich nach einem individuellen Termin
              (z.B. Prüfungstagsatzung im Insolvenz-Edikt) und lässt sich
              nicht kalendarisch berechnen. Prüfen Sie das Edikt oder den
              Beschluss.
            </div>
          )}

          {result?.end && (
            <>
              <div className="text-center py-4">
                <div className="text-sm text-justiz-600">Fristende</div>
                <div className="text-3xl md:text-4xl font-serif font-bold text-justiz-800 mt-1">
                  {formatDateAT(result.end)}
                </div>
                {(() => {
                  const a = ampel(result.daysLeft)
                  return (
                    <div className={`mt-3 inline-flex px-3 py-1 rounded-full font-semibold ${a.cls}`}>
                      {result.daysLeft < 0
                        ? `${Math.abs(result.daysLeft)} Tage überschritten`
                        : `noch ${result.daysLeft} Tage`}{' '}
                      · {a.label}
                    </div>
                  )
                })()}
              </div>

              {result.ferienHinweis && (
                <div className="info mb-3">{result.ferienHinweis}</div>
              )}

              {frist?.vertretungszwang && (
                <div className="warn mb-3">
                  Vertretungszwang: {frist.vertretungszwang}
                </div>
              )}

              {mode === 'laie' && (
                <div className="info mb-3">
                  <strong>Was tun?</strong> Bringen Sie den Schriftsatz rechtzeitig
                  vor Fristende bei Gericht ein — per ERV über Anwalt, per Post
                  (Poststempel des letzten Frist­tages genügt, § 89 GOG)
                  oder persönlich.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button onClick={onExportICS} className="btn-gold">
                  Kalendereintrag (.ics) speichern
                </button>
              </div>
            </>
          )}

          <Disclaimer rechtsstand={RECHTSSTAND} />
        </div>
      </div>
    </div>
  )
}
