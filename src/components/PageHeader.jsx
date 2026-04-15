import { useMode } from '../contexts/ModeContext.jsx'

export default function PageHeader({ title, laie, jurist }) {
  const { mode } = useMode()
  return (
    <div className="mb-5">
      <h1>{title}</h1>
      <p className="text-justiz-600 mt-1">{mode === 'jurist' ? jurist : laie}</p>
    </div>
  )
}
