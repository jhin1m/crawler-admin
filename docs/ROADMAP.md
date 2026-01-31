# 🗺️ Crawler Admin - Project Roadmap

> **Mục tiêu**: Xây dựng hệ thống quản trị crawler manga vào database với giao diện hiện đại và dễ sử dụng

## 📊 Tổng quan

Dự án được chia thành 3 phases chính:

- **Phase 1**: Authentication & Basic Crawler Interface ⭐ (Current)
- **Phase 2**: Advanced Features & Batch Processing
- **Phase 3**: Optimization & Monitoring

---

## 🎯 Phase Overview

### Phase 1: Authentication & Basic Crawler Interface (Week 1-2)
**Status**: 🟡 In Planning

**Mục tiêu**: Xây dựng nền tảng cơ bản với authentication và crawler interface đơn giản

**Deliverables**:
- ✅ Login system với JWT authentication
- ✅ Protected routes và auth context
- ✅ Crawler interface với preview table
- ✅ Basic crawl functionality cho Truyenvn và Vyvy
- ✅ Check manga/chapter tồn tại
- ✅ shadcn/ui setup và theme

**Docs**: [Phase 1 Details](./PHASE_1_AUTH_AND_CRAWLER.md)

---

### Phase 2: Advanced Features & Batch Processing (Week 3-4)
**Status**: 🔵 Planned

**Mục tiêu**: Thêm các tính năng nâng cao để tối ưu workflow

**Deliverables**:
- ⏳ Batch crawling với queue system
- ⏳ Scheduler cho auto-crawl định kỳ
- ⏳ Advanced filters và search
- ⏳ Manga/Chapter management interface
- ⏳ S3 upload integration
- ⏳ Crawler history và logs

**Docs**: [Phase 2 Details](./PHASE_2_ADVANCED_FEATURES.md)

---

### Phase 3: Optimization & Monitoring (Week 5-6)
**Status**: 🔵 Planned

**Mục tiêu**: Tối ưu hóa hiệu suất và thêm monitoring

**Deliverables**:
- ⏳ Real-time progress tracking với WebSockets
- ⏳ Performance monitoring dashboard
- ⏳ Error tracking và retry mechanism
- ⏳ Image optimization
- ⏳ Multi-crawler support (dễ dàng thêm crawler mới)
- ⏳ Export/Import configuration

**Docs**: [Phase 3 Details](./PHASE_3_OPTIMIZATION.md)

---

## 🛠️ Tech Stack

### Core
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router v7
- **State Management**: React Query (TanStack Query)

### UI/UX
- **Component Library**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Notifications**: Sonner

### Form & Validation
- **Form Handling**: React Hook Form
- **Validation**: Zod

### API
- **HTTP Client**: Axios
- **Authentication**: JWT Bearer Token

---

## 📅 Timeline

| Phase | Duration | Start Date | End Date |
|-------|----------|------------|----------|
| Phase 1 | 2 weeks | Week 1 | Week 2 |
| Phase 2 | 2 weeks | Week 3 | Week 4 |
| Phase 3 | 2 weeks | Week 5 | Week 6 |

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

---

## 📖 Documentation Structure

```
docs/
├── ROADMAP.md                          # Tài liệu này
├── PHASE_1_AUTH_AND_CRAWLER.md        # Chi tiết Phase 1
├── PHASE_2_ADVANCED_FEATURES.md       # Chi tiết Phase 2
├── PHASE_3_OPTIMIZATION.md            # Chi tiết Phase 3
├── crawlers/
│   ├── API_ADMIN_DOCUMENTATION.md     # API documentation
│   ├── TruyenvnCrawler.php            # Reference crawler
│   └── VyvyCrawler.php                # Reference crawler
└── ARCHITECTURE.md                     # System architecture (sẽ tạo sau)
```

---

## 🎓 Learning Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Router v7](https://reactrouter.com/)

---

## 📝 Notes

- Mỗi phase có file documentation riêng với checklist chi tiết
- Sử dụng checkboxes để track progress
- Mỗi phase build trên nền tảng của phase trước
- Code phải clean, maintainable và well-documented

---

**Last Updated**: 2026-01-30
**Current Phase**: Phase 1 - Planning
