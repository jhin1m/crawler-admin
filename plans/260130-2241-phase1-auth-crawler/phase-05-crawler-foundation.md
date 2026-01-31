# Phase 5: Crawler Foundation

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: [Phase 4: Layout](./phase-04-layout.md)
- **API Docs**: [API_ADMIN_DOCUMENTATION.md](../../docs/crawlers/API_ADMIN_DOCUMENTATION.md)
- **Crawler Refs**: [TruyenvnCrawler.php](../../docs/crawlers/TruyenvnCrawler.php), [VyvyCrawler.php](../../docs/crawlers/VyvyCrawler.php)

## Overview

| Field | Value |
|-------|-------|
| Duration | 1.5 days |
| Priority | P1 |
| Status | pending |
| Effort | 12h |

## Key Insights

1. **No dedicated crawler API endpoints** - Must build client-side scraping or backend proxy
2. Crawler fetches manga list from external sites (TruyenVN, VyvyComi)
3. Check manga exists via `GET /api/admin/mangas?filter[name]=...`
4. Crawl = Create manga + chapters + upload images
5. PHP crawlers use Symfony DomCrawler for HTML parsing

## Requirements

### Crawler Architecture Decision

**Option A: Client-side scraping (CORS issues likely)**
- Fetch directly from external sites
- Requires CORS proxy or browser extension
- Not recommended for production

**Option B: Backend proxy (Recommended)**
- Frontend sends source + page to backend
- Backend fetches and parses HTML, returns structured data
- Bypasses CORS, more reliable

**Assumption**: Backend will provide crawler endpoints:
```
POST /api/admin/crawlers/preview  - Fetch preview list
POST /api/admin/crawlers/detail   - Fetch manga detail
POST /api/admin/crawlers/crawl    - Execute crawl
```

If backend endpoints don't exist, need to clarify with team.

### Data Flow

```
[Select Source] --> [Set Page Range] --> [Fetch Preview]
                                              |
                                              v
                                    [Backend fetches HTML]
                                              |
                                              v
                                    [Return MangaPreview[]]
                                              |
                                              v
                                    [Check each if exists in DB]
                                              |
                                              v
                                    [Display in PreviewTable]
```

### Crawl Flow

```
[Select Mangas] --> [Start Crawl]
                          |
                          v
              [For each manga:]
              1. Fetch manga detail
              2. Download/hotlink cover
              3. Create manga via API
              4. For each chapter:
                 a. Fetch chapter images
                 b. Create chapter
                 c. Upload images
              5. Update progress
```

## Architecture

### Type Definitions

```typescript
// Crawler source types
type CrawlerSource = 'truyenvn' | 'vyvy'
type StorageType = 's3' | 'hotlink'
type CrawlStatus = 'idle' | 'pending' | 'crawling' | 'success' | 'failed'

// Preview data from crawler
interface MangaPreview {
  name: string
  nameAlt?: string
  link: string
  coverUrl: string
  latestChapter?: string
  chapterCount?: number
  exists?: boolean      // Set after DB check
  existingId?: string   // If exists, the manga ID
}

// Full manga detail for crawling
interface MangaDetail {
  name: string
  nameAlt?: string
  slug: string
  artist?: string
  status: number
  genres: string[]
  pilot?: string
  coverUrl: string
  chapters: ChapterInfo[]
}

interface ChapterInfo {
  name: string
  link: string
  order?: number
}

// Crawl job state
interface CrawlJob {
  manga: MangaPreview
  status: CrawlStatus
  progress: number      // 0-100
  currentStep?: string  // "Creating manga", "Uploading chapter 1/10"
  error?: string
}

// Crawler config
interface CrawlerConfig {
  source: CrawlerSource
  storage: StorageType
  startPage: number
  endPage: number
}
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/types/crawler.types.ts` | Crawler type definitions |
| `src/services/crawler.service.ts` | Crawler API methods |
| `src/services/manga.service.ts` | Manga CRUD API methods |
| `src/hooks/use-crawler.ts` | Crawler state and operations |

## Implementation Steps

### Step 1: Create Crawler Types (45 min)

**src/types/crawler.types.ts**

