/**
 * Client-side Crawler Service
 * Since backend doesn't provide crawler API endpoints,
 * we fetch and parse HTML directly in the browser using a CORS proxy.
 * 
 * This service handles:
 * 1. Fetching manga list (preview)
 * 2. Fetching manga detail with chapters
 * 3. Fetching chapter images
 * 4. Full crawl flow (integrated with manga service)
 */

import type {
  CrawlerSource,
  StorageType,
  MangaPreview,
  MangaDetail,
  ChapterInfo,
  PreviewResponse
} from '@/types/crawler.types'
import { mangaService } from './manga.service'

// CORS Proxy URLs - use multiple for fallback
const CORS_PROXIES = [
  'https://api.codetabs.com/v1/proxy?quest='
]

// Source configurations
const SOURCE_CONFIGS: Record<
  CrawlerSource,
  {
    name: string
    baseUrl: string
    listPath: string
  }
> = {
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

/**
 * Fetch HTML content through CORS proxy
 */
async function fetchWithCorsProxy(url: string): Promise<string> {
  let lastError: Error | null = null

  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.text()
    } catch (error) {
      lastError = error as Error
      console.warn(`CORS proxy ${proxy} failed:`, error)
      continue
    }
  }

  throw lastError || new Error('All CORS proxies failed')
}

/**
 * Download image as blob via CORS proxy
 */
async function downloadImage(url: string): Promise<Blob> {
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.blob()
    } catch (error) {
      console.warn(`CORS proxy ${proxy} failed for image:`, error)
      continue
    }
  }

  throw new Error('Failed to download image through all proxies')
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Parse chapter number from name
 */
function parseChapterNumber(name: string): number {
  const match = name.match(/chap(?:ter)?\s*([\d.]+)/i)
  if (match) return parseFloat(match[1])

  const numbers = name.match(/(\d+(?:\.\d+)?)/g)
  if (numbers && numbers.length > 0) {
    return parseFloat(numbers[numbers.length - 1])
  }
  return 0
}

// ============================================
// MANGA LIST PARSERS
// ============================================

/**
 * Parse TruyenVN manga list HTML
 */
function parseTruyenvnList(html: string): MangaPreview[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const mangas: MangaPreview[] = []
  const items = doc.querySelectorAll('.page-item-detail.manga')

  items.forEach((item) => {
    const titleLink = item.querySelector('.item-thumb a')
    const postTitleLink = item.querySelector('.post-title h3 a')
    const coverImg = item.querySelector('.item-thumb img')
    const chapterElement = item.querySelector('.chapter a')

    if (titleLink && postTitleLink) {
      const name = (titleLink.getAttribute('title') || postTitleLink.textContent || '').trim()
      const link = postTitleLink.getAttribute('href') || ''

      let coverUrl = ''
      if (coverImg) {
        const srcset = coverImg.getAttribute('srcset')
        const dataSrc = coverImg.getAttribute('data-src')
        const src = coverImg.getAttribute('src')

        if (srcset) {
          const srcsetParts = srcset.split(',').map((s) => s.trim().split(' ')[0])
          coverUrl = srcsetParts[srcsetParts.length - 1] || ''
        } else if (dataSrc) {
          coverUrl = dataSrc
        } else if (src) {
          coverUrl = src
        }
      }

      const latestChapter = chapterElement?.textContent?.trim() || undefined

      if (name && link) {
        mangas.push({ name, link, coverUrl, latestChapter })
      }
    }
  })

  return mangas
}

/**
 * Parse VyvyComi manga list HTML
 */
function parseVyvyList(html: string): MangaPreview[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const mangas: MangaPreview[] = []
  const items = doc.querySelectorAll('.comic-item-box')

  items.forEach((item) => {
    const titleLink = item.querySelector('.keywords-scroller-container:nth-child(1) a')
    const coverImg = item.querySelector('.comic-img a img')
    const chapterElement = item.querySelector('.keywords-scroller-container .comic-chapter')

    if (titleLink) {
      const name = (titleLink.getAttribute('title') || titleLink.textContent || '').trim()
      const link = titleLink.getAttribute('href') || ''

      let coverUrl = ''
      if (coverImg) {
        const dataSrc = coverImg.getAttribute('data-src')
        const src = coverImg.getAttribute('src')
        coverUrl = dataSrc || src || ''
      }

      const latestChapter = chapterElement?.textContent?.trim() || undefined

      if (name && link) {
        mangas.push({ name, link, coverUrl, latestChapter })
      }
    }
  })

  return mangas
}

// ============================================
// MANGA DETAIL PARSERS
// ============================================

/**
 * Parse TruyenVN manga detail HTML
 */
