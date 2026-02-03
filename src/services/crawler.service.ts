import api from './api'
import type {
  CrawlerSource,
  StorageType,
  MangaDetail,
  PreviewRequest,
  PreviewResponse
} from '@/types/crawler.types'
import type { ApiResponse } from '@/types/api.types'
import { configService } from './config.service'

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
        baseUrl: configService.getTruyenVnUrl(),
        listPath: '/the-loai/truyen-tranh-18/page/'
      },
      vyvy: {
        name: 'VyvyComi',
        baseUrl: configService.getVyvyUrl(),
        listPath: '/the-loai/18/?page='
      },
      vinahentai: {
        name: 'VinaHentai',
        baseUrl: configService.getVinaHentaiUrl(),
        listPath: '/danh-sach?page='
      },
      vihentai: {
        name: 'ViHentai',
        baseUrl: configService.getViHentaiUrl(),
        listPath: '/danh-sach?page='
      }
    }
    return configs[source]
  }
}

export default crawlerService