```typescript
export type CrawlerSource = 'truyenvn' | 'vyvy'
export type StorageType = 's3' | 'hotlink'
export type CrawlStatus = 'idle' | 'pending' | 'crawling' | 'success' | 'failed'

export interface CrawlerConfig {
  source: CrawlerSource
  storage: StorageType
  startPage: number
  endPage: number
}

export interface MangaPreview {
  id?: string           // Temporary client ID
  name: string
  nameAlt?: string
  link: string
  coverUrl: string
  latestChapter?: string
  chapterCount?: number
  exists?: boolean
  existingId?: string
}

export interface MangaDetail {
  name: string
  nameAlt?: string
  slug: string
  artist?: string
  status: number
  genres: string[]
  pilot?: string
  coverUrl: string
  chapters: ChapterInfo[]
}

export interface ChapterInfo {
  name: string
  link: string
  order?: number
  images?: string[]
}

export interface CrawlJob {
  manga: MangaPreview
  status: CrawlStatus
  progress: number
  currentStep?: string
  error?: string
  createdMangaId?: string
}

export interface CrawlerState {
  config: CrawlerConfig
  previews: MangaPreview[]
  selectedIds: string[]
  jobs: CrawlJob[]
  isLoading: boolean
  isCrawling: boolean
  error?: string
}

// API request/response types
export interface PreviewRequest {
  source: CrawlerSource
  startPage: number
  endPage: number
}

export interface PreviewResponse {
  mangas: MangaPreview[]
  totalPages: number
}

export interface CrawlRequest {
  source: CrawlerSource
  storage: StorageType
  mangaLink: string
}

export interface CrawlResponse {
  mangaId: string
  chaptersCreated: number
}
```

### Step 2: Create Manga Service (60 min)

**src/services/manga.service.ts**

```typescript
import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'

export interface Manga {
  id: string
  name: string
  name_alt?: string
  slug: string
  status: string
  cover: string
  is_reviewed: boolean
  created_at: string
}

export interface CreateMangaData {
  name: string
  name_alt?: string
  artist_id?: string
  group_id?: string
  status?: string
  cover?: File
  genres?: number[]
}

export interface Chapter {
  id: string
  name: string
  order: number
  manga_id: string
  views: number
  created_at: string
}

export interface CreateChapterData {
  name: string
  order: number
  manga_id: string
}

export const mangaService = {
  // List mangas with optional filters
  async list(params?: {
    page?: number
    perPage?: number
    filter?: Record<string, string>
    include?: string
  }): Promise<PaginatedResponse<Manga>> {
    const response = await api.get('/mangas', { params })
    return response.data
  },

  // Get manga by ID
  async get(id: string): Promise<Manga> {
    const response = await api.get<ApiResponse<Manga>>(`/mangas/${id}`)
    return response.data.data
  },

  // Check if manga exists by name
  async checkExists(name: string): Promise<{ exists: boolean; id?: string }> {
    const response = await api.get<PaginatedResponse<Manga>>('/mangas', {
      params: {
        'filter[name]': name,
        per_page: 1
      }
    })

    if (response.data.data && response.data.data.length > 0) {
      return { exists: true, id: response.data.data[0].id }
    }
    return { exists: false }
  },

  // Create new manga
  async create(data: CreateMangaData): Promise<Manga> {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.name_alt) formData.append('name_alt', data.name_alt)
    if (data.artist_id) formData.append('artist_id', data.artist_id)
    if (data.group_id) formData.append('group_id', data.group_id)
    if (data.status) formData.append('status', data.status)
    if (data.cover) formData.append('cover', data.cover)
    if (data.genres) {
      data.genres.forEach((g, i) => formData.append(`genres[${i}]`, String(g)))
    }

    const response = await api.post<ApiResponse<Manga>>('/mangas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.data
  },

  // Create chapter
  async createChapter(data: CreateChapterData): Promise<Chapter> {
    const response = await api.post<ApiResponse<Chapter>>('/chapters', data)
    return response.data.data
  },

  // Add image to chapter
  async addChapterImage(chapterId: string, image: File | Blob): Promise<void> {
    const formData = new FormData()
    formData.append('image', image)

    await api.put(`/chapters/${chapterId}/add-img`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Batch add images (upload one by one)
  async addChapterImages(
    chapterId: string,
    images: (File | Blob)[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < images.length; i++) {
      await this.addChapterImage(chapterId, images[i])
      onProgress?.(i + 1, images.length)
    }
  }
}
```

