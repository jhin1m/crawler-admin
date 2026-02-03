import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authService } from '@/services/auth.service'
import type { LoginCredentials, AuthContextValue, AuthState } from '@/types/auth.types'
import { AUTH_TOKEN_KEY } from '@/lib/constants'

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState)

  // Check auth on mount
  const checkAuth = useCallback(async () => {
    const token = authService.getStoredToken()
    if (!token) {
      setState({ ...initialState, isLoading: false })
      return
    }

    try {
      const user = await authService.getProfile()
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      })
    } catch {
      // Token invalid, clear auth
      localStorage.removeItem(AUTH_TOKEN_KEY)
      setState({ ...initialState, isLoading: false })
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Handle unauthorized events from axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setState({ ...initialState, isLoading: false })
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      const token = await authService.login(credentials)
      const user = await authService.getProfile()
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      })
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    await authService.logout()
    setState({ ...initialState, isLoading: false })
  }

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    checkAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

export { AuthContext }
