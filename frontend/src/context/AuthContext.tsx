import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { LoginPayload, RegisterPayload, UserProfile } from '../types/auth'
import { authService, userService } from '../services/authService'

export type AuthContextValue = {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (credentials: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const TOKEN_STORAGE_KEY = 'itss.nihongo.token'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null,
  )
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isInitializing, setIsInitializing] = useState(() => Boolean(token))

  const persistToken = useCallback((value: string | null) => {
    if (typeof window === 'undefined') return
    if (value) {
      localStorage.setItem(TOKEN_STORAGE_KEY, value)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }, [])

  const hydrateSession = useCallback(async (jwt: string) => {
    const profile = await userService.fetchCurrentUser(jwt)
    setUser(profile)
    setToken(jwt)
  }, [])

  useEffect(() => {
    if (!token || !isInitializing) {
      return
    }

    let isActive = true

    hydrateSession(token)
      .catch(() => {
        if (!isActive) return
        persistToken(null)
        setUser(null)
        setToken(null)
      })
      .finally(() => {
        if (isActive) {
          setIsInitializing(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [hydrateSession, persistToken, token, isInitializing])

  const login = useCallback(
    async (credentials: LoginPayload) => {
      const authResult = await authService.login(credentials)
      persistToken(authResult.token)
      await hydrateSession(authResult.token)
    },
    [hydrateSession, persistToken],
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const authResult = await authService.register(payload)
      persistToken(authResult.token)
      await hydrateSession(authResult.token)
    },
    [hydrateSession, persistToken],
  )

  const logout = useCallback(() => {
    persistToken(null)
    setToken(null)
    setUser(null)
  }, [persistToken])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      register,
      logout,
    }),
    [user, token, isInitializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

