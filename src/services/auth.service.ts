import api from './api'
import { AUTH_TOKEN_KEY } from '@/lib/constants'
import type { ApiResponse } from '@/types/api.types'
import type { LoginCredentials, AuthUser, AuthTokenData } from '@/types/auth.types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<string> {
    const response = await api.post<ApiResponse<AuthTokenData>>('/auth', credentials)
    const { token } = response.data.data
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    return token
  },

  async getProfile(): Promise<AuthUser> {
    const response = await api.get<ApiResponse<AuthUser>>('/auth')
    return response.data.data
  },

  async logout(): Promise<void> {
    try {
      await api.delete('/auth')
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  },

  isAuthenticated(): boolean {
    return !!this.getStoredToken()
  }
}

export default authService
