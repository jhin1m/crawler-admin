# Phase 3: Authentication UI

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: [Phase 2: Auth Foundation](./phase-02-auth-foundation.md)
- **Docs**: [PHASE_1_AUTH_AND_CRAWLER.md](../../docs/PHASE_1_AUTH_AND_CRAWLER.md)

## Overview

| Field | Value |
|-------|-------|
| Duration | 2 days |
| Priority | P1 |
| Status | pending |
| Effort | 16h |

## Key Insights

1. Login page must be beautiful and professional
2. Form validation with react-hook-form + zod
3. Protected routes redirect to /login if unauthenticated
4. Sonner for toast notifications
5. Need loading states during login

## Requirements

### Login Page Features

- Email and password inputs
- Form validation with error messages
- Loading state during submission
- Remember me checkbox (optional, store email)
- Error toast on failed login
- Auto-redirect to dashboard on success
- Responsive design

### Route Protection

- Check auth state before rendering protected routes
- Show loading spinner while checking auth
- Redirect to /login if not authenticated
- Preserve intended URL for post-login redirect

## Architecture

### Route Structure

```
/           -> Redirect to /dashboard or /login
/login      -> LoginPage (public only)
/dashboard  -> DashboardPage (protected)
/crawl      -> CrawlerPage (protected)
```

### Component Hierarchy

```
<BrowserRouter>
  <AuthProvider>
    <QueryClientProvider>
      <Toaster />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/crawl" element={<CrawlerPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </QueryClientProvider>
  </AuthProvider>
</BrowserRouter>
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/login-page.tsx` | Login page component |
| `src/pages/dashboard-page.tsx` | Dashboard placeholder |
| `src/pages/crawler-page.tsx` | Crawler page placeholder |
| `src/components/auth/protected-route.tsx` | Route guard for auth |
| `src/components/auth/public-route.tsx` | Redirect logged users |
| `src/components/auth/login-form.tsx` | Login form component |
| `src/App.tsx` | Router configuration |
| `src/main.tsx` | App entry with providers |

## Implementation Steps

### Step 1: Update main.tsx (30 min)

**src/main.tsx**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/auth-context'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
```

### Step 2: Create Protected Route (45 min)

**src/components/auth/protected-route.tsx**

```typescript
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Save intended destination
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
```

**src/components/auth/public-route.tsx**

```typescript
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    // Redirect to intended destination or dashboard
    const from = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}
```

### Step 3: Create Login Form (90 min)

**src/components/auth/login-form.tsx**

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import type { ApiError } from '@/types/api.types'

export function LoginForm() {
  const { login, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data)
      toast.success('Login successful')
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>
      const message = axiosError.response?.data?.message || 'Login failed'
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@example.com"
          autoComplete="email"
          disabled={isLoading}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isLoading}
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  )
}
```

### Step 4: Create Login Page (60 min)

**src/pages/login-page.tsx**

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Manga Admin</CardTitle>
          <CardDescription>
            Sign in to access the crawler dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 5: Create Placeholder Pages (30 min)

**src/pages/dashboard-page.tsx**

```typescript
export function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome to Manga Admin</p>
      {/* Stats and content in Phase 4 */}
    </div>
  )
}
```

**src/pages/crawler-page.tsx**

```typescript
export function CrawlerPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Crawler</h1>
      <p className="text-muted-foreground">Crawler interface coming soon</p>
      {/* Crawler components in Phase 5-7 */}
    </div>
  )
}
```

### Step 6: Configure Router (45 min)

**src/App.tsx**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PublicRoute } from '@/components/auth/public-route'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { CrawlerPage } from '@/pages/crawler-page'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/crawl" element={<CrawlerPage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
```

### Step 7: Create Index Exports (15 min)

**src/components/auth/index.ts**

```typescript
export { ProtectedRoute } from './protected-route'
export { PublicRoute } from './public-route'
export { LoginForm } from './login-form'
```

**src/pages/index.ts**

```typescript
export { LoginPage } from './login-page'
export { DashboardPage } from './dashboard-page'
export { CrawlerPage } from './crawler-page'
```

## Todo List

- [ ] Update src/main.tsx with providers
- [ ] Create src/components/auth/protected-route.tsx
- [ ] Create src/components/auth/public-route.tsx
- [ ] Create src/components/auth/login-form.tsx
- [ ] Create src/pages/login-page.tsx
- [ ] Create src/pages/dashboard-page.tsx (placeholder)
- [ ] Create src/pages/crawler-page.tsx (placeholder)
- [ ] Update src/App.tsx with routes
- [ ] Create barrel exports (index.ts files)
- [ ] Test login flow end-to-end
- [ ] Test protected route redirect
- [ ] Test public route redirect (logged in user)
- [ ] Verify toast notifications work

## Success Criteria

- [ ] Login page renders with form
- [ ] Form validation shows errors for invalid input
- [ ] Successful login redirects to dashboard
- [ ] Failed login shows error toast
- [ ] Protected routes redirect to login when not authenticated
- [ ] Already logged in users redirected from login page
- [ ] Loading states show during async operations

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sonner not rendering toasts | Medium | Check Toaster placement in main.tsx |
| Form validation not triggering | Medium | Verify zodResolver import |
| Infinite redirect loop | High | Check isLoading state in route guards |

## Security Considerations

- Don't log credentials in console
- Use type="password" for password field
- Disable form during submission to prevent double-submit
- Clear form errors on new submission attempt
- Consider rate limiting on login attempts (server-side)

## Next Steps

After completion, proceed to [Phase 4: Layout System](./phase-04-layout.md)
