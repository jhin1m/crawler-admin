# Phase 8: Polish & Testing

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: [Phase 7: Crawler UI Progress](./phase-07-crawler-ui-progress.md)
- **Docs**: [PHASE_1_AUTH_AND_CRAWLER.md](../../docs/PHASE_1_AUTH_AND_CRAWLER.md)

## Overview

| Field | Value |
|-------|-------|
| Duration | 2 days |
| Priority | P1 |
| Status | pending |
| Effort | 16h |

## Key Insights

1. Polish UI/UX for production quality
2. Add dark mode support
3. Comprehensive error handling
4. Manual testing of all flows
5. Performance optimization
6. Accessibility improvements

## Requirements

### UI/UX Polish

- Consistent spacing and typography
- Smooth transitions and animations
- Loading states on all async operations
- Empty states with clear actions
- Responsive on all screen sizes

### Dark Mode

- Toggle in header or settings
- Persist preference in localStorage
- System preference detection
- Proper contrast ratios

### Error Handling

- API error boundaries
- Form validation messages
- Network error recovery
- Graceful degradation

### Testing Checklist

- All user flows work correctly
- Edge cases handled
- No console errors
- Responsive design verified

## Architecture

### Dark Mode Implementation

```
[System Preference] --> [localStorage Override?] --> [Apply Theme]
                                |
                                v
                        [Toggle Button]
                                |
                                v
                        [Update localStorage]
                                |
                                v
                        [Apply Theme Class]
```

### Error Boundary Structure

```
<ErrorBoundary>
  <AuthProvider>
    <QueryProvider>
      <App />
    </QueryProvider>
  </AuthProvider>
</ErrorBoundary>
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/theme-toggle.tsx` | Dark mode toggle |
| `src/hooks/use-theme.ts` | Theme management hook |
| `src/components/ui/error-boundary.tsx` | React error boundary |
| `src/components/common/loading-spinner.tsx` | Reusable spinner |

### Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add dark mode CSS variables |
| `src/components/layout/header.tsx` | Add theme toggle |
| `src/main.tsx` | Add error boundary |

## Implementation Steps

### Step 1: Create Theme Hook (45 min)

**src/hooks/use-theme.ts**

```typescript
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'theme-preference'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null
    return stored || 'system'
  })

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (resolvedTheme: 'light' | 'dark') => {
      root.classList.remove('light', 'dark')
      root.classList.add(resolvedTheme)
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches ? 'dark' : 'light')

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme)
    }
  }, [theme])

  const setThemeAndStore = (newTheme: Theme) => {
    localStorage.setItem(THEME_KEY, newTheme)
    setTheme(newTheme)
  }

  return { theme, setTheme: setThemeAndStore }
}
```

### Step 2: Create Theme Toggle (30 min)

**src/components/layout/theme-toggle.tsx**