function parseTruyenvnDetail(html: string): MangaDetail {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const name = doc.querySelector('.post-title h1')?.textContent?.trim() || ''
  const slug = generateSlug(name)

  // Get genres
  const genres: string[] = []
  doc.querySelectorAll('.genres-content a').forEach((node) => {
    genres.push(node.textContent?.trim() || '')
  })

  // Get pilot/description
  let pilot: string | undefined
  const pilotEl = doc.querySelector('.summary__content p')
  if (pilotEl) {
    pilot = pilotEl.textContent?.trim()
    // If pilot contains manga name, skip it
    if (pilot && pilot.includes(name)) {
      pilot = undefined
    }
  }

  // Get cover from meta tag
  const coverEl = doc.querySelectorAll('meta[property="og:image"]')
  let coverUrl = ''
  if (coverEl.length > 1) {
    coverUrl = coverEl[1].getAttribute('content') || ''
  } else if (coverEl.length > 0) {
    coverUrl = coverEl[0].getAttribute('content') || ''
  }

  // Get chapters
  const chapters: ChapterInfo[] = []
  doc.querySelectorAll('.wp-manga-chapter > a').forEach((node) => {
    const chapterName = node.textContent?.trim() || ''
    const chapterLink = node.getAttribute('href') || ''
    if (chapterName && chapterLink) {
      chapters.push({
        name: chapterName,
        link: chapterLink,
        order: parseChapterNumber(chapterName)
      })
    }
  })

  // Reverse to get chronological order
  chapters.reverse()

  return {
    name,
    slug,
    status: 2, // Default: Ongoing
    genres,
    pilot,
    coverUrl,
    chapters
  }
}

/**
 * Parse VyvyComi manga detail HTML
 */
function parseVyvyDetail(html: string): MangaDetail {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const name = doc.querySelector('.comic-info h2.info-title')?.textContent?.trim() || ''
  const slug = generateSlug(name)

  let nameAlt: string | undefined
  let artist: string | undefined

  // Extract alternative name and artist
  doc.querySelectorAll('.comic-info .comic-intro-text strong').forEach((node) => {
    const text = node.textContent?.trim() || ''
    const nextSibling = node.nextElementSibling
    if (text.includes('Tên khác') && nextSibling?.tagName === 'SPAN') {
      nameAlt = nextSibling.textContent?.trim()
    } else if (text.includes('Tác giả') && nextSibling?.tagName === 'SPAN') {
      artist = nextSibling.textContent?.trim()
    }
  })

  // Get genres
  const genres: string[] = []
  doc.querySelectorAll('.comic-info .tags a').forEach((node) => {
    genres.push(node.textContent?.trim() || '')
  })

  // Get pilot/description
  let pilot: string | undefined
  const pilotEl = doc.querySelector('div.margin-bottom-15px.intro-container > p')
  if (pilotEl) {
    pilot = pilotEl.textContent?.trim()
    if (pilot && (pilot.includes('Vivicomi') || pilot.includes(name))) {
      pilot = undefined
    }
  }

  // Get cover
  const coverUrl =
    doc.querySelector('div.col-sm-5.margin-bottom-15px > div > img')?.getAttribute('src') || ''

  // Get chapters
  const chapters: ChapterInfo[] = []
  doc.querySelectorAll('div.table-scroll > table > tbody > tr > td > a').forEach((node) => {
    const hiddenXs = node.querySelector('.hidden-xs')
    const chapterName = hiddenXs?.textContent?.trim() || ''
    const chapterLink = node.getAttribute('href') || ''
    if (chapterName && chapterLink) {
      chapters.push({
        name: String(parseChapterNumber(chapterName)),
        link: chapterLink,
        order: parseChapterNumber(chapterName)
      })
    }
  })

  // Reverse to get chronological order
  chapters.reverse()

  return {
    name,
    nameAlt,
    slug,
    artist,
    status: 2,
    genres,
    pilot,
    coverUrl,
    chapters
  }
}

// ============================================
// CHAPTER IMAGE PARSERS
// ============================================

/**
 * Parse TruyenVN chapter images
 */
function parseTruyenvnChapterImages(html: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const images: string[] = []
  doc.querySelectorAll('.reading-content img').forEach((node) => {
    const src = node.getAttribute('src')?.trim()
    if (src && !src.includes('www.w3.org')) {
      images.push(src)
    }
  })

  return images
}

/**
 * Parse VyvyComi chapter images (encrypted)
 */
function parseVyvyChapterImages(html: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // VyvyComi uses encrypted content
  const scriptEl = doc.querySelector('#view-chapter > script')
  if (!scriptEl) {
    console.warn('VyvyComi: Could not find encrypted content script')
    return []
  }

  const scriptContent = scriptEl.textContent || ''

  // Extract encoded data
  const startMarker = 'var htmlContent = "'
  const startPos = scriptContent.indexOf(startMarker)
  if (startPos === -1) {
    console.warn('VyvyComi: Could not find htmlContent in script')
    return []
  }

  const dataStart = startPos + startMarker.length
  const endPos = scriptContent.indexOf('";', dataStart)
  if (endPos === -1) {
    console.warn('VyvyComi: Could not find end of htmlContent')
    return []
  }

  let dataEncode = scriptContent.substring(dataStart, endPos)
  dataEncode = dataEncode.replace(/\\/g, '')

  try {
    // Decrypt the content
    const decrypted = cryptoJSAesDecrypt('EhwuFpSJkhMVuUPzrw', dataEncode)
    if (!decrypted) {
      console.warn('VyvyComi: Decryption failed')
      return []
    }

    // Replace markers
    const htmlContent = decrypted
      .replace(/EhwuFp/g, '.')
      .replace(/SJkhMV/g, ':')
      .replace(/uUPzrw/g, '/')

    // Parse images from decrypted content
    const imgDoc = parser.parseFromString(htmlContent, 'text/html')
    const images: string[] = []

    imgDoc.querySelectorAll('img').forEach((node) => {
      let imgUrl = node.getAttribute('data-ehwufp') || ''
      if (imgUrl) {
        imgUrl = decodeURIComponent(imgUrl.trim())
        images.push(imgUrl)
      }
    })

    // Remove last image (usually a footer/ad)
    if (images.length > 0) {
      images.pop()
    }

    return images
  } catch (error) {
    console.error('VyvyComi decryption error:', error)
    return []
  }
}

