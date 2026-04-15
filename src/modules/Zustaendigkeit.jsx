import { useMemo, useState } from 'react'
import {
  RECHTSGEBIETE,
  GERICHTSTYPEN,
  GERICHTSSUCHE_URL
} from '../data/gerichte.js'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'

export default function Zustaendigkeit() {
  const [gebiet, setGebiet] = useState(RECHTSGEBIETE[0].id)
  const [streitwert, setStreitwert] = useState(5000)
  const [strafdrohung, setStrafdrohung] = useState('niedrig')
  const [bundesbehoerde, setBundesbehoerde] = useState(false)
  const [unternehmer, setUnternehmer] = useState(false)
  const [plz, setPlz] = useState('')

  const cur = RECHTSGEBIETE.find(r => r.id === gebiet)
  const typ = useMemo(() => {
    if (!cur) return null
    return cur.rule({ streitwert, strafdrohung, bundesbehoerde, unternehmer })
  }, [cur, streitwert, strafdrohung, bundesbehoerde, unternehmer])

  return (
    <div>
      <PageHeader
        title="Zuständigkeitsfinder"
        laie="Welches Gericht oder welche Behörde ist für meinen Fall zuständig?"
        jurist="Erste Zuordnung der sachlichen und funktionellen Zuständigkeit. Örtliche Zuständigkeit siehe Gerichtssuche."
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="field">
            <label>Rechtsgebiet / Gegenstand</label>
            <select value={gebiet} onChange={(e) => setGebiet(e.target.value)}>
              {RECHTSGEBIETE.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            {cur?.hint && <p className="hint">{cur.hint}</p>}
            {cur?.norm && <p className="hint">Norm: {cur.norm}</p>}
          </div>

          {['zivil-geld', 'handelssache-wien'].includes(gebiet) && (
            <div className="field">
              <label>Streitwert in €</label>
              <input
                type="number"
                min={0}
                value={streitwert}
                onChange={(e) => setStreitwert(Number(e.target.value))}
              />
            </div>
          )}

          {gebiet === 'strafsache' && (
            <div className="field">
              <label>Strafdrohung</label>
              <select value={strafdrohung} onChange={(e) => setStrafdrohung(e.target.value)}>
                <option value="niedrig">bis 1 Jahr Freiheitsstrafe</option>
                <option value="hoch">über 1 Jahr Freiheitsstrafe</option>
              </select>
            </div>
          )}

          {gebiet === 'verwaltung' && (
            <div className="field">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bundesbehoerde}
                  onChange={(e) => setBundesbehoerde(e.target.checked)}
                />
                <span>Bescheid einer Bundesbehörde (z.B. BMF, BMI)?</span>
              </label>
            </div>
          )}

          {gebiet === 'insolvenz' && (
            <div className="field">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unternehmer}
                  onChange={(e) => setUnternehmer(e.target.checked)}
                />
                <span>Unternehmerinsolvenz?</span>
              </label>
            </div>
          )}

          <div className="field">
            <label>Postleitzahl (für örtliche Zuständigkeit)</label>
            <input
              type="text"
              value={plz}
              placeholder="z.B. 1010"
              onChange={(e) => setPlz(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            />
            <p className="hint">
              Die örtliche Zuständigkeit hängt von Wohnsitz, Sitz oder Ort der
              Sache ab und kann nicht verlässlich aus der PLZ abgeleitet
              werden. Nutzen Sie die amtliche Gerichtssuche.
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="mt-0">Voraussichtlich zuständig</h2>
          {typ && (
            <div className="text-center py-4">
              <div className="text-sm text-justiz-600">Gerichts-/Behördentyp</div>
              <div className="text-3xl font-serif font-bold text-justiz-800 mt-1">
                {GERICHTSTYPEN[typ]}
              </div>
              <div className="text-xs text-justiz-500 mt-1">{cur?.norm}</div>
            </div>
          )}

          <div className="warn">
            <strong>Wichtig:</strong> Die sachliche Zuordnung ist ein erster
            Anhaltspunkt. Für das konkrete Gericht (z.B. BG Innere Stadt Wien
            oder BG Salzburg) verwenden Sie die amtliche{' '}
            <a className="underline" href={GERICHTSSUCHE_URL} target="_blank" rel="noreferrer">
              Gerichtssuche
            </a>. Sonderzuständigkeiten (z.B. ausschließlicher Gerichtsstand
            der gelegenen Sache) können abweichen.
          </div>

          <div className="mt-4">
            <a href={GERICHTSSUCHE_URL} target="_blank" rel="noreferrer" className="btn-gold">
              Amtliche Gerichtssuche öffnen
            </a>
          </div>

          <Disclaimer />
        </div>
      </div>
    </div>
  )
}