```typescript
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/use-theme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 3: Create Error Boundary (45 min)

**src/components/ui/error-boundary.tsx**

```typescript
import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="flex gap-2">
                <Button onClick={this.handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/')}
                >
                  Go home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Step 4: Create Loading Spinner (20 min)

**src/components/common/loading-spinner.tsx**

```typescript
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
}

export function LoadingSpinner({
  size = 'md',
  className,
  text
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  )
}
```

### Step 5: Update Header with Theme Toggle (20 min)

**src/components/layout/header.tsx** - Updated

```typescript
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './user-menu'
import { ThemeToggle } from './theme-toggle'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
```

### Step 6: Update CSS for Dark Mode (30 min)

**src/index.css** - Add/update dark mode variables

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

body {
  @apply bg-background text-foreground;
}
```

### Step 7: Update main.tsx with Error Boundary (15 min)

**src/main.tsx** - Updated

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { AuthProvider } from '@/contexts/auth-context'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    },
    mutations: {
      retry: 0
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              richColors
              closeButton
              theme="system"
            />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
```

### Step 8: Testing Checklist (4-6 hours)

#### Authentication Tests

- [ ] Login with valid credentials shows success toast
- [ ] Login with invalid credentials shows error toast
- [ ] Login redirects to intended page
- [ ] Logout clears auth and redirects to login
- [ ] Protected routes redirect unauthenticated users
- [ ] Login page redirects authenticated users
- [ ] Token expiration triggers re-login
- [ ] Auth state persists on page refresh

#### Layout Tests

- [ ] Sidebar shows on desktop (>1024px)
- [ ] Sidebar hides on mobile (<1024px)
- [ ] Mobile menu button opens sidebar
- [ ] Sidebar closes when clicking overlay
- [ ] Sidebar closes when navigating
- [ ] Active nav link is highlighted
- [ ] User menu shows name and email
- [ ] Logout from user menu works
- [ ] Theme toggle changes theme
- [ ] Theme preference persists

#### Crawler Tests

- [ ] Source dropdown shows all sources
- [ ] Storage radio buttons toggle
- [ ] Page range validates (end >= start)
- [ ] Fetch preview shows loading state
- [ ] Preview table shows manga list
- [ ] Cover images load (or show fallback)
- [ ] Status badges show Exists/New
- [ ] Checkbox selection works
- [ ] Select all selects only new mangas
- [ ] Deselect all clears selection
- [ ] Single crawl button works
- [ ] Batch crawl button works
- [ ] Progress tracker shows jobs
- [ ] Progress bar updates
- [ ] Status transitions correctly
- [ ] Error messages display
- [ ] Clear button removes jobs

#### Responsive Tests

- [ ] Login page looks good on mobile
- [ ] Dashboard cards stack on mobile
- [ ] Crawler controls stack on mobile
- [ ] Preview table scrolls horizontally
- [ ] Progress tracker scrolls vertically
- [ ] All text is readable at all sizes

#### Dark Mode Tests

- [ ] All colors correct in light mode
- [ ] All colors correct in dark mode
- [ ] No white flashes on load
- [ ] Theme toggle works
- [ ] Preference persists

#### Error Handling Tests

- [ ] Network error shows toast
- [ ] API error shows toast
- [ ] Form validation errors display
- [ ] Error boundary catches crashes
- [ ] Retry button works

### Step 9: Performance Review (30 min)

- [ ] No unnecessary re-renders (React DevTools)
- [ ] Images lazy loaded
- [ ] API calls not duplicated
- [ ] Bundle size reasonable (<500KB)
- [ ] First load under 3 seconds
- [ ] No memory leaks in dev mode

## Todo List

- [ ] Create src/hooks/use-theme.ts
- [ ] Create src/components/layout/theme-toggle.tsx
- [ ] Create src/components/ui/error-boundary.tsx
- [ ] Create src/components/common/loading-spinner.tsx
- [ ] Update src/components/layout/header.tsx
- [ ] Update src/index.css for dark mode
- [ ] Update src/main.tsx with error boundary
- [ ] Run full testing checklist
- [ ] Fix any bugs found
- [ ] Verify responsive design
- [ ] Verify dark mode
- [ ] Performance check

## Success Criteria

- [ ] All authentication tests pass
- [ ] All layout tests pass
- [ ] All crawler tests pass
- [ ] All responsive tests pass
- [ ] All dark mode tests pass
- [ ] No console errors
- [ ] No console warnings (except expected)
- [ ] Performance meets targets

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dark mode color issues | Low | Test all components in both modes |
| Error boundary not catching | Medium | Wrap at multiple levels |
| Mobile layout breaks | Medium | Test on real devices |

## Security Considerations

- Verify no sensitive data in localStorage
- Check no tokens logged to console
- Ensure XSS protection on user inputs
- Verify CORS settings with API

## Final Deliverables

After Phase 8 completion:

1. **Working Authentication**
   - Login/logout flow
   - Protected routes
   - Token management

2. **Complete Layout**
   - Responsive sidebar
   - Header with user menu
   - Dark mode support

3. **Functional Crawler**
   - Source/storage selection
   - Preview fetching
   - Manga selection
   - Batch crawling
   - Progress tracking

4. **Production Quality**
   - Error handling
   - Loading states
   - Responsive design
   - Accessibility basics

## Completion Checklist

Phase 1 is complete when:

- [ ] Admin can login with valid credentials
- [ ] Protected routes redirect unauthorized users
- [ ] Can select source and fetch manga preview
- [ ] Preview table shows manga with status
- [ ] Can check if manga exists in database
- [ ] Can crawl single manga
- [ ] Can crawl batch of mangas
- [ ] Progress tracking shows real-time updates
- [ ] Error handling is comprehensive
- [ ] UI is responsive and polished
- [ ] Dark mode works correctly
- [ ] No critical bugs