### Step 3: Create Crawler Service (90 min)

**src/services/crawler.service.ts**

```typescript
import api from './api'
import type {
  CrawlerSource,
  StorageType,
  MangaPreview,
  MangaDetail,
  PreviewRequest,
  PreviewResponse
} from '@/types/crawler.types'
import type { ApiResponse } from '@/types/api.types'

/**
 * Note: These endpoints assume backend provides crawler proxy.
 * If not available, implement client-side with CORS proxy.
 */
export const crawlerService = {
  // Fetch preview list from source
  async fetchPreview(request: PreviewRequest): Promise<PreviewResponse> {
    const response = await api.post<ApiResponse<PreviewResponse>>(
      '/crawlers/preview',
      request
    )
    return response.data.data
  },

  // Fetch detailed manga info including chapters
  async fetchDetail(source: CrawlerSource, link: string): Promise<MangaDetail> {
    const response = await api.post<ApiResponse<MangaDetail>>(
      '/crawlers/detail',
      { source, link }
    )
    return response.data.data
  },

  // Fetch chapter images
  async fetchChapterImages(
    source: CrawlerSource,
    link: string
  ): Promise<string[]> {
    const response = await api.post<ApiResponse<{ images: string[] }>>(
      '/crawlers/chapter-images',
      { source, link }
    )
    return response.data.data.images
  },

  // Download image and return blob
  async downloadImage(url: string): Promise<Blob> {
    const response = await api.get('/crawlers/proxy-image', {
      params: { url },
      responseType: 'blob'
    })
    return response.data
  },

  // Execute full crawl (backend handles everything)
  async crawlManga(
    source: CrawlerSource,
    storage: StorageType,
    link: string
  ): Promise<{ mangaId: string; chaptersCreated: number }> {
    const response = await api.post<
      ApiResponse<{ mangaId: string; chaptersCreated: number }>
    >('/crawlers/crawl', {
      source,
      storage,
      link
    })
    return response.data.data
  }
}

/**
 * Fallback: Client-side crawling utilities
 * Use if backend crawler endpoints not available
 */
export const crawlerUtils = {
  // Generate unique ID for preview items
  generateId(): string {
    return `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  // Parse chapter number from name
  parseChapterNumber(name: string): number {
    const match = name.match(/chap(?:ter)?\s*([\d.]+)/i)
    if (match) return parseFloat(match[1])

    const numbers = name.match(/(\d+(?:\.\d+)?)/g)
    if (numbers && numbers.length > 0) {
      return parseFloat(numbers[numbers.length - 1])
    }
    return 0
  },

  // Get source config
  getSourceConfig(source: CrawlerSource) {
    const configs = {
      truyenvn: {
        name: 'TruyenVN',
        baseUrl: 'https://truyenvn.shop',
        listPath: '/the-loai/truyen-tranh-18/page/'
      },
      vyvy: {
        name: 'VyvyComi',
        baseUrl: 'https://vivicomi14.info',
        listPath: '/the-loai/18/?page='
      }
    }
    return configs[source]
  }
}
```

### Step 4: Create Crawler Hook (90 min)

**src/hooks/use-crawler.ts**

```typescript
import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { crawlerService, crawlerUtils } from '@/services/crawler.service'
import { mangaService } from '@/services/manga.service'
import type {
  CrawlerSource,
  StorageType,
  CrawlerConfig,
  MangaPreview,
  CrawlJob,
  CrawlStatus,
  CrawlerState
} from '@/types/crawler.types'

const defaultConfig: CrawlerConfig = {
  source: 'truyenvn',
  storage: 's3',
  startPage: 1,
  endPage: 1
}

