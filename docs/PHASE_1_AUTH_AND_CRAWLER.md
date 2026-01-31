# 📘 Phase 1: Authentication & Basic Crawler Interface

> **Duration**: 2 weeks  
> **Status**: 🟡 In Planning  
> **Priority**: ⭐ Critical

---

## 🎯 Objectives

Xây dựng nền tảng cơ bản cho hệ thống Crawler Admin với:
1. Authentication system hoàn chỉnh
2. Protected routing
3. Crawler interface với preview và crawl functionality
4. Integration với Admin API

---

## ✅ Checklist

### **1. Project Setup & Dependencies** 🔧

- [ ] **Install shadcn/ui**
  ```bash
  pnpm add @radix-ui/react-slot
  pnpm add -D @tailwindcss/typography
  ```

- [ ] **Install additional dependencies**
  ```bash
  pnpm add react-router-dom react-hook-form zod @hookform/resolvers sonner
  pnpm add zustand # State management (nếu cần thêm global state)
  ```

- [ ] **Setup shadcn/ui CLI**
  ```bash
  pnpm dlx shadcn@latest init
  ```

- [ ] **Add shadcn/ui components**
  ```bash
  pnpm dlx shadcn@latest add button
  pnpm dlx shadcn@latest add input
  pnpm dlx shadcn@latest add label
  pnpm dlx shadcn@latest add card
  pnpm dlx shadcn@latest add table
  pnpm dlx shadcn@latest add select
  pnpm dlx shadcn@latest add badge
  pnpm dlx shadcn@latest add progress
  pnpm dlx shadcn@latest add alert
  pnpm dlx shadcn@latest add dropdown-menu
  pnpm dlx shadcn@latest add radio-group
  pnpm dlx shadcn@latest add checkbox
  pnpm dlx shadcn@latest add dialog
  pnpm dlx shadcn@latest add toast
  pnpm dlx shadcn@latest add avatar
  pnpm dlx shadcn@latest add separator
  ```

---

### **2. Project Structure** 📁

- [ ] **Create folder structure**
  ```
  src/
  ├── components/
  │   ├── ui/               # shadcn/ui components
  │   ├── auth/             # Auth-related components
  │   │   ├── LoginForm.tsx
  │   │   └── ProtectedRoute.tsx
  │   ├── crawler/          # Crawler components
  │   │   ├── ControlPanel.tsx
  │   │   ├── PreviewTable.tsx
  │   │   ├── ProgressTracker.tsx
  │   │   └── CrawlerConfig.tsx
  │   └── layout/           # Layout components
  │       ├── MainLayout.tsx
  │       ├── Sidebar.tsx
  │       └── Header.tsx
  ├── pages/
  │   ├── LoginPage.tsx
  │   ├── DashboardPage.tsx
  │   └── CrawlerPage.tsx
  ├── hooks/
  │   ├── useAuth.ts
  │   ├── useCrawler.ts
  │   └── useApi.ts
  ├── services/
  │   ├── api.ts            # Axios instance
  │   ├── auth.service.ts   # Auth API calls
  │   ├── crawler.service.ts # Crawler API calls
  │   └── manga.service.ts  # Manga API calls
  ├── types/
  │   ├── auth.types.ts
  │   ├── crawler.types.ts
  │   └── api.types.ts
  ├── lib/
  │   ├── utils.ts          # Utility functions
  │   └── constants.ts      # Constants
  ├── contexts/
  │   └── AuthContext.tsx   # Auth context
  └── App.tsx
  ```

---

### **3. Authentication System** 🔐

#### **3.1. Auth Types & Interfaces**
- [ ] `src/types/auth.types.ts`
  ```typescript
  export interface LoginCredentials {
    email: string;
    password: string;
  }

  export interface AuthUser {
    id: string;
    name: string;
    email: string;
    roles: string[];
  }

  export interface AuthResponse {
    success: boolean;
    data: {
      token: string;
      type: string;
    };
  }
  ```

#### **3.2. API Service**
- [ ] `src/services/api.ts` - Axios instance với interceptors
- [ ] `src/services/auth.service.ts` - Auth API methods
  - `login(credentials: LoginCredentials)`
  - `getProfile()`
  - `logout()`

