import { Link } from 'react-router-dom'
import { useMode } from '../contexts/ModeContext.jsx'

const TILES = [
  { to: '/scanner', title: 'Dokument-Scanner', desc: 'Foto hochladen und Ersteinschätzung bekommen.', tag: 'KI' },
  { to: '/fristen', title: 'Fristenrechner', desc: 'Berufung, Einspruch, Beschwerde & Co. berechnen.' },
  { to: '/gebuehren', title: 'Gebührenrechner', desc: 'Gerichtsgebühren nach GGG.' },
  { to: '/zustaendigkeit', title: 'Zuständigkeit', desc: 'Welches Gericht, welche Behörde?' },
  { to: '/prozesskosten', title: 'Prozesskostenrisiko', desc: 'Best-Case / Worst-Case / Erwartungswert.' },
  { to: '/rechtsmittel', title: 'Rechtsmittel-Wegweiser', desc: 'Welches Rechtsmittel gegen welche Entscheidung?' },
  { to: '/verjaehrung', title: 'Verjährung', desc: 'Wann verjährt mein Anspruch?' },
  { to: '/verfahrenshilfe', title: 'Verfahrenshilfe', desc: 'Schnellprüfung auf Kostenbefreiung.' },
  { to: '/situationen', title: 'Was tun wenn …', desc: 'Geführte Anleitung für häufige Fälle.' },
  { to: '/unterhalt', title: 'Unterhalt', desc: 'Kindes- und Ehegattenunterhalt (Richtwert).' }
]

export default function Home() {
  const { mode } = useMode()
  return (
    <div>
      <div className="card mb-6 bg-gradient-to-br from-justiz-800 to-justiz-600 text-white">
        <div className="flex items-start gap-4">
          <span className="text-gold-400 text-5xl font-serif leading-none">§</span>
          <div>
            <h1 className="text-white">Rechtstools für Österreich</h1>
            <p className="mt-2 text-justiz-100">
              {mode === 'jurist'
                ? 'Fristen, Gebühren, Zuständigkeiten und Rechtsmittel — kompakt und mit Normverweisen.'
                : 'Sie haben Post vom Gericht oder von einer Behörde bekommen? Wir helfen bei der Ersteinschätzung — verständlich, ohne juristischen Fachjargon.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/scanner" className="btn-gold">Dokument scannen</Link>
              <Link to="/fristen" className="btn-secondary text-justiz-800">Frist berechnen</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map(t => (
          <Link key={t.to} to={t.to} className="card hover:border-gold-400 hover:shadow-md group">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-justiz-800 group-hover:text-justiz-900">{t.title}</h3>
              {t.tag && <span className="pill bg-gold-500 text-white">{t.tag}</span>}
            </div>
            <p className="text-justiz-600 mt-1 text-sm">{t.desc}</p>
          </Link>
        ))}
      </div>

      <div className="info mt-8">
        <strong>Hinweis:</strong>{' '}
        Diese App dient der rechtlichen Erstorientierung und ist keine Rechtsberatung.
        Die Berechnungen bilden typische Fälle ab — im Einzelfall können
        Sondervorschriften, Hemmungen oder Ausnahmen greifen.
      </div>
    </div>
  )
}
