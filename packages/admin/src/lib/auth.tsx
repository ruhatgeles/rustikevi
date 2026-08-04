import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from './api'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setTokens: (accessToken: string, refreshToken: string, user?: User) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const result = await api.request<{
      accessToken: string
      refreshToken: string
      user: User
    }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    localStorage.setItem('accessToken', result.accessToken)
    localStorage.setItem('refreshToken', result.refreshToken)
    localStorage.setItem('user', JSON.stringify(result.user))
    setUser(result.user)
  }

  const logout = async () => {
    try {
      await api.request('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    api.clearTokens()
    setUser(null)
  }

  const setTokens = (accessToken: string, refreshToken: string, user?: User) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setTokens }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