#### **3.3. Auth Context & Provider**
- [ ] `src/contexts/AuthContext.tsx`
  - Token management (localStorage)
  - User state
  - Login/Logout methods
  - Loading states

#### **3.4. Auth Hook**
- [ ] `src/hooks/useAuth.ts` - Custom hook để access auth context

#### **3.5. Login Page**
- [ ] `src/pages/LoginPage.tsx`
  - Beautiful login form với shadcn/ui
  - Form validation với react-hook-form + zod
  - Error handling
  - Remember me checkbox
  - Loading state
  - Auto-redirect sau khi login

#### **3.6. Protected Routes**
- [ ] `src/components/auth/ProtectedRoute.tsx`
  - Check authentication
  - Redirect to login nếu chưa đăng nhập

---

### **4. Layout & Navigation** 📐

#### **4.1. Main Layout**
- [ ] `src/components/layout/MainLayout.tsx`
  - Sidebar navigation
  - Header với user info và logout
  - Responsive design
  - Dark mode support

#### **4.2. Sidebar**
- [ ] `src/components/layout/Sidebar.tsx`
  - Navigation links:
    - 🏠 Dashboard
    - 🕷️ Crawler
    - 📚 Mangas (Phase 2)
    - 📖 Chapters (Phase 2)
  - Active state highlighting
  - Collapse/Expand (mobile)

#### **4.3. Header**
- [ ] `src/components/layout/Header.tsx`
  - User avatar và dropdown
  - Logout button
  - Breadcrumbs (optional)

---

### **5. Crawler Interface** 🕷️

#### **5.1. Crawler Types**
- [ ] `src/types/crawler.types.ts`
  ```typescript
  export type CrawlerSource = 'truyenvn' | 'vyvy';
  export type StorageType = 's3' | 'hotlink';
  export type CrawlStatus = 'pending' | 'crawling' | 'success' | 'failed';

  export interface CrawlerConfig {
    source: CrawlerSource;
    storage: StorageType;
    startPage: number;
    endPage: number;
  }

  export interface MangaPreview {
    name: string;
    nameAlt?: string;
    link: string;
    coverUrl: string;
    chapters: number;
    exists: boolean; // Check nếu đã có trong DB
  }

  export interface CrawlProgress {
    mangaId: string;
    status: CrawlStatus;
    progress: number;
    error?: string;
  }
  ```

#### **5.2. Crawler Service**
- [ ] `src/services/crawler.service.ts`
  - `fetchPreview(config: CrawlerConfig)` - Lấy preview manga từ source
  - `checkMangaExists(name: string)` - Check manga đã tồn tại
  - `crawlManga(manga: MangaPreview, config: CrawlerConfig)` - Crawl 1 manga
  - `crawlBatch(mangas: MangaPreview[], config: CrawlerConfig)` - Crawl nhiều manga

#### **5.3. Control Panel**
- [ ] `src/components/crawler/ControlPanel.tsx`
  - Source selector (Dropdown)
  - Storage selector (Radio group)
  - Page range inputs (Start/End)
  - Fetch Preview button
  - Start Crawling button (disabled until preview loaded)

#### **5.4. Preview Table**
- [ ] `src/components/crawler/PreviewTable.tsx`
  - Columns:
    - Cover image (thumbnail)
    - Manga name + alt name
    - Chapters count
    - Status badge (exists/new)
    - Action button (Crawl)
  - Select all checkbox
  - Loading skeleton
  - Empty state
  - Pagination (if needed)

#### **5.5. Progress Tracker**
- [ ] `src/components/crawler/ProgressTracker.tsx`
  - Progress bar cho mỗi manga
  - Status badges
  - Error messages
  - Real-time updates

#### **5.6. Crawler Page**
- [ ] `src/pages/CrawlerPage.tsx`
  - Integrate ControlPanel
  - Integrate PreviewTable
  - Integrate ProgressTracker
  - Handle crawler logic flow

#### **5.7. Crawler Hook**
- [ ] `src/hooks/useCrawler.ts`
  - React Query hooks cho crawler operations
  - State management cho crawling process

---

### **6. API Integration** 🔌