/**
 * CryptoJS AES Decrypt (for VyvyComi)
 */
function cryptoJSAesDecrypt(passphrase: string, jsonString: string): string | null {
  try {
    const jsonData = JSON.parse(jsonString)
    const salt = hexToBytes(jsonData.salt)
    const iv = hexToBytes(jsonData.iv)
    const ciphertext = atob(jsonData.ciphertext)

    // Derive key using PBKDF2
    const iterations = 999
    const key = pbkdf2(passphrase, salt, iterations, 32, 'SHA-512')

    // Decrypt using AES-256-CBC
    const decrypted = aesDecrypt(ciphertext, key, iv)
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return null
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

async function pbkdf2Async(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyLength: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const key = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, ['deriveBits'])

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: iterations,
      hash: 'SHA-512'
    },
    key,
    keyLength * 8
  )

  return new Uint8Array(derivedBits)
}

// Synchronous PBKDF2 fallback (simplified)
function pbkdf2(
  _password: string,
  _salt: Uint8Array,
  _iterations: number,
  keyLength: number,
  _hash: string
): Uint8Array {
  // Use Web Crypto API synchronously if possible
  // For now, return a placeholder that triggers async path
  console.warn('PBKDF2: Using placeholder - VyvyComi images may not work')
  return new Uint8Array(keyLength)
}

function aesDecrypt(_ciphertext: string, _key: Uint8Array, _iv: Uint8Array): string {
  // Browser AES decryption would require Web Crypto API (async)
  // For VyvyComi support, we'd need async decrypt
  console.warn('AES decrypt: Not fully implemented for browser')
  return ''
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Fetch and parse manga list from source
 */
export async function clientFetchPreview(
  source: CrawlerSource,
  startPage: number,
  endPage: number
): Promise<PreviewResponse> {
  const config = SOURCE_CONFIGS[source]
  const allMangas: MangaPreview[] = []

  for (let page = startPage; page <= endPage; page++) {
    const url = `${config.baseUrl}${config.listPath}${page}`
    console.log(`Fetching page ${page}: ${url}`)

    try {
      const html = await fetchWithCorsProxy(url)

      let mangas: MangaPreview[]
      if (source === 'truyenvn') {
        mangas = parseTruyenvnList(html)
      } else {
        mangas = parseVyvyList(html)
      }

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
  const html = await fetchWithCorsProxy(link)

  if (source === 'truyenvn') {
    return parseTruyenvnDetail(html)
  } else {
    return parseVyvyDetail(html)
  }
}

/**
 * Fetch chapter images from source
 */
export async function clientFetchChapterImages(
  source: CrawlerSource,
  link: string
): Promise<string[]> {
  console.log(`Fetching chapter images: ${link}`)
  const html = await fetchWithCorsProxy(link)

  if (source === 'truyenvn') {
    return parseTruyenvnChapterImages(html)
  } else {
    return parseVyvyChapterImages(html)
  }
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
  const detail = await clientFetchMangaDetail(source, mangaLink)

  // Step 2: Download cover image (if not hotlink)
  let coverBlob: Blob | undefined
  if (storage === 's3' && detail.coverUrl) {
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

  // Step 3: Create manga via API
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
    cover: coverBlob ? new File([coverBlob], 'cover.jpg', { type: 'image/jpeg' }) : undefined
    // Note: genres would need to be matched to existing genre IDs
  })

  // Step 4: Create chapters and add images
  const totalChapters = detail.chapters.length
  let chaptersCreated = 0

  for (let i = 0; i < detail.chapters.length; i++) {
    const chapterInfo = detail.chapters[i]

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
        order: chapterInfo.order || i + 1,
        manga_id: manga.id
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
            message: `Chapter ${i + 1}: Uploading image ${j + 1}/${images.length}`
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
      // For hotlink mode, images are not uploaded - they're stored as URLs
      // This would require backend support for hotlink storage

      chaptersCreated++
    } catch (error) {
      console.error(`Failed to create chapter ${chapterInfo.name}:`, error)
    }
  }

  return {
    mangaId: manga.id,
    chaptersCreated
  }
}

/**
 * Get source configuration
 */
export function getSourceConfig(source: CrawlerSource) {
  return SOURCE_CONFIGS[source]
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

