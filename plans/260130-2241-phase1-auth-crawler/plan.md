---
title: "Phase 1: Authentication & Basic Crawler Interface"
description: "Authentication system, layout, and crawler interface for manga admin dashboard"
status: pending
priority: P1
effort: 14d
branch: main
tags: [auth, crawler, layout, react, typescript, phase-1]
created: 2026-01-30
---

# Phase 1: Authentication & Basic Crawler Interface

## Overview

Build authentication system, admin layout, and crawler interface for manga management dashboard.

**Duration**: 14 days | **Priority**: Critical | **Status**: Pending

## Phases

| Phase | Name | Status | Effort | File |
|-------|------|--------|--------|------|
| 1 | Project Setup & Dependencies | pending | 1d | [phase-01-setup.md](./phase-01-setup.md) |
| 2 | Authentication Foundation | pending | 2d | [phase-02-auth-foundation.md](./phase-02-auth-foundation.md) |
| 3 | Authentication UI | pending | 2d | [phase-03-auth-ui.md](./phase-03-auth-ui.md) |
| 4 | Layout System | pending | 1.5d | [phase-04-layout.md](./phase-04-layout.md) |
| 5 | Crawler Foundation | pending | 1.5d | [phase-05-crawler-foundation.md](./phase-05-crawler-foundation.md) |
| 6 | Crawler UI - Control & Preview | pending | 2d | [phase-06-crawler-ui-control.md](./phase-06-crawler-ui-control.md) |
| 7 | Crawler UI - Progress & Integration | pending | 2d | [phase-07-crawler-ui-progress.md](./phase-07-crawler-ui-progress.md) |
| 8 | Polish & Testing | pending | 2d | [phase-08-polish-testing.md](./phase-08-polish-testing.md) |

## Dependencies Map

```
Phase 1 (Setup)
    └── Phase 2 (Auth Foundation)
        └── Phase 3 (Auth UI)
            └── Phase 4 (Layout)
                └── Phase 5 (Crawler Foundation)
                    └── Phase 6 (Crawler UI Control)
                        └── Phase 7 (Crawler UI Progress)
                            └── Phase 8 (Polish)
```

## Key Deliverables

1. **Authentication**: Login/logout, protected routes, token management
2. **Layout**: Responsive sidebar, header with user dropdown
3. **Crawler**: Source selection, preview table, batch crawl, progress tracking

## API Endpoints Used

- `POST /api/admin/auth` - Login
- `GET /api/admin/auth` - Profile
- `DELETE /api/admin/auth` - Logout
- `GET /api/admin/mangas` - Check exists
- `POST /api/admin/mangas` - Create manga
- `POST /api/admin/chapters` - Create chapter
- `PUT /api/admin/chapters/{id}/add-img` - Upload image

## Success Criteria

- [ ] Admin login with valid credentials
- [ ] Protected routes redirect unauthenticated users
- [ ] Fetch preview from Truyenvn/Vyvy sources
- [ ] Display preview with cover, name, chapters, status
- [ ] Crawl single manga to database
- [ ] Batch crawl multiple mangas
- [ ] Real-time progress tracking
- [ ] Responsive UI with dark mode

## References

- [PHASE_1_AUTH_AND_CRAWLER.md](../../docs/PHASE_1_AUTH_AND_CRAWLER.md)
- [API_ADMIN_DOCUMENTATION.md](../../docs/crawlers/API_ADMIN_DOCUMENTATION.md)
- [TruyenvnCrawler.php](../../docs/crawlers/TruyenvnCrawler.php)
- [VyvyCrawler.php](../../docs/crawlers/VyvyCrawler.php)
