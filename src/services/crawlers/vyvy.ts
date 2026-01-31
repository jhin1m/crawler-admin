import type { CrawlerImplementation } from './crawler.interface'
import type { MangaPreview, MangaDetail, ChapterInfo } from '@/types/crawler.types'
import { generateSlug, parseChapterNumber } from './utils'

export class VyvyCrawler implements CrawlerImplementation {
  name = 'VyvyComi'
  baseUrl = 'https://vivicomi14.info'
  listPath = '/the-loai/18/?page='

  isMatch(url: string): boolean {
    return url.includes('vivicomi') || url.includes('vyvy')
  }

  getListUrl(page: number): string {
    return `${this.baseUrl}${this.listPath}${page}`
  }

  parseList(html: string): MangaPreview[] {
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

  parseDetail(html: string): MangaDetail {
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

  parseChapterImages(html: string): string[] {
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
}

// Crypto Helpers
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
