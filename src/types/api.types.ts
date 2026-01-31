export interface ApiResponse<T> {
  success: boolean
  data: T
  code?: number
  message?: string
}

export interface ApiError {
  success: false
  message: string
  code: number
  errors?: Record<string, string[]>
}

export interface PaginationMeta {
  count: number
  total: number
  perPage: number
  currentPage: number
  totalPages: number
  links: {
    next?: string
    prev?: string
  }
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: PaginationMeta
}