export function useCrawler() {
  const queryClient = useQueryClient()

  // State
  const [config, setConfig] = useState<CrawlerConfig>(defaultConfig)
  const [previews, setPreviews] = useState<MangaPreview[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [jobs, setJobs] = useState<CrawlJob[]>([])

  // Fetch preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const result = await crawlerService.fetchPreview({
        source: config.source,
        startPage: config.startPage,
        endPage: config.endPage
      })
      return result
    },
    onSuccess: async (data) => {
      // Add unique IDs to previews
      const previewsWithIds = data.mangas.map((m) => ({
        ...m,
        id: crawlerUtils.generateId()
      }))

      // Check which mangas already exist
      const checkedPreviews = await Promise.all(
        previewsWithIds.map(async (preview) => {
          const { exists, id } = await mangaService.checkExists(preview.name)
          return { ...preview, exists, existingId: id }
        })
      )

      setPreviews(checkedPreviews)
      setSelectedIds([])
      toast.success(`Loaded ${checkedPreviews.length} mangas`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to fetch preview: ${error.message}`)
    }
  })

  // Crawl single manga mutation
  const crawlMutation = useMutation({
    mutationFn: async (manga: MangaPreview) => {
      return crawlerService.crawlManga(
        config.source,
        config.storage,
        manga.link
      )
    }
  })

  // Update config
  const updateConfig = useCallback(
    (updates: Partial<CrawlerConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  // Toggle selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }, [])

  // Select all (only new mangas)
  const selectAll = useCallback(() => {
    const newMangaIds = previews
      .filter((p) => !p.exists)
      .map((p) => p.id!)
    setSelectedIds(newMangaIds)
  }, [previews])

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds([])
  }, [])

  // Fetch preview
  const fetchPreview = useCallback(() => {
    previewMutation.mutate()
  }, [previewMutation])

  // Start crawling selected mangas
  const startCrawl = useCallback(async () => {
    const selected = previews.filter((p) => selectedIds.includes(p.id!))
    if (selected.length === 0) {
      toast.warning('No mangas selected')
      return
    }

    // Initialize jobs
    const initialJobs: CrawlJob[] = selected.map((manga) => ({
      manga,
      status: 'pending' as CrawlStatus,
      progress: 0
    }))
    setJobs(initialJobs)

    // Process each manga
    for (let i = 0; i < selected.length; i++) {
      const manga = selected[i]

      // Update job status
      setJobs((prev) =>
        prev.map((j, idx) =>
          idx === i
            ? { ...j, status: 'crawling' as CrawlStatus, currentStep: 'Starting...' }
            : j
        )
      )

      try {
        const result = await crawlerService.crawlManga(
          config.source,
          config.storage,
          manga.link
        )

        // Mark success
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? {
                  ...j,
                  status: 'success' as CrawlStatus,
                  progress: 100,
                  createdMangaId: result.mangaId,
                  currentStep: `Done: ${result.chaptersCreated} chapters`
                }
              : j
          )
        )

        // Update preview to show exists
        setPreviews((prev) =>
          prev.map((p) =>
            p.id === manga.id
              ? { ...p, exists: true, existingId: result.mangaId }
              : p
          )
        )
      } catch (error) {
        // Mark failed
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? {
                  ...j,
                  status: 'failed' as CrawlStatus,
                  error: (error as Error).message
                }
              : j
          )
        )
      }
    }

    toast.success('Crawl batch completed')
    setSelectedIds([])
  }, [previews, selectedIds, config, crawlerService])

  // Crawl single manga
  const crawlSingle = useCallback(
    async (manga: MangaPreview) => {
      const job: CrawlJob = {
        manga,
        status: 'crawling',
        progress: 0,
        currentStep: 'Starting...'
      }
      setJobs([job])

      try {
        const result = await crawlerService.crawlManga(
          config.source,
          config.storage,
          manga.link
        )

        setJobs([
          {
            ...job,
            status: 'success',
            progress: 100,
            createdMangaId: result.mangaId,
            currentStep: `Done: ${result.chaptersCreated} chapters`
          }
        ])

        setPreviews((prev) =>
          prev.map((p) =>
            p.id === manga.id
              ? { ...p, exists: true, existingId: result.mangaId }
              : p
          )
        )

        toast.success(`Crawled: ${manga.name}`)
      } catch (error) {
        setJobs([
          {
            ...job,
            status: 'failed',
            error: (error as Error).message
          }
        ])
        toast.error(`Failed: ${(error as Error).message}`)
      }
    },
    [config]
  )

  // Clear jobs
  const clearJobs = useCallback(() => {
    setJobs([])
  }, [])

  // Computed values
  const isLoading = previewMutation.isPending
  const isCrawling = jobs.some((j) => j.status === 'crawling')
  const selectedCount = selectedIds.length
  const newCount = previews.filter((p) => !p.exists).length

  return {
    // State
    config,
    previews,
    selectedIds,
    jobs,
    isLoading,
    isCrawling,

    // Computed
    selectedCount,
    newCount,

    // Actions
    updateConfig,
    fetchPreview,
    toggleSelect,
    selectAll,
    deselectAll,
    startCrawl,
    crawlSingle,
    clearJobs
  }
}
```

## Todo List

- [x] Create src/types/crawler.types.ts
- [x] Create src/services/manga.service.ts
- [x] Create src/services/crawler.service.ts
- [x] Create src/hooks/use-crawler.ts
- [x] Create src/services/client-crawler.service.ts (Client-side HTML scraping)
- [x] Implement full client-side crawl flow (no backend crawl API)
- [ ] Test manga exists check API call
- [ ] Verify type definitions match API responses

## Implementation Notes

### Client-Side Crawler (2026-01-30)

Since backend doesn't provide `/api/admin/crawlers/preview` or `/api/admin/crawlers/crawl` endpoints, implemented **full client-side crawling**:

- **File**: `src/services/client-crawler.service.ts`
- **Approach**: Uses CORS proxies to fetch HTML from external sites, then parses with DOMParser
- **CORS Proxies**: `allorigins.win`, `corsproxy.io`, `codetabs.com` (fallback chain)

**Features implemented**:
1. `fetchPreview()` - Fetch and parse manga list from source pages
2. `fetchMangaDetail()` - Fetch manga detail page and parse chapters
3. `fetchChapterImages()` - Fetch chapter page and parse image URLs
4. `crawlManga()` - Full crawl flow:
   - Fetch manga detail
   - Download cover image via CORS proxy
   - Create manga via `POST /api/admin/mangas`
   - For each chapter:
     - Create chapter via `POST /api/admin/chapters`
     - Download images via CORS proxy
     - Upload images via `PUT /api/admin/chapters/{id}/add-img`
5. Progress callback support for real-time updates

**Parsers**:
- TruyenVN: `.page-item-detail.manga`, `.wp-manga-chapter`, `.reading-content img`
- VyvyComi: `.comic-item-box`, `div.table-scroll`, encrypted chapter images (partially implemented)

**Note**: VyvyComi chapter images use AES encryption which is not fully implemented in browser JS.

The `use-crawler.ts` hook now uses `clientCrawlerService` for both preview and crawl operations.

## Success Criteria

- [x] Crawler types cover all use cases
- [ ] mangaService.checkExists returns correct boolean
- [x] crawlerService methods handle errors gracefully
- [x] useCrawler hook manages state correctly
- [ ] Selection logic works (select/deselect/selectAll)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| No crawler API endpoints | Critical | ✅ Implemented client-side with CORS proxy |
| API response format differs | High | Log responses, adjust types |
| Race conditions in batch crawl | Medium | Process sequentially, not parallel |
| CORS proxy unavailable | Medium | Multiple fallback proxies |
| VyvyComi encryption | Medium | Works for TruyenVN; VyvyComi partially supported |

## Security Considerations

- Don't expose crawler source URLs in client code
- Validate manga links before crawling
- Rate limit API calls to avoid overloading backend
- Handle image upload size limits

## Unresolved Questions

1. ~~**Does backend provide crawler endpoints?**~~ No - using client-side solution
2. ~~**Image storage**: S3 upload handled by backend or frontend?~~ Frontend downloads, backend stores
3. **Rate limiting**: What's the safe crawl rate?
4. ~~**Progress updates**: WebSocket or polling for real-time progress?~~ Using callback in crawlManga()

## Next Steps

After completion, proceed to [Phase 6: Crawler UI - Control & Preview](./phase-06-crawler-ui-control.md)

