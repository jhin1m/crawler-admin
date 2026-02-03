// CORS Proxy URLs - use multiple for fallback
const CORS_PROXIES = [
  'https://api.codetabs.com/v1/proxy?quest='
]

/**
 * Fetch HTML content through CORS proxy
 */
export async function fetchWithCorsProxy(url: string): Promise<string> {
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
export async function downloadImage(url: string): Promise<Blob> {
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`)
      }

      const blob = await response.blob()
      if (blob.size < 100) {
        throw new Error('Image too small, likely invalid')
      }
      return blob
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
export function generateSlug(name: string): string {
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
export function parseChapterNumber(name: string): number {
  const match = name.match(/chap(?:ter)?\s*([\d.]+)/i)
  if (match) return parseFloat(match[1])

  const numbers = name.match(/(\d+(?:\.\d+)?)/g)
  if (numbers && numbers.length > 0) {
    return parseFloat(numbers[numbers.length - 1])
  }
  return 0
}

export async function pbkdf2Async(
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
      salt: salt as unknown as BufferSource,
      iterations: iterations,
      hash: 'SHA-512'
    },
    key,
    keyLength * 8
  )

  return new Uint8Array(derivedBits)
}

export async function aesDecryptAsync(
  ciphertext: string,
  key: Uint8Array,
  iv: Uint8Array
): Promise<string> {
  try {
    // Convert binary string to Uint8Array
    const ciphertextBytes = new Uint8Array(ciphertext.length)
    for (let i = 0; i < ciphertext.length; i++) {
      ciphertextBytes[i] = ciphertext.charCodeAt(i)
    }

    const cryptoKey = await crypto.subtle.importKey('raw', key as unknown as BufferSource, { name: 'AES-CBC' }, false, [
      'decrypt'
    ])

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: iv
      },
      cryptoKey,
      ciphertextBytes
    )

    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error('AES Decryption error:', error)
    return ''
  }
}
