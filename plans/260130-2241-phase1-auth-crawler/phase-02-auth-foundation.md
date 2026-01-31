# Phase 2: Authentication Foundation

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: [Phase 1: Setup](./phase-01-setup.md)
- **API Docs**: [API_ADMIN_DOCUMENTATION.md](../../docs/crawlers/API_ADMIN_DOCUMENTATION.md)

## Overview

| Field | Value |
|-------|-------|
| Duration | 2 days |
| Priority | P1 |
| Status | pending |
| Effort | 16h |

## Key Insights

1. API returns `{success, data: {token, type}}` on login
2. Token format: `1|abc123...` (Laravel Sanctum)
3. All protected endpoints require `Authorization: Bearer {token}`
4. Profile returns `{id, name, email, roles[]}`
5. Logout returns 204 No Content

## Requirements

### Authentication Flow

1. User submits email/password
2. API returns token on success
3. Store token in localStorage
4. Fetch profile to get user data
5. Add token to all subsequent requests via interceptor
6. Handle 401 by clearing auth and redirecting to login

### API Endpoints

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | /api/admin/auth | `{email, password}` | `{token, type}` |
| GET | /api/admin/auth | - | `{id, name, email, roles}` |
| DELETE | /api/admin/auth | - | 204 |

## Architecture

### Auth State Flow

```
[Login Form] --> [auth.service.login()] --> [API]
                        |
                        v
              [Store token in localStorage]
                        |
                        v
              [auth.service.getProfile()] --> [API]
                        |
                        v
              [Store user in AuthContext]
                        |
                        v
              [Redirect to /dashboard]
```

### Error Handling Flow

```
[API Call] --> [401 Response?]
                   |
                   v Yes
              [Clear localStorage]
                   |
                   v
              [Redirect to /login]
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/types/auth.types.ts` | Auth type definitions |
| `src/types/api.types.ts` | API response types |
| `src/services/api.ts` | Axios instance with interceptors |
| `src/services/auth.service.ts` | Auth API methods |
| `src/contexts/auth-context.tsx` | Auth state management |
| `src/hooks/use-auth.ts` | Auth hook for components |

## Implementation Steps

### Step 1: Create Type Definitions (45 min)

**src/types/api.types.ts**

```typescript
export interface ApiResponse<T> {
  success: boolean
  data: T
  code?: number
  message?: string
}

export interface ApiError {
  success: false
  message: string
  code: number
  errors?: Record<string, string[]>
}

export interface PaginationMeta {
  count: number
  total: number
  perPage: number
  currentPage: number
  totalPages: number
  links: {
    next?: string
    prev?: string
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: PaginationMeta
}
```

**src/types/auth.types.ts**

```typescript
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
```

### Step 2: Create Axios Instance (60 min)

**src/services/api.ts**

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, AUTH_TOKEN_KEY } from '@/lib/constants'
import type { ApiError } from '@/types/api.types'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

// Request interceptor: Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Clear auth state on unauthorized
      localStorage.removeItem(AUTH_TOKEN_KEY)
      // Redirect handled by AuthContext
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default api
```

### Step 3: Create Auth Service (45 min)

**src/services/auth.service.ts**

```typescript
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
```

### Step 4: Create Auth Context (90 min)

**src/contexts/auth-context.tsx**

```typescript
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import type { AuthUser, LoginCredentials, AuthContextValue, AuthState } from '@/types/auth.types'

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
  const navigate = useNavigate()

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
      localStorage.removeItem('auth_token')
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
      navigate('/login', { replace: true })
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [navigate])

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
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }))
      throw error
    }
  }

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    await authService.logout()
    setState({ ...initialState, isLoading: false })
    navigate('/login', { replace: true })
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
```

### Step 5: Create useAuth Hook (30 min)

**src/hooks/use-auth.ts**

```typescript
import { useAuthContext } from '@/contexts/auth-context'

export function useAuth() {
  return useAuthContext()
}

// Convenience hooks
export function useUser() {
  const { user } = useAuthContext()
  return user
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuthContext()
  return isAuthenticated
}
```

### Step 6: Create Login Validation Schema (20 min)

**src/lib/validations/auth.ts** (create validations folder)

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
})

export type LoginFormData = z.infer<typeof loginSchema>
```

## Todo List

- [ ] Create src/types/api.types.ts
- [ ] Create src/types/auth.types.ts
- [ ] Create src/services/api.ts with interceptors
- [ ] Create src/services/auth.service.ts
- [ ] Create src/contexts/auth-context.tsx
- [ ] Create src/hooks/use-auth.ts
- [ ] Create src/lib/validations/auth.ts
- [ ] Test login API call works
- [ ] Test token stored in localStorage
- [ ] Test 401 handling clears auth

## Success Criteria

- [ ] `authService.login()` returns token and stores it
- [ ] `authService.getProfile()` returns user data
- [ ] `authService.logout()` clears token
- [ ] Axios interceptor adds Bearer token to requests
- [ ] 401 response triggers auth:unauthorized event
- [ ] AuthContext properly manages auth state
- [ ] useAuth hook provides auth state to components

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token format differs from expected | High | Log API response, adjust types |
| CORS issues with API | High | Configure API server or use proxy |
| Token expiration not handled | Medium | Add token refresh if API supports |

## Security Considerations

- Never log tokens in production
- Clear token on any auth error, not just 401
- Use HttpOnly cookies if API supports (more secure than localStorage)
- Validate token exists before API calls
- Don't store sensitive user data in localStorage

## Next Steps

After completion, proceed to [Phase 3: Authentication UI](./phase-03-auth-ui.md)
