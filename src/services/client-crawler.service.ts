/**
 * Client-side Crawler Service
 * Refactored to use modular crawlers
 */

import type {
  CrawlerSource,
  StorageType,
  MangaDetail,
  PreviewResponse,
  MangaPreview
} from '@/types/crawler.types'
import { mangaService } from './manga.service'
import { 
  getCrawler, 
  fetchWithCorsProxy, 
  downloadImage, 
  pbkdf2Async 
} from './crawlers'

/**
 * Fetch and parse manga list from source
 */
export async function clientFetchPreview(
  source: CrawlerSource,
  startPage: number,
  endPage: number
): Promise<PreviewResponse> {
  const crawler = getCrawler(source)
  const allMangas: MangaPreview[] = []

  for (let page = startPage; page <= endPage; page++) {
    const url = crawler.getListUrl(page)
    console.log(`Fetching page ${page}: ${url}`)

    try {
      const html = await fetchWithCorsProxy(url)
      const mangas = crawler.parseList(html)

      console.log(`Page ${page}: Found ${mangas.length} mangas`)
      allMangas.push(...mangas)
    } catch (error) {
      console.error(`Failed to fetch page ${page}:`, error)
      throw new Error(`Failed to fetch page ${page}: ${(error as Error).message}`)
    }
  }

  // Remove duplicates by link
  const uniqueMangas = allMangas.filter(
    (manga, index, self) => index === self.findIndex((m) => m.link === manga.link)
  )

  return {
    mangas: uniqueMangas,
    totalPages: endPage - startPage + 1
  }
}

/**
 * Fetch manga detail from source
 */
export async function clientFetchMangaDetail(
  source: CrawlerSource,
  link: string
): Promise<MangaDetail> {
  console.log(`Fetching manga detail: ${link}`)
  const crawler = getCrawler(source)
  const html = await fetchWithCorsProxy(link)
  return crawler.parseDetail(html)
}

/**
 * Fetch chapter images from source
 */
export async function clientFetchChapterImages(
  source: CrawlerSource,
  link: string
): Promise<string[]> {
  console.log(`Fetching chapter images: ${link}`)
  const crawler = getCrawler(source)
  const html = await fetchWithCorsProxy(link)
  return crawler.parseChapterImages(html)
}

/**
 * Callback for crawl progress updates
 */
export interface CrawlProgress {
  step: string
  current: number
  total: number
  message: string
}

/**
 * Full crawl manga - creates manga and chapters via API
 */
export async function clientCrawlManga(
  source: CrawlerSource,
  storage: StorageType,
  mangaLink: string,
  onProgress?: (progress: CrawlProgress) => void
): Promise<{ mangaId: string; chaptersCreated: number }> {
  // Step 1: Fetch manga detail
  onProgress?.({
    step: 'fetch_detail',
    current: 0,
    total: 1,
    message: 'Fetching manga details...'
  })
  // Use the exported function which uses the crawler registry
  const detail = await clientFetchMangaDetail(source, mangaLink)

  // Check if manga exists
  const { exists, id: existingId, latestChapterOrder } = await mangaService.checkExists(detail.name)
  let mangaId = existingId

  // Step 2: Create manga if not exists
  if (!exists || !mangaId) {
    // Download cover image (required for new manga)
    let coverBlob: Blob | undefined
    if (detail.coverUrl) {
      onProgress?.({
        step: 'download_cover',
        current: 0,
        total: 1,
        message: 'Downloading cover image...'
      })
      try {
        coverBlob = await downloadImage(detail.coverUrl)
      } catch (error) {
        console.warn('Failed to download cover, will skip:', error)
      }
    }

    onProgress?.({
      step: 'create_manga',
      current: 0,
      total: 1,
      message: 'Creating manga...'
    })

    const manga = await mangaService.create({
      name: detail.name,
      name_alt: detail.nameAlt,
      status: String(detail.status || 2), // 1: Completed, 2: Ongoing
      description: detail.pilot,
      cover: coverBlob ? new File([coverBlob], 'cover.jpg', { type: 'image/jpeg' }) : undefined
      // Note: genres would need to be matched to existing genre IDs
    })
    mangaId = manga.id
  } else {
     onProgress?.({
      step: 'check_exists',
      current: 1,
      total: 1,
      message: `Manga exists (ID: ${mangaId}). Checking for new chapters...`
    })
  }

  // Step 4: Create chapters and add images
  // Filter chapters if manga exists
  let chaptersToProcess = detail.chapters
  if (exists && latestChapterOrder) {
    chaptersToProcess = detail.chapters.filter(c => (c.order || 0) > latestChapterOrder)
    if (chaptersToProcess.length === 0) {
      onProgress?.({
        step: 'up_to_date',
        current: 1,
        total: 1,
        message: 'All chapters are up to date.'
      })
      return { mangaId: mangaId!, chaptersCreated: 0 }
    }
  }

  const totalChapters = chaptersToProcess.length
  let chaptersCreated = 0

  for (let i = 0; i < chaptersToProcess.length; i++) {
    const chapterInfo = chaptersToProcess[i]

    onProgress?.({
      step: 'create_chapter',
      current: i + 1,
      total: totalChapters,
      message: `Processing chapter ${i + 1}/${totalChapters}: ${chapterInfo.name}`
    })

    try {
      // Create chapter
      const chapter = await mangaService.createChapter({
        name: chapterInfo.name,
        order: chapterInfo.order || 0,
        manga_id: mangaId!
      })

      // Fetch chapter images
      const images = await clientFetchChapterImages(source, chapterInfo.link)

      if (storage === 's3') {
        // Upload images one by one
        for (let j = 0; j < images.length; j++) {
          onProgress?.({
            step: 'upload_image',
            current: j + 1,
            total: images.length,
            message: `Chapter ${chapterInfo.name}: Uploading image ${j + 1}/${images.length}`
          })

          try {
            const imageBlob = await downloadImage(images[j])
            const imageFile = new File([imageBlob], `${j + 1}.jpg`, { type: 'image/jpeg' })
            await mangaService.addChapterImage(chapter.id, imageFile)
          } catch (error) {
            console.warn(`Failed to upload image ${j + 1} for chapter ${chapterInfo.name}:`, error)
          }
        }
      }
      // For hotlink mode, images are stored as URLs if backed supported it

      chaptersCreated++
    } catch (error) {
      console.error(`Failed to create chapter ${chapterInfo.name}:`, error)
    }
  }

  return {
    mangaId: mangaId!,
    chaptersCreated
  }
}

/**
 * Get source configuration
 */
export function getSourceConfig(source: CrawlerSource) {
  const crawler = getCrawler(source)
  return {
    name: crawler.name,
    baseUrl: crawler.baseUrl,
    listPath: crawler.listPath || ''
  }
}

export const clientCrawlerService = {
  fetchPreview: clientFetchPreview,
  fetchMangaDetail: clientFetchMangaDetail,
  fetchChapterImages: clientFetchChapterImages,
  crawlManga: clientCrawlManga,
  getSourceConfig,
  downloadImage,
  pbkdf2Async
}

export default clientCrawlerService
