# 📗 Phase 2: Advanced Features & Batch Processing

> **Duration**: 2 weeks  
> **Status**: 🔵 Planned  
> **Priority**: ⭐⭐ High  
> **Prerequisites**: Phase 1 completed

---

## 🎯 Objectives

Mở rộng hệ thống với các tính năng nâng cao:
1. Batch processing với queue system
2. Scheduler cho auto-crawl
3. Manga/Chapter management interface
4. S3 integration
5. History & logging system

---

## ✅ Checklist

### **1. Queue System** 📋

- [ ] **Install queue library**
  ```bash
  pnpm add bull bullmq ioredis
  # Hoặc sử dụng simple in-memory queue
  ```

- [ ] **Queue Service**
  - [ ] `src/services/queue.service.ts`
    - Add job to queue
    - Process queue
    - Pause/Resume queue
    - Clear queue
    - Get queue status

- [ ] **Queue UI Component**
  - [ ] `src/components/crawler/QueueManager.tsx`
    - View queued items
    - Pause/Resume button
    - Clear queue button
    - Queue statistics

- [ ] **Integration với Crawler**
  - [ ] Batch crawl sử dụng queue
  - [ ] Concurrent crawling (limit)
  - [ ] Retry failed jobs

---

### **2. Scheduler System** ⏰

- [ ] **Install scheduler**
  ```bash
  pnpm add node-cron # or use API-based scheduling
  ```

- [ ] **Scheduler Types**
  - [ ] `src/types/scheduler.types.ts`
    ```typescript
    export interface ScheduleConfig {
      id: string;
      name: string;
      source: CrawlerSource;
      storage: StorageType;
      startPage: number;
      endPage: number;
      cronExpression: string;
      enabled: boolean;
      lastRun?: Date;
      nextRun?: Date;
    }
    ```

- [ ] **Scheduler Service**
  - [ ] `src/services/scheduler.service.ts`
    - Create schedule
    - Update schedule
    - Delete schedule
    - Enable/Disable schedule
    - Get all schedules

- [ ] **Scheduler UI**
  - [ ] `src/pages/SchedulerPage.tsx`
    - List schedules
    - Create new schedule form
    - Edit schedule
    - Delete schedule
    - Enable/Disable toggle

---

### **3. Manga Management** 📚

- [ ] **Mangas List Page**
  - [ ] `src/pages/MangasPage.tsx`
    - Table danh sách manga
    - Search & filters
    - Sort options
    - Pagination
    - Bulk actions

- [ ] **Manga Detail Page**
  - [ ] `src/pages/MangaDetailPage.tsx`
    - Manga information
    - Cover image
    - Genres
    - Artist, Group info
    - Chapters list
    - Edit button

- [ ] **Manga Edit/Create Form**
  - [ ] `src/components/manga/MangaForm.tsx`
    - All manga fields
    - Cover upload
    - Genre selection
    - Artist selection
    - Validation

- [ ] **Manga Filters**
  - [ ] `src/components/manga/MangaFilters.tsx`
    - Filter by status
    - Filter by genre
    - Filter by artist
    - Filter by review status
    - Date range filter

---

### **4. Chapter Management** 📖

- [ ] **Chapters List Page**
  - [ ] `src/pages/ChaptersPage.tsx`
    - Table danh sách chapters
    - Filter by manga
    - Sort by order/date
    - Bulk delete
    - Reorder chapters

- [ ] **Chapter Detail Page**
  - [ ] `src/pages/ChapterDetailPage.tsx`
    - Chapter info
    - Images gallery
    - Edit/Delete buttons
    - Add images

- [ ] **Chapter Form**
  - [ ] `src/components/chapter/ChapterForm.tsx`
    - Chapter name
    - Order number
    - Manga selection
    - Image upload (multiple)

- [ ] **Chapter Images Manager**
  - [ ] `src/components/chapter/ImagesManager.tsx`
    - Drag & drop reorder
    - Delete images
    - Add new images
    - Preview images

---

### **5. S3 Integration** ☁️

- [ ] **Install AWS SDK**
  ```bash
  pnpm add @aws-sdk/client-s3 @aws-sdk/lib-storage
  ```

- [ ] **S3 Service**
  - [ ] `src/services/s3.service.ts`
    - Upload image to S3
    - Generate presigned URL
    - Delete from S3
    - List objects

- [ ] **S3 Configuration**
  - [ ] `src/components/settings/S3Config.tsx`
    - AWS credentials form
    - Bucket name
    - Region
    - Test connection button

- [ ] **Image Upload Component**
  - [ ] `src/components/common/ImageUpload.tsx`
    - Support both Hotlink và S3
    - Progress indicator
    - Preview before upload
    - Multiple upload

---

### **6. Crawler History & Logs** 📜

- [ ] **History Types**
  - [ ] `src/types/history.types.ts`
    ```typescript
    export interface CrawlHistory {
      id: string;
      source: CrawlerSource;
      storage: StorageType;
      startPage: number;
      endPage: number;
      totalMangas: number;
      successCount: number;
      failedCount: number;
      startTime: Date;
      endTime?: Date;
      duration?: number;
      status: 'running' | 'completed' | 'failed';
    }

    export interface CrawlLog {
      id: string;
      historyId: string;
      mangaName: string;
      status: 'success' | 'failed';
      error?: string;
      timestamp: Date;
    }
    ```

- [ ] **History Service**
  - [ ] `src/services/history.service.ts`
    - Save crawl history
    - Get history list
    - Get history details
    - Get logs by history

