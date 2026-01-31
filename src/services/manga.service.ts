import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'

export interface Manga {
  id: string
  name: string
  name_alt?: string
  slug: string
  status: string
  cover: string
  is_reviewed: boolean
  created_at: string
  latest_chapter?: Chapter
}

export interface CreateMangaData {
  name: string
  name_alt?: string
  artist_id?: string
  group_id?: string
  status?: string
  description?: string
  cover?: File
  genres?: number[]
}

export interface Chapter {
  id: string
  name: string
  order: number
  manga_id: string
  views: number
  created_at: string
}

export interface CreateChapterData {
  name: string
  order: number
  manga_id: string
}

export const mangaService = {
  // List mangas with optional filters
  async list(params?: {
    page?: number
    perPage?: number
    filter?: Record<string, string>
    include?: string
  }): Promise<PaginatedResponse<Manga>> {
    const response = await api.get('/mangas', { params })
    return response.data
  },

  // Get manga by ID
  async get(id: string): Promise<Manga> {
    const response = await api.get<ApiResponse<Manga>>(`/mangas/${id}`)
    return response.data.data
  },

  // Check if manga exists by name
  async checkExists(name: string): Promise<{ exists: boolean; id?: string; latestChapterOrder?: number }> {
    try {
      const response = await api.get<PaginatedResponse<Manga>>('/mangas', {
        params: {
          'filter[name]': name,
          include: 'latest_chapter',
          per_page: 1
        }
      })

      if (response.data.data && response.data.data.length > 0) {
        const manga = response.data.data[0]
        return { 
          exists: true, 
          id: manga.id,
          latestChapterOrder: manga.latest_chapter?.order
        }
      }
      return { exists: false }
    } catch {
      return { exists: false }
    }
  },

  // Create new manga
  async create(data: CreateMangaData): Promise<Manga> {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.name_alt) formData.append('name_alt', data.name_alt)
    if (data.artist_id) formData.append('artist_id', data.artist_id)
    if (data.group_id) formData.append('group_id', data.group_id)
    if (data.status) formData.append('status', data.status)
    if (data.description) formData.append('description', data.description)
    if (data.cover) formData.append('cover', data.cover)
    if (data.genres) {
      data.genres.forEach((g, i) => formData.append(`genres[${i}]`, String(g)))
    }

    const response = await api.post<ApiResponse<Manga>>('/mangas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.data
  },

  // Create chapter
  async createChapter(data: CreateChapterData): Promise<Chapter> {
    const response = await api.post<ApiResponse<Chapter>>('/chapters', data)
    return response.data.data
  },

  // Add image to chapter
  async addChapterImage(chapterId: string, image: File | Blob): Promise<void> {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('_method', 'PUT')

    await api.post(`/chapters/${chapterId}/add-img`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Batch add images (upload one by one)
  async addChapterImages(
    chapterId: string,
    images: (File | Blob)[],
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    for (let i = 0; i < images.length; i++) {
      await this.addChapterImage(chapterId, images[i])
      onProgress?.(i + 1, images.length)
    }
  },

  // Update chapter
  async updateChapter(id: string, data: Partial<Chapter> & { content?: string; image_urls?: string[] }): Promise<Chapter> {
    const response = await api.put<ApiResponse<Chapter>>(`/chapters/${id}`, data)
    return response.data.data
  },
}

export default mangaService
