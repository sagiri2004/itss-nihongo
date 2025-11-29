import type { AuthResponse, LoginPayload, RegisterPayload, UserProfile } from '../types/auth'
import { httpClient } from './httpClient'

export const authService = {
  login(payload: LoginPayload) {
    return httpClient<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  register(payload: RegisterPayload) {
    return httpClient<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export const userService = {
  fetchCurrentUser(token: string) {
    return httpClient<UserProfile>('/api/users/me', {
      method: 'GET',
      token,
    })
  },
}


