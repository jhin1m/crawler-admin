# Phase 4: Layout System

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: [Phase 3: Auth UI](./phase-03-auth-ui.md)
- **Docs**: [PHASE_1_AUTH_AND_CRAWLER.md](../../docs/PHASE_1_AUTH_AND_CRAWLER.md)

## Overview

| Field | Value |
|-------|-------|
| Duration | 1.5 days |
| Priority | P1 |
| Status | pending |
| Effort | 12h |

## Key Insights

1. Sidebar navigation with active state
2. Header with user dropdown and logout
3. Responsive: collapsible sidebar on mobile
4. Dark mode support via Tailwind
5. Use Lucide icons (already installed)

## Requirements

### Sidebar Features

- Logo/brand area
- Navigation links with icons
- Active link highlighting
- Collapsible on mobile
- Links: Dashboard, Crawler, (Mangas, Chapters for Phase 2)

### Header Features

- Page title / breadcrumb
- User avatar with dropdown
- Logout option
- Mobile menu toggle

### Responsive Behavior

- Desktop: Fixed sidebar (w-64)
- Mobile: Slide-out sidebar with overlay
- Smooth transitions

## Architecture

### Layout Structure

```
<MainLayout>
  <Sidebar />
  <div className="flex-1">
    <Header />
    <main>
      <Outlet />  <!-- Page content -->
    </main>
  </div>
</MainLayout>
```

### State Management

- Sidebar open/closed: local state
- Active route: react-router useLocation
- User info: auth context

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/layout/main-layout.tsx` | Root layout wrapper |
| `src/components/layout/sidebar.tsx` | Navigation sidebar |
| `src/components/layout/header.tsx` | Top header bar |
| `src/components/layout/nav-link.tsx` | Navigation link item |
| `src/components/layout/user-menu.tsx` | User dropdown menu |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap protected routes with MainLayout |

## Implementation Steps

### Step 1: Create Nav Link Component (30 min)

**src/components/layout/nav-link.tsx**

```typescript
import { Link, useLocation } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  to: string
  icon: LucideIcon
  label: string
  onClick?: () => void
}

export function NavLink({ to, icon: Icon, label, onClick }: NavLinkProps) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}
```

### Step 2: Create Sidebar (60 min)

**src/components/layout/sidebar.tsx**

```typescript
import { LayoutDashboard, Bug, BookOpen, FileText, X } from 'lucide-react'
import { NavLink } from './nav-link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/crawl', icon: Bug, label: 'Crawler' },
  // Phase 2 items (disabled or hidden for now)
  // { to: '/mangas', icon: BookOpen, label: 'Mangas' },
  // { to: '/chapters', icon: FileText, label: 'Chapters' },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo/Brand */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <span className="text-xl font-bold">Manga Admin</span>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              {...item}
              onClick={() => {
                // Close sidebar on mobile after navigation
                if (window.innerWidth < 1024) onClose()
              }}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            Manga Crawler Admin v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
```

### Step 3: Create User Menu (45 min)

**src/components/layout/user-menu.tsx**

```typescript
import { LogOut, User, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function UserMenu() {
  const { user, logout } = useAuth()

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AD'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 4: Create Header (45 min)

**src/components/layout/header.tsx**

```typescript
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './user-menu'

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
        {/* Breadcrumb or page title can go here */}
      </div>

      <div className="flex items-center gap-4">
        <UserMenu />
      </div>
    </header>
  )
}
```

### Step 5: Create Main Layout (60 min)

**src/components/layout/main-layout.tsx**

```typescript
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### Step 6: Create Index Export (10 min)

**src/components/layout/index.ts**

```typescript
export { MainLayout } from './main-layout'
export { Sidebar } from './sidebar'
export { Header } from './header'
export { NavLink } from './nav-link'
export { UserMenu } from './user-menu'
```

### Step 7: Update App Router (30 min)

**src/App.tsx** - Updated

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PublicRoute } from '@/components/auth/public-route'
import { MainLayout } from '@/components/layout'
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

      {/* Protected routes with layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/crawl" element={<CrawlerPage />} />
        </Route>
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
```

### Step 8: Update Dashboard Page (30 min)

**src/pages/dashboard-page.tsx** - Enhanced

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { Bug, BookOpen, FileText, TrendingUp } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Crawler</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-xs text-muted-foreground">
              Start crawling manga
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              TruyenVN, VyvyComi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mangas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Phase 2 feature
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chapters</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Phase 2 feature
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you can perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use the sidebar to navigate to Crawler and start fetching manga previews.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Todo List

- [ ] Create src/components/layout/nav-link.tsx
- [ ] Create src/components/layout/sidebar.tsx
- [ ] Create src/components/layout/user-menu.tsx
- [ ] Create src/components/layout/header.tsx
- [ ] Create src/components/layout/main-layout.tsx
- [ ] Create src/components/layout/index.ts
- [ ] Update src/App.tsx with layout wrapper
- [ ] Update src/pages/dashboard-page.tsx with content
- [ ] Test sidebar navigation works
- [ ] Test mobile responsive sidebar
- [ ] Test user dropdown menu
- [ ] Test logout from menu

## Success Criteria

- [ ] Sidebar displays navigation links
- [ ] Active link is highlighted
- [ ] Mobile sidebar opens/closes correctly
- [ ] Overlay appears on mobile when sidebar open
- [ ] User menu shows name and email
- [ ] Logout clears auth and redirects
- [ ] Dashboard shows welcome message with user name

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| z-index conflicts | Medium | Use consistent z-index scale |
| Sidebar not closing on route change | Low | Add onClick handler to NavLink |
| Avatar not rendering | Low | Use fallback initials |

## Security Considerations

- Don't expose sensitive user data in UI
- Logout should clear all auth state
- User menu items should match user permissions

## Next Steps

After completion, proceed to [Phase 5: Crawler Foundation](./phase-05-crawler-foundation.md)
