export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/admin'

export const CRAWLER_SOURCES = {
  truyenvn: {
    name: 'TruyenVN',
    baseUrl: 'https://truyenvn.shop'
  },
  vyvy: {
    name: 'VyvyComi',
    baseUrl: 'https://vivicomi14.info'
  },
  vinahentai: {
    name: 'VinaHentai',
    baseUrl: 'https://vinahentai.fun'
  }

} as const

export const STORAGE_TYPES = {
  s3: 'S3 Upload',
  hotlink: 'Hotlink'
} as const

export const AUTH_TOKEN_KEY = 'auth_token'
export const AUTH_USER_KEY = 'auth_user'

export type CrawlerSourceKey = keyof typeof CRAWLER_SOURCES
export type StorageTypeKey = keyof typeof STORAGE_TYPES
