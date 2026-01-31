import type { MangaPreview, MangaDetail } from '@/types/crawler.types'

export interface CrawlerImplementation {
  name: string
  baseUrl: string
  listPath?: string
  isMatch(url: string): boolean
  getListUrl(page: number): string
  parseList(html: string): MangaPreview[]
  parseDetail(html: string): MangaDetail
  parseChapterImages(html: string): string[]
}
