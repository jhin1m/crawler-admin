# Phase 1 Readiness Checklist & Setup Guide

**Date**: 2026-01-30  
**Status**: Ready to Start  
**Duration Target**: 2 weeks

---

## 📋 PRE-DEVELOPMENT CHECKLIST

### 1. Dependency Installation
- [ ] Install routing library
  ```bash
  pnpm add react-router-dom
  ```

- [ ] Install form & validation
  ```bash
  pnpm add react-hook-form zod @hookform/resolvers
  ```

- [ ] Install notifications
  ```bash
  pnpm add sonner
  ```

- [ ] Install state management (optional)
  ```bash
  pnpm add zustand
  ```

- [ ] Install Radix UI dependencies
  ```bash
  pnpm add @radix-ui/react-slot
  ```

- [ ] Install Tailwind utilities
  ```bash
  pnpm add -D @tailwindcss/typography
  ```

**Total new packages**: 6 (+ Radix dependencies)

### 2. Project Configuration

- [ ] **Update `tsconfig.app.json` with path aliases**
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"],
        "@components/*": ["./src/components/*"],
        "@pages/*": ["./src/pages/*"],
        "@services/*": ["./src/services/*"],
        "@hooks/*": ["./src/hooks/*"],
        "@types/*": ["./src/types/*"],
        "@lib/*": ["./src/lib/*"],
        "@contexts/*": ["./src/contexts/*"]
      }
    }
  }
  ```

- [ ] **Update `index.html` title**
  ```html
  <title>MyManga Admin - Crawler Management</title>
  ```

- [ ] **Setup shadcn/ui**
  ```bash
  pnpm dlx shadcn@latest init
  ```
  - Choose TypeScript
  - Choose Tailwind CSS
  - Choose src/components/ui as component directory

### 3. Folder Structure Creation

Create the following directories:

```bash
# Create all needed folders
mkdir -p src/pages
mkdir -p src/components/ui
mkdir -p src/components/auth
mkdir -p src/components/crawler
mkdir -p src/components/layout
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/contexts
```

### 4. Base Utility Files

- [ ] Create `src/lib/utils.ts`
  - Implement `cn()` function for Tailwind merging
  - Export utility functions

- [ ] Create `src/lib/constants.ts`
  - API base URL
  - Crawler sources (truyenvn, vyvy)
  - Storage types (s3, hotlink)
  - API endpoints

---

## 🎯 IMPLEMENTATION ORDER (14 Days)

### **Days 1-2: Setup Phase**
- [ ] Install all dependencies
- [ ] Configure TypeScript paths
- [ ] Initialize shadcn/ui
- [ ] Create folder structure
- [ ] Add base utility files
- [ ] Setup environment variables (if needed)

**Deliverable**: Project ready for development

### **Days 3-4: Authentication System**
- [ ] Create `src/types/auth.types.ts`
  - LoginCredentials
  - AuthUser
  - AuthResponse

- [ ] Create `src/services/api.ts`
  - Axios instance with interceptors
  - Error handling
  - Request/response transformers

- [ ] Create `src/services/auth.service.ts`
  - login()
  - getProfile()
  - logout()

- [ ] Create `src/contexts/AuthContext.tsx`
  - Token management
  - User state
  - Loading states
  - AuthProvider component

- [ ] Create `src/hooks/useAuth.ts`
  - useAuth hook for consuming auth context

**Deliverable**: Auth foundation ready

### **Days 5-6: Auth UI & Protected Routes**
- [ ] Add shadcn/ui components: button, input, label, card
  ```bash
  pnpm dlx shadcn@latest add button
  pnpm dlx shadcn@latest add input
  pnpm dlx shadcn@latest add label
  pnpm dlx shadcn@latest add card
  ```

- [ ] Create `src/pages/LoginPage.tsx`
  - Login form with react-hook-form
  - Form validation with Zod
  - Remember me checkbox
  - Error display
  - Loading state

- [ ] Create `src/components/auth/ProtectedRoute.tsx`
  - Route protection
  - Redirect to login if not authenticated

- [ ] Update `src/main.tsx` with React Router setup
  - Configure routes (/, /login, /dashboard, /crawl)

**Deliverable**: Login functionality working

### **Days 7-8: Layout Components**
- [ ] Add shadcn/ui components: avatar, dropdown-menu, separator
  ```bash
  pnpm dlx shadcn@latest add avatar
  pnpm dlx shadcn@latest add dropdown-menu
  pnpm dlx shadcn@latest add separator
  ```

- [ ] Create `src/components/layout/MainLayout.tsx`
  - Main app layout with sidebar + content
  - Responsive design

- [ ] Create `src/components/layout/Sidebar.tsx`
  - Navigation menu
  - Active state highlighting
  - Icons from Lucide

- [ ] Create `src/components/layout/Header.tsx`
  - User info display
  - Logout button
  - Breadcrumbs (optional)

- [ ] Create `src/pages/DashboardPage.tsx`
  - Welcome section
  - Quick stats
  - Recent activity

**Deliverable**: Layout system complete

### **Days 9-10: Crawler Interface - Part 1**
- [ ] Create `src/types/crawler.types.ts`
  - CrawlerSource
  - StorageType
  - CrawlStatus
  - CrawlerConfig
  - MangaPreview
  - CrawlProgress

- [ ] Create `src/services/crawler.service.ts`
  - fetchPreview()
  - checkMangaExists()
  - crawlManga()
  - crawlBatch()

- [ ] Add shadcn/ui components: select, radio-group
  ```bash
  pnpm dlx shadcn@latest add select
  pnpm dlx shadcn@latest add radio-group
  ```

- [ ] Create `src/components/crawler/ControlPanel.tsx`
  - Source selector
  - Storage selector
  - Page range inputs
  - Fetch preview button

**Deliverable**: Crawler setup ready

### **Days 11-12: Crawler Interface - Part 2**
- [ ] Create `src/services/manga.service.ts`
  - getMangas()
  - getManga()
  - createManga()
  - checkMangaByName()

- [ ] Add shadcn/ui components: table, badge, checkbox
  ```bash
  pnpm dlx shadcn@latest add table
  pnpm dlx shadcn@latest add badge
  pnpm dlx shadcn@latest add checkbox
  ```

- [ ] Create `src/components/crawler/PreviewTable.tsx`
  - Display preview results
  - Select all checkbox
  - Status badges
  - Action buttons
  - Loading skeleton

- [ ] Create `src/hooks/useCrawler.ts`
  - React Query hooks for crawler operations
  - State management

**Deliverable**: Preview functionality complete

### **Days 13-14: Crawler - Final Part & Polish**
- [ ] Add shadcn/ui components: progress, alert, dialog, toast
  ```bash
  pnpm dlx shadcn@latest add progress
  pnpm dlx shadcn@latest add alert
  pnpm dlx shadcn@latest add dialog
  pnpm dlx shadcn@latest add toast
  ```

- [ ] Create `src/components/crawler/ProgressTracker.tsx`
  - Real-time progress display
  - Status updates
  - Error messages

- [ ] Create `src/pages/CrawlerPage.tsx`
  - Integrate all crawler components
  - Handle crawler workflow

- [ ] Polish & Testing
  - Test login flow
  - Test protected routes
  - Test crawler preview
  - Test crawl functionality
  - Test error handling
  - Verify responsive design
  - Dark mode support (if time permits)

**Deliverable**: Phase 1 complete & tested

---

## 📦 DEPENDENCIES SUMMARY

### To Install
```bash
# All at once (recommended)
pnpm add react-router-dom react-hook-form zod @hookform/resolvers sonner zustand @radix-ui/react-slot
pnpm add -D @tailwindcss/typography

