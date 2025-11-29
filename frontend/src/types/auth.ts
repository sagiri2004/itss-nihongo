export type LoginPayload = {
  username: string
  password: string
}

export type RegisterPayload = LoginPayload

export type AuthResponse = {
  token: string
  tokenType: string
  userId: number
  username: string
  roles: string[]
}

export type UserProfile = {
  id: number
  username: string
  roles: string[]
  createdAt: string
  updatedAt: string
}


