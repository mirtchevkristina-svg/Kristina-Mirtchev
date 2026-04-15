import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { SITUATIONEN } from '../data/situationen.js'
import { FRISTEN } from '../data/fristen.js'
import { ANWALTSSUCHE_URL } from '../data/gerichte.js'

export default function Situationsberater() {
  const [id, setId] = useState(null)
  const sit = SITUATIONEN.find(s => s.id === id)

  return (
    <div>
      <PageHeader
        title="Was tun wenn …"
        laie="Geführte Anleitung für häufige Fälle — Schritt für Schritt."
        jurist="Situationsbezogene Ablauflisten mit Normverweisen."
      />

      {!sit && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SITUATIONEN.map(s => (
            <button
              key={s.id}
              onClick={() => setId(s.id)}
              className="card text-left hover:border-gold-400 hover:shadow-md"
            >
              <h3 className="mt-0">{s.title}</h3>
              <p className="text-sm text-justiz-600">{s.passiert}</p>
            </button>
          ))}
        </div>
      )}

      {sit && (
        <div className="card">
          <button className="btn-secondary mb-4" onClick={() => setId(null)}>
            ← Zurück zur Übersicht
          </button>
          <h2 className="mt-0">{sit.title}</h2>

          <Section title="Was ist passiert?">
            <p>{sit.passiert}</p>
          </Section>

          <Section title="Was ist sofort zu tun?">
            <ul className="list-decimal ml-5 space-y-1">
              {sit.sofort.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </Section>

          <Section title="Was sollte man nicht tun?">
            <ul className="list-disc ml-5 space-y-1 text-red-800">
              {sit.nicht.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </Section>

          <Section title="Brauche ich einen Anwalt?">
            <p>{sit.anwalt}</p>
            <a className="btn-gold mt-2 inline-flex" href={ANWALTSSUCHE_URL} target="_blank" rel="noreferrer">
              Anwaltssuche öffnen
            </a>
          </Section>

          {sit.frist && <FristHinweis info={sit.frist} />}

          {sit.module?.length > 0 && (
            <Section title="Passende Tools">
              <div className="flex flex-wrap gap-2">
                {sit.module.map(m => (
                  <Link key={m} to={m} className="btn-secondary">{labelForPath(m)}</Link>
                ))}
              </div>
            </Section>
          )}

          <Section title="Wo finde ich Hilfe?">
            <ul className="list-disc ml-5 space-y-1">
              <li>Amtliche Rechtsanwaltssuche: <a className="underline" href={ANWALTSSUCHE_URL} target="_blank" rel="noreferrer">oerak.at</a></li>
              <li>Kostenlose Erstberatung an Amtstagen beim Bezirksgericht (siehe <a className="underline" href="https://justiz.gv.at" target="_blank" rel="noreferrer">justiz.gv.at</a>)</li>
              <li>Arbeiterkammer, Mieterschutz­organisationen, Konsumentenschutz (bei passendem Thema)</li>
              <li>Bewährte Schuldenberatung: schuldnerberatung.at</li>
            </ul>
          </Section>

          <Disclaimer />
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mt-4">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

function FristHinweis({ info }) {
  const frist = FRISTEN.find(f => f.id === info.fristId)
  if (!frist) return null
  return (
    <Section title="Welche Frist ist relevant?">
      <div className="warn">
        <strong>{info.label}:</strong> {frist.amount}{' '}
        {{ days: 'Tage', weeks: 'Wochen', months: 'Monate', years: 'Jahre' }[frist.unit]}
        {frist.norm && <span> · {frist.norm}</span>}
        {' '}
        <Link className="underline" to="/fristen">zum Fristenrechner</Link>.
      </div>
    </Section>
  )
}

function labelForPath(p) {
  return ({
    '/fristen': 'Fristenrechner',
    '/gebuehren': 'Gebührenrechner',
    '/verfahrenshilfe': 'Verfahrenshilfe',
    '/prozesskosten': 'Prozesskosten',
    '/zustaendigkeit': 'Zuständigkeit',
    '/rechtsmittel': 'Rechtsmittel',
    '/verjaehrung': 'Verjährung',
    '/unterhalt': 'Unterhalt',
    '/scanner': 'Dokument-Scanner',
    '/situationen': 'Weitere Situationen'
  })[p] ?? p}
