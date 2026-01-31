export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  roles: string[]
}

export interface AuthTokenData {
  token: string
  type: string
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}