- [ ] **History Page**
  - [ ] `src/pages/HistoryPage.tsx`
    - List all crawl sessions
    - Filter by date/status
    - View session details
    - View logs

- [ ] **History Detail Page**
  - [ ] `src/pages/HistoryDetailPage.tsx`
    - Session info
    - Statistics
    - Detailed logs
    - Failed items list
    - Retry option

---

### **7. Advanced Search & Filters** 🔍

- [ ] **Global Search Component**
  - [ ] `src/components/common/GlobalSearch.tsx`
    - Search manga by name
    - Search chapter by name
    - Quick results dropdown
    - Keyboard shortcuts

- [ ] **Advanced Filters**
  - [ ] Multi-select genres
  - [ ] Date range picker
  - [ ] Status filters
  - [ ] Custom query builder

- [ ] **Search Service**
  - [ ] `src/services/search.service.ts`
    - Build filter query
    - Parse search results
    - Search suggestions

---

### **8. Dashboard Improvements** 📊

- [ ] **Statistics Cards**
  - [ ] Total Mangas
  - [ ] Total Chapters
  - [ ] Today's Crawls
  - [ ] Failed Crawls

- [ ] **Charts**
  ```bash
  pnpm add recharts
  ```
  - [ ] Crawl activity chart (last 7 days)
  - [ ] Source distribution pie chart
  - [ ] Success rate chart

- [ ] **Recent Activity**
  - [ ] Latest crawled mangas
  - [ ] Latest failed items
  - [ ] Upcoming scheduled tasks

- [ ] **Quick Actions**
  - [ ] Quick crawl button
  - [ ] View failed crawls
  - [ ] Go to scheduler

---

### **9. Settings Page** ⚙️

- [ ] **Settings Page**
  - [ ] `src/pages/SettingsPage.tsx`
    - API configuration
    - S3 configuration
    - Crawler settings
    - UI preferences

- [ ] **API Settings**
  - [ ] Base URL
  - [ ] Token management
  - [ ] Test connection

- [ ] **Crawler Settings**
  - [ ] Default storage
  - [ ] Concurrent limit
  - [ ] Retry attempts
  - [ ] Timeout settings

- [ ] **UI Settings**
  - [ ] Theme toggle (light/dark)
  - [ ] Language selection
  - [ ] Items per page

---

### **10. Error Handling & Notifications** ⚠️

- [ ] **Error Boundary**
  - [ ] Global error boundary
  - [ ] Component-level error boundaries
  - [ ] Error logging

- [ ] **Notification Center**
  - [ ] `src/components/common/NotificationCenter.tsx`
  - [ ] Real-time notifications
  - [ ] Notification history
  - [ ] Mark as read

- [ ] **Error Logging Service**
  - [ ] `src/services/logger.service.ts`
  - [ ] Log errors
  - [ ] Send to backend
  - [ ] Local storage backup

---

### **11. Bulk Operations** 🔄

- [ ] **Bulk Manga Operations**
  - [ ] Select multiple mangas
  - [ ] Bulk delete
  - [ ] Bulk update status
  - [ ] Bulk assign artist/group

- [ ] **Bulk Chapter Operations**
  - [ ] Select multiple chapters
  - [ ] Bulk delete
  - [ ] Bulk reorder
  - [ ] Bulk update manga

- [ ] **Bulk Crawl**
  - [ ] Select mangas to re-crawl
  - [ ] Batch update images
  - [ ] Batch fix failed items

---

### **12. Export/Import** 💾

- [ ] **Export Configuration**
  - [ ] Export schedules
  - [ ] Export crawler configs
  - [ ] Export history (CSV/JSON)

- [ ] **Import Configuration**
  - [ ] Import schedules
  - [ ] Import manga list
  - [ ] Validate before import

---

## 📦 Additional Dependencies

```json
{
  "dependencies": {
    "bull": "^4.x",
    "ioredis": "^5.x",
    "node-cron": "^3.x",
    "recharts": "^2.x",
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/lib-storage": "^3.x",
    "date-fns": "^3.x",
    "react-beautiful-dnd": "^13.x"
  }
}
```

Additional shadcn/ui components:
```bash
pnpm dlx shadcn@latest add calendar
pnpm dlx shadcn@latest add popover
pnpm dlx shadcn@latest add command
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add tooltip
pnpm dlx shadcn@latest add switch
pnpm dlx shadcn@latest add slider
```

---

## 🎯 Acceptance Criteria

Phase 2 được coi là hoàn thành khi:

1. ✅ Queue system hoạt động với batch crawling
2. ✅ Scheduler có thể tạo và chạy auto-crawl
3. ✅ Manga management đầy đủ (CRUD)
4. ✅ Chapter management đầy đủ (CRUD)
5. ✅ S3 integration hoạt động
6. ✅ History và logs được lưu và hiển thị
7. ✅ Dashboard có statistics và charts
8. ✅ Settings page đầy đủ
9. ✅ Bulk operations hoạt động
10. ✅ Export/Import configuration

---

## 🚀 Implementation Order

1. **Queue System** (Day 1-2)
2. **Manga Management** (Day 3-4)
3. **Chapter Management** (Day 5-6)
4. **S3 Integration** (Day 7)
5. **Scheduler** (Day 8-9)
6. **History & Logs** (Day 10)
7. **Dashboard** (Day 11)
8. **Settings & Bulk Ops** (Day 12-13)
9. **Testing & Polish** (Day 14)

---

**Status**: 🔵 Planned  
**Dependencies**: Phase 1  
**Next Phase**: Phase 3 - Optimization & Monitoring
