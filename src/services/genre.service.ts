import api from './api'
import type { ApiResponse, PaginatedResponse } from '@/types/api.types'

export interface Genre {
  id: number
  name: string
  slug: string
  created_at: string
}

export const genreService = {
  // List all genres
  async list(params?: {
    page?: number
    perPage?: number
    filter?: Record<string, string>
  }): Promise<PaginatedResponse<Genre>> {
    const response = await api.get('/genres', { params })
    return response.data
  },

  // Create new genre
  async create(data: { name: string; slug: string }): Promise<Genre> {
    const response = await api.post<ApiResponse<Genre>>('/genres', data)
    return response.data.data
  },

  // Find genre by name (case insensitive helper)
  async findByName(name: string, allGenres: Genre[]): Promise<Genre | undefined> {
    const normalizedName = name.toLowerCase().trim()
    return allGenres.find(g => g.name.toLowerCase().trim() === normalizedName)
  }
}

export default genreService
