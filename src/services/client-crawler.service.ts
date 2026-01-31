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
  pbkdf2Async,
  generateSlug
} from './crawlers'
import { genreService } from '@/services/genre.service'

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
  onProgress?: (progress: CrawlProgress) => void,
  selectedChapters?: string[] // Optional array of chapter names/ids to crawl
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

    // Process genres
    const genreIds: number[] = []
    if (detail.genres && detail.genres.length > 0) {
      onProgress?.({
        step: 'process_genres',
        current: 0,
        total: detail.genres.length,
        message: 'Processing genres...'
      })

      try {
        // Fetch all existing genres first
        // Note: For better performance in production, we might want to cache this or use a search endpoint
        // But since we need exact matching and creation, fetching all is safer for now (assuming not huge amount of genres)
        const allGenresResponse = await genreService.list({ perPage: 1000 })
        const allGenres = allGenresResponse.data

        for (const genreName of detail.genres) {
          if (!genreName.trim()) continue

          // Check if genre exists
          let genre = await genreService.findByName(genreName, allGenres)
          
          if (!genre) {
            // Create new genre
            try {
              const slug = generateSlug(genreName)
              genre = await genreService.create({ name: genreName, slug })
            } catch (e) {
               console.warn(`Failed to create genre: ${genreName}`, e)
            }
          }

          if (genre) {
            genreIds.push(genre.id)
          }
        }
      } catch (e) {
        console.warn('Failed to process genres', e)
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
      cover: coverBlob ? new File([coverBlob], 'cover.jpg', { type: 'image/jpeg' }) : undefined,
      genres: genreIds
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

  // Filter by selected chapters if provided
  if (selectedChapters && selectedChapters.length > 0) {
    chaptersToProcess = chaptersToProcess.filter(c => selectedChapters.includes(c.name))
  }

  if (exists && latestChapterOrder) {
    chaptersToProcess = chaptersToProcess.filter(c => (c.order || 0) > latestChapterOrder)
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

    // Check if chapter exists
    try {
      const { exists } = await mangaService.checkChapterExists(mangaId!, chapterInfo.order || 0)
      if (exists) {
        onProgress?.({
          step: 'skip_chapter',
          current: i + 1,
          total: totalChapters,
          message: `Chapter ${chapterInfo.name} exists. Skipping...`
        })
        continue
      }

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
      } else if (storage === 'hotlink') {
        onProgress?.({
          step: 'hotlink_save',
          current: 1,
          total: 1,
          message: `Chapter ${chapterInfo.name}: Saving content (hotlink)`
        })

        try {
          // Backend expects 'image_urls' array to join them with PHP_EOL
          await mangaService.updateChapter(chapter.id, { image_urls: images })
        } catch (error) {
          console.warn(`Failed to update content for chapter ${chapterInfo.name}:`, error)
        }
      }

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
