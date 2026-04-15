import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Disclaimer from '../components/Disclaimer.jsx'
import { RECHTSMITTEL } from '../data/rechtsmittel.js'
import { Link } from 'react-router-dom'

export default function Rechtsmittel() {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <PageHeader
        title="Rechtsmittel-Wegweiser"
        laie="Sie haben eine Entscheidung bekommen und möchten sich wehren? Welches Rechtsmittel ist das richtige?"
        jurist="Zuordnung Ausgangsentscheidung → Rechtsmittel, Frist, zuständiges Gericht, Vertretungserfordernis."
      />

      {!selected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RECHTSMITTEL.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="card text-left hover:border-gold-400 hover:shadow-md"
            >
              <h3 className="mt-0">{r.from}</h3>
              <div className="text-sm text-justiz-600">
                → {r.name} · {r.frist}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="card">
          <button
            className="btn-secondary mb-4"
            onClick={() => setSelected(null)}
          >
            ← Zurück zur Übersicht
          </button>

          <h2 className="mt-0">{selected.from}</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Field label="Rechtsmittel">{selected.name}</Field>
            <Field label="Frist">{selected.frist}</Field>
            <Field label="Zuständiges Gericht">{selected.gericht ?? '—'}</Field>
            <Field label="Vertretungszwang">{selected.vertretung ?? 'im Einzelfall prüfen'}</Field>
            <Field label="Rechtsgrundlage">{selected.norm}</Field>
            <Field label="Form">{selected.form ?? 'schriftlich, mit Antrag und Begründung'}</Field>
          </div>

          <div className="info mt-6">
            <strong>Checkliste:</strong>
            <ol className="list-decimal ml-5 mt-1 space-y-1">
              <li>Zustelldatum dokumentieren (RSa/RSb-Rückschein, ERV-Protokoll).</li>
              <li>Frist genau berechnen — nutzen Sie den{' '}
                <Link className="underline" to="/fristen">Fristenrechner</Link>.</li>
              <li>Schriftsatz formulieren: Bezeichnung des Rechtsmittels,
                Anfechtungserklärung, Antrag, Gründe, Unterschrift.</li>
              <li>Anzahl der Ausfertigungen: für jede Partei eine
                Gleichschrift, plus für das Gericht.</li>
              <li>Gebühr einplanen — <Link className="underline" to="/gebuehren">Gebührenrechner</Link>.</li>
            </ol>
          </div>

          <Disclaimer />
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-justiz-500">{label}</div>
      <div className="font-semibold text-justiz-800">{children}</div>
    </div>
  )
}
