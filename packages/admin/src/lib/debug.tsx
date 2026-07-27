import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DebugContextType {
  debugMode: boolean
  toggleDebug: () => void
}

const DebugContext = createContext<DebugContextType>({
  debugMode: false,
  toggleDebug: () => {},
})

export function DebugProvider({ children }: { children: ReactNode }) {
  const [debugMode, setDebugMode] = useState(() => {
    return localStorage.getItem('debugMode') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('debugMode', String(debugMode))
  }, [debugMode])

  const toggleDebug = () => setDebugMode((prev) => !prev)

  return (
    <DebugContext.Provider value={{ debugMode, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  )
}

export function useDebug() {
  return useContext(DebugContext)
}
