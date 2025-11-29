import { createContext } from 'react'
import type { LoginPayload, RegisterPayload, UserProfile } from '../types/auth'

export type AuthContextValue = {
  user: UserProfile | null
  token: string | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (credentials: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)


