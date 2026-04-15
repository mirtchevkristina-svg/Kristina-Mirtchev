import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ModeToggle from './ModeToggle.jsx'

const NAV = [
  { to: '/', label: 'Start' },
  { to: '/scanner', label: 'Dokument-Scanner' },
  { to: '/fristen', label: 'Fristen' },
  { to: '/gebuehren', label: 'Gebühren' },
  { to: '/zustaendigkeit', label: 'Zuständigkeit' },
  { to: '/prozesskosten', label: 'Prozesskosten' },
  { to: '/rechtsmittel', label: 'Rechtsmittel' },
  { to: '/verjaehrung', label: 'Verjährung' },
  { to: '/verfahrenshilfe', label: 'Verfahrenshilfe' },
  { to: '/situationen', label: 'Situationen' },
  { to: '/unterhalt', label: 'Unterhalt' }
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname])

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-justiz-800 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-gold-400 text-2xl font-serif font-bold">§</span>
            <span className="font-serif font-bold text-lg md:text-xl leading-tight">
              Austrian Legal Tools
            </span>
          </Link>
          <div className="flex-1" />
          <ModeToggle />
          <button
            className="md:hidden ml-2 p-2 rounded hover:bg-justiz-700"
            aria-label="Menü"
            onClick={() => setOpen(!open)}
          >
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white mb-1" />
            <span className="block w-5 h-0.5 bg-white" />
          </button>
        </div>
        <nav className={`${open ? 'block' : 'hidden'} md:block border-t border-justiz-700`}>
          <div className="max-w-6xl mx-auto px-2 md:px-4 flex flex-wrap gap-1 py-2 text-sm">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg font-medium ${
                    isActive ? 'bg-gold-500 text-white' : 'text-justiz-100 hover:bg-justiz-700'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="bg-justiz-900 text-justiz-100 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm space-y-2">
          <p className="font-semibold text-gold-400">Wichtiger Hinweis</p>
          <p>
            Dieses Tool liefert eine erste Einschätzung und ersetzt keine
            individuelle Rechtsberatung. Alle Angaben ohne Gewähr.
            Prüfen Sie Fristen, Gebühren und Zuständigkeiten stets anhand der
            aktuellen Rechtslage oder durch einen Rechtsanwalt.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <a className="underline hover:text-gold-400" href="https://justiz.gv.at" target="_blank" rel="noreferrer">
              justiz.gv.at
            </a>
            <a className="underline hover:text-gold-400" href="https://www.oerak.at/buergerservice/servicecorner/rechtsanwalt-finden/" target="_blank" rel="noreferrer">
              Rechtsanwaltssuche (ÖRAK)
            </a>
            <Link to="/impressum" className="underline hover:text-gold-400">Impressum &amp; Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