# shadcn/ui CLI
pnpm dlx shadcn@latest init

# shadcn/ui components (will be added throughout)
pnpm dlx shadcn@latest add button input label card table select badge progress alert dropdown-menu avatar separator radio-group checkbox dialog toast
```

### Total New Packages: ~8
- react-router-dom
- react-hook-form
- zod
- @hookform/resolvers
- sonner
- zustand
- @radix-ui/react-slot
- @tailwindcss/typography

---

## 🔗 KEY INTEGRATION POINTS

### API Base URL
```
Development: http://localhost:3000/api/admin
Production: /api/admin (relative)
```

### Auth Endpoints
```
POST /api/admin/auth        # Login
GET  /api/admin/auth        # Get profile
DELETE /api/admin/auth      # Logout
```

### Crawler Endpoints
```
POST /api/admin/crawlers/preview   # Fetch preview
POST /api/admin/crawlers/check     # Check exists
POST /api/admin/crawlers/crawl     # Start crawl
```

### Storage for Auth Token
```
localStorage: key = 'auth_token'
localStorage: key = 'auth_user'
```

---

## ✅ ACCEPTANCE CRITERIA (Phase 1)

All items must be checked before Phase 1 completion:

- [ ] Admin can login with valid credentials
- [ ] Admin cannot access protected routes without authentication
- [ ] Auto-redirect to login when token expires
- [ ] Logout clears auth state and redirects to login
- [ ] Dashboard page displays user info
- [ ] Can select crawler source (Truyenvn/Vyvy)
- [ ] Can select storage type (S3/Hotlink)
- [ ] Can input page range for preview
- [ ] Preview fetch displays manga list with details
- [ ] Preview table shows cover image thumbnails
- [ ] Preview table shows manga names and chapter count
- [ ] Existing manga shown with "exists" badge
- [ ] New manga shown with "new" badge
- [ ] Can select multiple mangas for batch crawl
- [ ] Can crawl single manga
- [ ] Can crawl multiple mangas (batch)
- [ ] Progress tracker shows real-time updates
- [ ] Progress bar displays crawling progress
- [ ] Error messages display clearly
- [ ] Loading states show proper feedback
- [ ] UI is responsive (mobile, tablet, desktop)
- [ ] No console errors or warnings
- [ ] All forms validate correctly
- [ ] All API calls have error handling
- [ ] Toast notifications show success/error messages

---

## 🚀 SUCCESS METRICS

At end of Phase 1:
- Zero critical bugs
- All acceptance criteria met
- Clean, maintainable code
- Full TypeScript types coverage
- Proper error handling throughout
- Responsive design verified
- Loading states smooth
- API integration working

---

## 📚 RESOURCES

- shadcn/ui: https://ui.shadcn.com/docs
- React Router: https://reactrouter.com/
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- Sonner: https://sonner.emilkowal.ski/
- Lucide Icons: https://lucide.dev/
- Tailwind CSS: https://tailwindcss.com/docs
- React Query: https://tanstack.com/query/latest

---

## 📝 NOTES

- Follow existing code structure strictly
- Use TypeScript everywhere (no `any`)
- Components should be functional & hooks-based
- Use custom hooks for complex logic
- API service should be centralized
- Error handling must be comprehensive
- Loading states on all async operations
- Mobile-first CSS approach
- Accessibility considerations
- Clean commit messages per feature

