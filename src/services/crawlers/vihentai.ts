import type { CrawlerImplementation } from './crawler.interface'
import type { MangaPreview, MangaDetail, ChapterInfo } from '@/types/crawler.types'
import { generateSlug, parseChapterNumber } from './utils'
import { configService } from '../config.service'

export class ViHentaiCrawler implements CrawlerImplementation {
  name = 'ViHentai'
  get baseUrl() {
    return configService.getViHentaiUrl()
  }
  listPath = 'danh-sach?page='

  isMatch(url: string): boolean {
    return url.includes('vi-hentai')
  }

  getListUrl(page: number): string {
    return `${this.baseUrl}/${this.listPath}${page}`
  }

  parseList(html: string): MangaPreview[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const mangas: MangaPreview[] = []
    
    // Pattern: <a href="/truyen/{slug}">Tên truyện</a>
    const links = doc.querySelectorAll('a[href*="/truyen/"]')
    
    links.forEach((linkEl) => {
      const href = linkEl.getAttribute('href') || ''
      const name = linkEl.textContent?.trim() || ''

      // Skip invalid or chapter links (PHP regex: /\/(truyen\/[^\/]+)\//)
      // Basically, if it has more than one slash after 'truyen', it's likely a chapter or something else deep
      if (!name || href.match(/\/truyen\/[^/]+\//)) {
        return
      }

      // Check for main manga link format: /truyen/{slug}
      // PHP regex: /^\/truyen\/([^\/]+)$/
       const match = href.match(/\/truyen\/([^/]+)$/)
      if (match) {
        // Try to find cover image if possible in list view
        let coverUrl = ''
        // Look in parent containers for image
        // Usually list items are wrapped in a container
        const container = linkEl.closest('div') || linkEl.parentElement
        if (container) {
          const img = container.querySelector('img')
          if (img) {
             coverUrl = img.getAttribute('data-src') || img.getAttribute('src') || ''
             // Handle relative URLs or background styles if needed
             // Based on PHP details parser, cover might be in style background-image
             if (!coverUrl) {
                const style = container.getAttribute('style') || ''
                const bgMatch = style.match(/url\(['"]?(.*?)?['"]?\)/)
                if (bgMatch) coverUrl = bgMatch[1]
             }
          }
        }
        
        // Correct cover URL if relative
        if (coverUrl && !coverUrl.startsWith('http')) {
            coverUrl = `${this.baseUrl}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`
        }

        mangas.push({
          name,
          link: href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
          coverUrl,
          latestChapter: '' // Not easily available without more specific selectors
        })
      }
    })

    // Filter duplicates based on link
    return mangas.filter((manga, index, self) => 
      index === self.findIndex((t) => t.link === manga.link)
    )
  }

  parseDetail(html: string): MangaDetail {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Name
    let name = ''
    const titleEl = doc.querySelector('title')
    if (titleEl) {
      const titleText = titleEl.textContent || ''
      name = titleText.replace(/ - Việt Hentai.*$/, '').trim()
    }
    
    if (!name) {
       // Fallback
       const h1 = doc.querySelector('h1')
       if (h1) name = h1.textContent?.trim() || ''
    }

    const slug = generateSlug(name)

    // Alternative Name
    let nameAlt: string | undefined

    // Genres
    const genres: string[] = []
    doc.querySelectorAll('.mt-2.flex.flex-wrap.gap-1 a[href*="/the-loai/"]').forEach((node) => {
      const genre = node.textContent?.trim()
      if (genre && !genres.includes(genre)) {
        genres.push(genre)
      }
    })

    // Artist
    let artist: string | undefined
    const artistParts: string[] = []
    doc.querySelectorAll('.mt-2.flex.flex-wrap.gap-1 a[href*="/tac-gia/"]').forEach((node) => {
      const artistName = node.textContent?.trim()
      if (artistName) {
        artistParts.push(artistName)
      }
    })
    if (artistParts.length > 0) {
      artist = artistParts.join(', ')
    }

    // Pilot/Description
    let pilot: string | undefined
    // PHP doesn't have specific description selector in extractMangaDetails except cover extraction area
    // Just leaving potentially empty for now unless we find one
    
    // Cover
    let coverUrl = ''
    const coverDiv = doc.querySelector('div.rounded-lg.bg-cover')
    if (coverDiv) {
        const style = coverDiv.getAttribute('style') || ''
        const matches = style.match(/url\(['"]?(.*?)?['"]?\)/)
        if (matches) {
            coverUrl = matches[1]
        }
    }
    
    if (coverUrl && !coverUrl.startsWith('http')) {
       // cover might be relative
        coverUrl = `${this.baseUrl}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`
    }

    // Chapters
    const chapters: ChapterInfo[] = []
    const chapterLinks = doc.querySelectorAll('.overflow-y-auto.overflow-x-hidden a[href*="/truyen/"]')
    
    chapterLinks.forEach((node) => {
       const href = node.getAttribute('href') || ''
       let chapterName = node.querySelector('span.text-ellipsis')?.textContent?.trim() || node.textContent?.trim() || ''
       
       if (href.match(/\/truyen\/[^/]+\/([^/]+)$/)) {
          const fullLink = href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
          chapters.push({
            name: chapterName,
            link: fullLink,
            order: parseChapterNumber(chapterName)
          })
       }
    })

    // Reverse to get chronological order (oldest to newest)
    chapters.reverse()

    // Status
    let status = 2 // Ongoing default
    const statusLink = doc.querySelector('a[href*="filter%5Bstatus%5D=1"]')
    if (statusLink) {
      const text = statusLink.textContent?.toLowerCase() || ''
      if (text.includes('hoàn thành') || text.includes('đã hoàn thành')) {
        status = 1
      }
    }

    return {
      name,
      nameAlt,
      slug,
      artist,
      status,
      genres,
      pilot,
      coverUrl,
      chapters
    }
  }

  async parseChapterImages(html: string): Promise<string[]> {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    let images: string[] = []
    
    // First try standard imgs
    doc.querySelectorAll('img').forEach((img) => {
        let src = img.getAttribute('src') || ''
        if (src && (src.includes('img.shousetsu.dev') || src.includes('/images/data/'))) {
             if (!src.startsWith('http')) {
                 src = `https:${src}`
             }
             images.push(src)
        }
    })

    // Fallback to data-src if empty
    if (images.length === 0) {
        doc.querySelectorAll('img[data-src]').forEach((img) => {
            let src = img.getAttribute('data-src') || ''
             if (src && (src.includes('img.shousetsu.dev') || src.includes('/images/data/'))) {
                 if (!src.startsWith('http')) {
                     src = `https:${src}`
                 }
                 images.push(src)
            }
        })
    }

    return Array.from(new Set(images))
  }
}
