import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DebugContextType {
  debugMode: boolean
  toggleDebug: () => void
  isAdmin: boolean
}

const DebugContext = createContext<DebugContextType>({
  debugMode: false,
  toggleDebug: () => {},
  isAdmin: false,
})

export function DebugProvider({ children }: { children: ReactNode }) {
  const [debugMode, setDebugMode] = useState(() => {
    return localStorage.getItem('debugMode') === 'true'
  })

  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.role === 'admin'
    } catch {
      return false
    }
  })

  // Kullanıcı değiştiğinde admin durumunu güncelle
  useEffect(() => {
    const checkAdmin = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setIsAdmin(user.role === 'admin')
      } catch {
        setIsAdmin(false)
      }
    }

    // İlk yükleme
    checkAdmin()

    // Storage değişikliklerini dinle
    window.addEventListener('storage', checkAdmin)

    return () => {
      window.removeEventListener('storage', checkAdmin)
    }
  }, [])

  // Admin değilse debug modunu kapat
  useEffect(() => {
    if (!isAdmin && debugMode) {
      setDebugMode(false)
      localStorage.removeItem('debugMode')
    }
  }, [isAdmin, debugMode])

  const toggleDebug = () => {
    if (!isAdmin) return
    setDebugMode((prev) => !prev)
  }

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('debugMode', String(debugMode))
    }
  }, [debugMode, isAdmin])

  return (
    <DebugContext.Provider value={{ debugMode, toggleDebug, isAdmin }}>
      {children}
    </DebugContext.Provider>
  )
}

export function useDebug() {
  return useContext(DebugContext)
}
