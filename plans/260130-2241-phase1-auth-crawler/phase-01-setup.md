# Phase 1: Project Setup & Dependencies

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: None (first phase)
- **Docs**: [PHASE_1_AUTH_AND_CRAWLER.md](../../docs/PHASE_1_AUTH_AND_CRAWLER.md)

## Overview

| Field | Value |
|-------|-------|
| Duration | 1 day |
| Priority | P1 |
| Status | pending |
| Effort | 8h |

## Key Insights

1. React 19 + TypeScript 5.9 + Vite 7 already configured
2. Tailwind CSS 4.1 with @tailwindcss/vite plugin ready
3. React Query + Axios installed but unused
4. Missing: router, forms, validation, UI components
5. shadcn/ui needs initialization before adding components

## Requirements

### Dependencies to Install

```bash
# Routing
pnpm add react-router-dom

# Forms & Validation
pnpm add react-hook-form zod @hookform/resolvers

# Notifications
pnpm add sonner

# UI (Radix base for shadcn)
pnpm add @radix-ui/react-slot

# Tailwind utilities
pnpm add -D @tailwindcss/typography
```

### shadcn/ui Components

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label card table select badge progress alert dropdown-menu radio-group checkbox dialog toast avatar separator
```

## Architecture

### Folder Structure

```
src/
├── components/
│   ├── ui/               # shadcn/ui (auto-generated)
│   ├── auth/             # ProtectedRoute, LoginForm
│   ├── crawler/          # ControlPanel, PreviewTable, ProgressTracker
│   └── layout/           # MainLayout, Sidebar, Header
├── pages/
│   ├── login-page.tsx
│   ├── dashboard-page.tsx
│   └── crawler-page.tsx
├── services/
│   ├── api.ts            # Axios instance
│   ├── auth.service.ts
│   ├── crawler.service.ts
│   └── manga.service.ts
├── hooks/
│   ├── use-auth.ts
│   └── use-crawler.ts
├── contexts/
│   └── auth-context.tsx
├── types/
│   ├── auth.types.ts
│   └── crawler.types.ts
├── lib/
│   ├── utils.ts          # cn() utility
│   └── constants.ts      # API URLs, sources
├── App.tsx               # Router setup
└── main.tsx              # Entry point
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Tailwind utility `cn()` function |
| `src/lib/constants.ts` | API base URL, crawler sources |
| `src/App.tsx` | Replace with router setup |

### Files to Modify

| File | Changes |
|------|---------|
| `tsconfig.app.json` | Add path aliases |
| `vite.config.ts` | Add path alias resolution |
| `index.html` | Update title |
| `src/main.tsx` | Remove StrictMode issues if any |

## Implementation Steps

### Step 1: Install Dependencies (30 min)

```bash
cd /Users/jhin1m/Desktop/ducanh-project/crawler-admin

# Install all at once
pnpm add react-router-dom react-hook-form zod @hookform/resolvers sonner @radix-ui/react-slot
pnpm add -D @tailwindcss/typography
```

### Step 2: Configure Path Aliases (20 min)

**tsconfig.app.json** - Add paths under compilerOptions:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**vite.config.ts** - Add resolve.alias:

```typescript
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // ... existing config
})
```

### Step 3: Initialize shadcn/ui (15 min)

```bash
pnpm dlx shadcn@latest init
```

Configuration choices:
- TypeScript: Yes
- Style: Default (or New York)
- Base color: Slate
- CSS variables: Yes
- Tailwind CSS: Already configured
- Components: src/components/ui
- Utils: src/lib/utils.ts

### Step 4: Add shadcn Components (30 min)

```bash
# Auth components
pnpm dlx shadcn@latest add button input label card

# Layout components
pnpm dlx shadcn@latest add avatar dropdown-menu separator

# Crawler components
pnpm dlx shadcn@latest add table select badge progress alert radio-group checkbox dialog toast
```

### Step 5: Create Folder Structure (15 min)

```bash
mkdir -p src/pages
mkdir -p src/components/auth
mkdir -p src/components/crawler
mkdir -p src/components/layout
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/contexts
mkdir -p src/types
```

### Step 6: Create Base Files (60 min)

**src/lib/constants.ts**

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/admin'

export const CRAWLER_SOURCES = {
  truyenvn: {
    name: 'TruyenVN',
    baseUrl: 'https://truyenvn.shop'
  },
  vyvy: {
    name: 'VyvyComi',
    baseUrl: 'https://vivicomi14.info'
  }
} as const

export const STORAGE_TYPES = {
  s3: 'S3 Upload',
  hotlink: 'Hotlink'
} as const

export const AUTH_TOKEN_KEY = 'auth_token'
export const AUTH_USER_KEY = 'auth_user'
```

**src/lib/utils.ts** (if not created by shadcn)

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Step 7: Update Entry Files (30 min)

**index.html** - Update title:

```html
<title>Manga Admin - Crawler Management</title>
```

**src/App.tsx** - Basic router placeholder:

```typescript
function App() {
  return <div>Router setup in Phase 3</div>
}
export default App
```

### Step 8: Verify Setup (15 min)

```bash
# Check TypeScript compiles
pnpm tsc --noEmit

# Start dev server
pnpm dev

# Verify no console errors
```

## Todo List

- [ ] Install production dependencies (router, forms, validation)
- [ ] Install dev dependencies (typography)
- [ ] Update tsconfig.app.json with path aliases
- [ ] Update vite.config.ts with alias resolution
- [ ] Initialize shadcn/ui
- [ ] Add all required shadcn components
- [ ] Create folder structure
- [ ] Create src/lib/constants.ts
- [ ] Verify src/lib/utils.ts exists with cn()
- [ ] Update index.html title
- [ ] Verify TypeScript compiles
- [ ] Verify dev server runs

## Success Criteria

- [ ] All dependencies installed without errors
- [ ] Path aliases work: `import { cn } from '@/lib/utils'`
- [ ] shadcn/ui components render correctly
- [ ] Dev server starts with no errors
- [ ] TypeScript compilation passes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| shadcn/ui init conflicts with Tailwind 4 | High | Use latest shadcn, check compatibility |
| Path aliases not working | Medium | Verify both tsconfig and vite.config |
| Version conflicts | Low | Use exact versions if needed |

## Security Considerations

- API URL should be configurable via environment variable
- Don't commit .env files with real API URLs
- Use HTTPS for API_BASE_URL in production

## Next Steps

After completion, proceed to [Phase 2: Authentication Foundation](./phase-02-auth-foundation.md)
