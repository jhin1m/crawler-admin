import type { CrawlerImplementation } from './crawler.interface'
import type { MangaPreview, MangaDetail, ChapterInfo } from '@/types/crawler.types'
import { generateSlug, parseChapterNumber } from './utils'

export class VinaHentaiCrawler implements CrawlerImplementation {
  name = 'VinaHentai'
  baseUrl = 'https://vinahentai.fun'
  listPath = '/danh-sach?page='

  isMatch(url: string): boolean {
    return url.includes('vinahentai')
  }

  getListUrl(page: number): string {
    return `${this.baseUrl}${this.listPath}${page}`
  }

  parseList(html: string): MangaPreview[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const mangas: MangaPreview[] = []
    
    // Find all links that match the pattern /truyen-hentai/ but not /truyen-hentai/chapter/
    const links = doc.querySelectorAll('a[href*="/truyen-hentai/"]')
    
    links.forEach((linkEl) => {
      const href = linkEl.getAttribute('href') || ''
      
      // Name is in h3 tag
      const nameEl = linkEl.querySelector('h3')
      const name = nameEl?.textContent?.trim() || ''

      // Skip invalid or chapter links
      if (!name || href.includes('/chapter/')) {
        return
      }

      // Latest Chapter
      // usually in a span inside a flex container before the title
      // Structure: div.flex.items-center.gap-2 > span or just span
      let latestChapter = ''
      const chapterSpan = linkEl.querySelector('div.flex span')
      if (chapterSpan) {
        latestChapter = chapterSpan.textContent?.trim() || ''
        // Avoid "END!" or status badges if they appear first (though usually chapter is first)
        if (latestChapter === 'END!' || latestChapter === 'Full') {
           // Try next sibling if available? or just leave it
           // The browser analysis showed chapter is usually first span.
        }
      }

      // Ensure it's a main manga link
      const match = href.match(/\/truyen-hentai\/([^/]+)$/)
      if (match) {
        // Find cover image
        let coverUrl = ''
        const img = linkEl.querySelector('img')
        if (img) {
             coverUrl = img.getAttribute('data-src') || img.getAttribute('src') || ''
        }

        mangas.push({
          name,
          link: href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
          coverUrl,
          latestChapter
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
    const titleEl = doc.querySelector('h1')
    if (titleEl) {
      // Clean name: remove style tags
      const clone = titleEl.cloneNode(true) as Element
      if (clone.querySelectorAll) {
        const styles = clone.querySelectorAll('style')
        styles.forEach((s) => s.remove())
      }
      const titleText = clone.textContent || ''
      
      name = titleText
        .replace(/ - Vina Hentai.*$/i, '')
        .replace(/ \| VinaHentai.*$/i, '')
        .replace(/@keyframes\s+shimmer-red[\s\S]*?100%[\s\S]*?\}/gi, '') // Explicitly remove the shimmer-red keyframes if it remains
        .trim()
    }
    const slug = generateSlug(name)

    // Alternative Name
    let nameAlt: string | undefined

    // Genres
    const genres: string[] = []
    doc.querySelectorAll('a[href*="/genres/"]').forEach((node) => {
      const genre = node.textContent?.trim()
      if (genre && !genres.includes(genre)) {
        genres.push(genre)
      }
    })

    // Artist
    let artist: string | undefined
    const artistParts: string[] = []
    doc.querySelectorAll('a[href*="/authors/"]').forEach((node) => {
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
    // Try finding "GIỚI THIỆU" strong tag
    const introStrong = Array.from(doc.querySelectorAll('strong')).find(el => el.textContent?.includes('GIỚI THIỆU'))
    if (introStrong && introStrong.parentElement) {
       pilot = introStrong.parentElement.textContent?.replace('GIỚI THIỆU', '').trim()
    }

    if (!pilot) {
       const descDiv = doc.querySelector('div.text-sm.text-gray-400')
       if (descDiv) {
         pilot = descDiv.textContent?.trim()
       }
    }

    // Cover
    let coverUrl = ''
    const coverNode = doc.querySelector('.relative.flex.flex-shrink-0.items-center.justify-center img')
    if (coverNode) {
      coverUrl = coverNode.getAttribute('data-src') || coverNode.getAttribute('src') || ''
    }

    // Chapters
    const chapters: ChapterInfo[] = []
    const chapterLinks = doc.querySelectorAll('.flex.flex-col.gap-4 a.block')
    
    chapterLinks.forEach((node) => {
       const href = node.getAttribute('href') || ''
       let chapterName = node.textContent?.trim() || ''
       
       const span = node.querySelector('span')
       if (span) {
         chapterName = span.textContent || chapterName
       }

       if (href.includes('/truyen-hentai/') && chapterName) {
          const fullLink = href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
          chapters.push({
            name: chapterName,
            link: fullLink,
            order: parseChapterNumber(chapterName)
          })
       }
    })

    // Reverse to get chronological order (oldest to newest) like other crawlers often want, 
    // or dependent on how UI displays. Typically list is New -> Old. 
    // Types expect array. Previous crawlers reversed it.
    chapters.reverse()

    // Status logic from PHP: check filter status
    // Default 1 (Ongoing), 2 (Completed) if "hoàn thành" found
    let status = 1
    const statusLink = doc.querySelector('a[href*="filter%5Bstatus%5D=1"]')
    if (statusLink) {
      const text = statusLink.textContent?.toLowerCase() || ''
      if (text.includes('hoàn thành')) {
        status = 2
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
    // Regex based extraction as per PHP reference
    const regex = /https:\/\/cdn\.vinahentai\.fun\/[^"'\s\\]+?\.(?:jpg|jpeg|png|webp)/g
    const matches = html.match(regex) || []
    
    if (matches.length > 0) {
      // Filter unique
      // Filter unique and remove unwanted images (like backgrounds)
      return Array.from(new Set(matches)).filter(url => 
        !url.includes('avatar-uploads/bg/') && 
        !url.includes('bg%20body%20chuan')
      )
    }

    // Fallback? PHP code says "Extract images directly from source (handling lazy load/script tags)"
    // The regex above was the primary method.
    return []
  }
}
