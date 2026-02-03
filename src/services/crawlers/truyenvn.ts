import type { CrawlerImplementation } from './crawler.interface'
import type { MangaPreview, MangaDetail, ChapterInfo } from '@/types/crawler.types'
import { generateSlug, parseChapterNumber } from './utils'
import { configService } from '../config.service'

export class TruyenVnCrawler implements CrawlerImplementation {
  name = 'TruyenVN'
  get baseUrl() {
    return configService.getTruyenVnUrl()
  }
  listPath = '/the-loai/truyen-tranh-18/page/'

  isMatch(url: string): boolean {
    return url.includes('truyenvn')
  }

  getListUrl(page: number): string {
    return `${this.baseUrl}${this.listPath}${page}`
  }

  parseList(html: string): MangaPreview[] {
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

  parseDetail(html: string): MangaDetail {
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

  async parseChapterImages(html: string): Promise<string[]> {
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
}
