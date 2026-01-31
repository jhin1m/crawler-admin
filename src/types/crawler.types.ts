export type CrawlerSource = 'truyenvn' | 'vyvy'
export type StorageType = 's3' | 'hotlink'
export type CrawlStatus = 'idle' | 'pending' | 'preparing' | 'selecting' | 'crawling' | 'success' | 'failed'

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
  dbChapterCount?: number
  crawlChapterCount?: number
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
  chapters?: ChapterInfo[]
  selectedChapters?: string[]
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
