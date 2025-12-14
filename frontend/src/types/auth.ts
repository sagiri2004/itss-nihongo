export type LoginPayload = {
  username: string
  password: string
}

export type RegisterPayload = {
  username: string
  password: string
  email: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  token: string
  newPassword: string
}

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