#### **6.1. Manga Service**
- [ ] `src/services/manga.service.ts`
  - `getMangas(filter?)` - List mangas
  - `getManga(id)` - Get manga detail
  - `createManga(data)` - Create manga
  - `checkMangaByName(name)` - Check existence

#### **6.2. Chapter Service**
- [ ] `src/services/chapter.service.ts`
  - `getChapters(mangaId)` - List chapters
  - `createChapter(data)` - Create chapter
  - `uploadChapterImage(chapterId, image)` - Upload image

#### **6.3. React Query Setup**
- [ ] Setup query keys
- [ ] Setup mutations
- [ ] Error handling
- [ ] Cache invalidation

---

### **7. Routing** 🛣️

- [ ] `src/main.tsx` - Setup React Router
  ```typescript
  Routes:
  - / → Redirect to /dashboard (if authenticated) or /login
  - /login → LoginPage (public)
  - /dashboard → DashboardPage (protected)
  - /crawl → CrawlerPage (protected)
  ```

---

### **8. UI/UX Polish** 🎨

- [ ] **Theme Configuration**
  - Color scheme (primary, secondary, accent)
  - Dark mode support
  - Custom CSS variables

- [ ] **Animations**
  - Smooth transitions
  - Loading skeletons
  - Micro-interactions

- [ ] **Responsive Design**
  - Mobile-friendly
  - Tablet optimization
  - Desktop experience

- [ ] **Toast Notifications**
  - Success messages
  - Error messages
  - Info messages

---

### **9. Testing & Validation** ✅

- [ ] **Manual Testing**
  - [ ] Login flow
  - [ ] Protected routes
  - [ ] Logout flow
  - [ ] Crawler preview fetch
  - [ ] Check manga exists
  - [ ] Crawl single manga
  - [ ] Crawl multiple mangas
  - [ ] Error handling
  - [ ] Loading states
  - [ ] Responsive design

- [ ] **Edge Cases**
  - [ ] Invalid credentials
  - [ ] Token expiration
  - [ ] Network errors
  - [ ] Empty results
  - [ ] Duplicate manga names
  - [ ] Failed image uploads

---

## 📦 Dependencies Summary

```json
{
  "dependencies": {
    "react-router-dom": "^7.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",
    "sonner": "^1.x",
    "zustand": "^5.x"
  }
}
```

Plus all shadcn/ui components and their Radix UI dependencies.

---

## 🎯 Acceptance Criteria

Phase 1 được coi là hoàn thành khi:

1. ✅ Admin có thể login thành công
2. ✅ Protected routes hoạt động đúng
3. ✅ Có thể chọn source và fetch preview manga
4. ✅ Preview table hiển thị đầy đủ thông tin
5. ✅ Check manga/chapter đã tồn tại hoạt động
6. ✅ Có thể crawl 1 manga thành công vào DB
7. ✅ Có thể crawl nhiều manga (batch)
8. ✅ Progress tracking hoạt động real-time
9. ✅ Error handling đầy đủ
10. ✅ UI đẹp, responsive và dễ sử dụng

---

## 🚀 Implementation Order

1. **Setup** (Day 1)
   - Install dependencies
   - Setup shadcn/ui
   - Create folder structure

2. **Authentication** (Day 2-3)
   - Auth types & services
   - Auth context
   - Login page
   - Protected routes

3. **Layout** (Day 4)
   - Main layout
   - Sidebar
   - Header

4. **Crawler - Part 1** (Day 5-6)
   - Crawler types
   - Crawler services
   - Control Panel

5. **Crawler - Part 2** (Day 7-8)
   - Preview Table
   - API integration
   - Check exists functionality

6. **Crawler - Part 3** (Day 9-10)
   - Crawl functionality
   - Progress tracker
   - Error handling

7. **Polish & Testing** (Day 11-14)
   - UI/UX improvements
   - Testing
   - Bug fixes

---

## 📝 Notes

- Sử dụng TypeScript nghiêm ngặt
- Code phải clean và well-documented
- Components phải reusable
- API calls phải có proper error handling
- Loading states phải smooth
- Mobile-first approach

---

**Phase Owner**: Development Team  
**Start Date**: TBD  
**Target Completion**: TBD  
**Status**: 🟡 Planning
