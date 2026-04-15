import { createContext, useContext, useEffect, useState } from 'react'

const ModeContext = createContext({ mode: 'laie', setMode: () => {} })

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('alt-mode') : null
    return stored === 'jurist' || stored === 'laie' ? stored : 'laie'
  })

  useEffect(() => {
    try { localStorage.setItem('alt-mode', mode) } catch {}
  }, [mode])

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  )
}

export function useMode() {
  return useContext(ModeContext)
}

export function Only({ when, children }) {
  const { mode } = useMode()
  if (when === mode) return children
  return null
}
