import { useMode } from '../contexts/ModeContext.jsx'

export default function ModeToggle() {
  const { mode, setMode } = useMode()
  return (
    <div
      role="group"
      aria-label="Sprachmodus"
      className="flex rounded-lg bg-justiz-700 p-0.5 text-sm"
    >
      <button
        onClick={() => setMode('laie')}
        className={`px-3 py-1 rounded-md ${
          mode === 'laie' ? 'bg-white text-justiz-800 font-semibold' : 'text-justiz-100'
        }`}
        aria-pressed={mode === 'laie'}
      >
        Laie
      </button>
      <button
        onClick={() => setMode('jurist')}
        className={`px-3 py-1 rounded-md ${
          mode === 'jurist' ? 'bg-white text-justiz-800 font-semibold' : 'text-justiz-100'
        }`}
        aria-pressed={mode === 'jurist'}
      >
        Jurist
      </button>
    </div>
  )
}
