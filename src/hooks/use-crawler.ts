import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { crawlerUtils } from '@/services/crawler.service'
import { clientCrawlerService, type CrawlProgress } from '@/services/client-crawler.service'
import { mangaService } from '@/services/manga.service'
import type {
  CrawlerConfig,
  MangaPreview,
  CrawlJob,
  CrawlStatus
} from '@/types/crawler.types'

const defaultConfig: CrawlerConfig = {
  source: 'truyenvn',
  storage: 's3',
  startPage: 1,
  endPage: 1
}

// Cache to store preview results
const previewCache = new Map<string, { timestamp: number, data: MangaPreview[] }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useCrawler() {
  // State
  const [config, setConfig] = useState<CrawlerConfig>(defaultConfig)
  const [previews, setPreviews] = useState<MangaPreview[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [jobs, setJobs] = useState<CrawlJob[]>([])

  // Fetch preview mutation - uses client-side scraping with caching
  const previewMutation = useMutation({
    mutationFn: async () => {
      const cacheKey = `${config.source}-${config.startPage}-${config.endPage}`
      const cached = previewCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
      }

      // Use client-side crawler to fetch and parse HTML directly
      const result = await clientCrawlerService.fetchPreview(
        config.source,
        config.startPage,
        config.endPage
      )

      // Add unique IDs to previews
      const previewsWithIds = result.mangas.map((m) => ({
        ...m,
        id: crawlerUtils.generateId()
      }))

      // Check which mangas already exist
      // Note: We can't use toast inside async function effectively without triggering it immediately, but it's fine.
      // toast.info(`Checking ${previewsWithIds.length} mangas in database...`)
      
      const checkedPreviews = await Promise.all(
        previewsWithIds.map(async (preview) => {
          try {
            const { exists, id, latestChapterOrder } = await mangaService.checkExists(preview.name)
            
            let crawlChapterCount = undefined
            // If exists, fetch detail to get accurate crawl chapter count for comparison
            if (exists) {
              try {
                // Fetch detail from source to get full chapter list
                const detail = await clientCrawlerService.fetchMangaDetail(config.source, preview.link)
                // Use the highest chapter order found
                if (detail.chapters.length > 0) {
                     // Try to find status from text first if parser implements it, otherwise max order
                     // Simple max order
                     crawlChapterCount = Math.max(...detail.chapters.map(c => c.order || 0))
                }
              } catch (err) {
                console.warn('Failed to fetch detail for comparison:', err)
              }
            } else {
                 // For new manga, attempt to estimate from list if possible (usually not accurate)
                 // Just leave undefined or use preview data
            }

            return { 
              ...preview, 
              exists, 
              existingId: id,
              dbChapterCount: latestChapterOrder,
              crawlChapterCount: crawlChapterCount || preview.chapterCount 
            }
          } catch (error) {
            console.error('Error checking exists:', error)
            return preview
          }
        })
      )
      
      // Save to cache
      previewCache.set(cacheKey, {
        timestamp: Date.now(),
        data: checkedPreviews
      })

      return checkedPreviews
    },
    onSuccess: (data) => {
      setPreviews(data)
      setSelectedIds([])
      const existsCount = data.filter((p) => p.exists).length
      const newCount = data.length - existsCount
      toast.success(`Loaded ${data.length} mangas (${newCount} new, ${existsCount} exists)`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to fetch preview: ${error.message}`)
    }
  })

  // Update config
  const updateConfig = useCallback(
    (updates: Partial<CrawlerConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }))
    },
    []
  )

  // Toggle selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }, [])

  // Select all
  const selectAll = useCallback(() => {
    const allMangaIds = previews.map((p) => p.id!)
    setSelectedIds(allMangaIds)
  }, [previews])

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds([])
  }, [])

  // Fetch preview
  const fetchPreview = useCallback(() => {
    previewMutation.mutate()
  }, [previewMutation])

  // Start crawling selected mangas
  const startCrawl = useCallback(async () => {
    const selected = previews.filter((p) => selectedIds.includes(p.id!))
    if (selected.length === 0) {
      toast.warning('No mangas selected')
      return
    }

    // Initialize jobs
    const initialJobs: CrawlJob[] = selected.map((manga) => ({
      manga,
      status: 'pending' as CrawlStatus,
      progress: 0
    }))
    setJobs(initialJobs)

    // Process each manga
    for (let i = 0; i < selected.length; i++) {
      const manga = selected[i]

      // Update job status
      setJobs((prev) =>
        prev.map((j, idx) =>
          idx === i
            ? { ...j, status: 'crawling' as CrawlStatus, currentStep: 'Starting...' }
            : j
        )
      )

      try {
        const result = await clientCrawlerService.crawlManga(
          config.source,
          config.storage,
          manga.link,
          (progress: CrawlProgress) => {
            // Update job with progress info
            setJobs((prev) =>
              prev.map((j, idx) =>
                idx === i
                  ? { ...j, currentStep: progress.message, progress: Math.round((progress.current / progress.total) * 100) }
                  : j
              )
            )
          }
        )

        // Mark success
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? {
                  ...j,
                  status: 'success' as CrawlStatus,
                  progress: 100,
                  createdMangaId: result.mangaId,
                  currentStep: `Done: ${result.chaptersCreated} chapters`
                }
              : j
          )
        )

        // Update preview to show exists
        setPreviews((prev) =>
          prev.map((p) =>
            p.id === manga.id
              ? { ...p, exists: true, existingId: result.mangaId }
              : p
          )
        )
      } catch (error) {
        // Mark failed
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? {
                  ...j,
                  status: 'failed' as CrawlStatus,
                  error: (error as Error).message
                }
              : j
          )
        )
      }
    }

    toast.success('Crawl batch completed')
    setSelectedIds([])
  }, [previews, selectedIds, config])

  // Crawl single manga
  const crawlSingle = useCallback(
    async (manga: MangaPreview, selectedChapters?: string[]) => {
      // Step 1: Initialize job if not provided chapters
      if (!selectedChapters) {
        const initialState: CrawlJob = {
            manga,
            status: 'preparing',
            progress: 0,
            currentStep: 'Fetching chapters...'
        }
        setJobs(prev => {
            const existing = prev.findIndex(j => j.manga.id === manga.id)
            if (existing !== -1) return prev.map((j, i) => i === existing ? initialState : j)
            return [...prev, initialState]
        })

        try {
            const detail = await clientCrawlerService.fetchMangaDetail(config.source, manga.link)
            setJobs(prev => prev.map(j => 
                j.manga.id === manga.id 
                ? {
                    ...j,
                    status: 'selecting',
                    chapters: detail.chapters,
                    currentStep: 'Select chapters to crawl'
                  }
                : j
            ))
        } catch (error) {
            setJobs(prev => prev.map(j => 
                j.manga.id === manga.id 
                ? {
                    ...j,
                    status: 'failed',
                    error: `Failed to load chapters: ${(error as Error).message}`
                  }
                : j
            ))
            toast.error('Failed to load chapters')
        }
        return
      }

      // Check if we need to show preview (only for single chapter)
      // Find current job to check status
      const currentJob = jobs.find(j => j.manga.id === manga.id)
      const isPreviewing = currentJob?.status === 'previewing'
      
      if (selectedChapters.length === 1 && !isPreviewing) {
        // Start Preview Flow
        const chapterName = selectedChapters[0]
        const chapter = currentJob?.chapters?.find(c => c.name === chapterName)
        
        if (!chapter) {
            toast.error('Chapter info not found')
            return
        }

        setJobs(prev => prev.map(j => 
            j.manga.id === manga.id 
            ? {
                ...j,
                status: 'preparing', // Brief loading state
                currentStep: 'Fetching chapter images preview...'
              }
            : j
        ))

        try {
            const images = await clientCrawlerService.fetchChapterImages(config.source, chapter.link)
            
            setJobs(prev => prev.map(j => 
                j.manga.id === manga.id 
                ? {
                    ...j,
                    status: 'previewing',
                    previewImages: images,
                    selectedChapters, // Store selected chapters
                    currentStep: `Ready to crawl ${images.length} images`
                  }
                : j
            ))
        } catch (error) {
            setJobs(prev => prev.map(j => 
                j.manga.id === manga.id 
                ? {
                    ...j,
                    status: 'failed',
                    error: `Failed to fetch images: ${(error as Error).message}`
                  }
                : j
            ))
            toast.error('Failed to fetch preview images')
        }
        return
      }

      // Step 2: Start actual crawl with selected chapters
      const job: CrawlJob = {
        manga,
        status: 'crawling',
        progress: 0,
        currentStep: 'Starting...',
        selectedChapters,
        previewImages: currentJob?.previewImages, // Keep preview images if they exist
        currentImageIndex: -1 // Reset image index
      }
      
      setJobs(prev => {
          const existing = prev.findIndex(j => j.manga.id === manga.id)
          if (existing !== -1) return prev.map((j, i) => i === existing ? job : j)
          return [...prev, job]
      })

      try {
        const result = await clientCrawlerService.crawlManga(
          config.source,
          config.storage,
          manga.link,
          (progress: CrawlProgress) => {
            // Update job with progress info
            setJobs(prev => prev.map(j => 
                j.manga.id === manga.id 
                ? {
                    ...j,
                    currentStep: progress.message,
                    progress: Math.round((progress.current / progress.total) * 100),
                    // If uploading/processing images, update index
                    currentImageIndex: progress.step === 'upload_image' ? progress.current - 1 : j.currentImageIndex
                  }
                : j
            ))
          },
          selectedChapters
        )

        setJobs(prev => prev.map(j => 
            j.manga.id === manga.id 
            ? {
                ...j,
                status: 'success',
                progress: 100,
                createdMangaId: result.mangaId,
                currentStep: `Done: ${result.chaptersCreated} chapters`,
                currentImageIndex: (j.previewImages?.length || 0) // Mark all as done
              }
            : j
        ))

        setPreviews((prev) =>
          prev.map((p) =>
            p.id === manga.id
              ? { ...p, exists: true, existingId: result.mangaId }
              : p
          )
        )

        toast.success(`Crawled: ${manga.name}`)
      } catch (error) {
        setJobs(prev => prev.map(j => 
            j.manga.id === manga.id 
            ? {
                ...j,
                status: 'failed',
                error: (error as Error).message
              }
            : j
        ))
        toast.error(`Failed: ${(error as Error).message}`)
      }
    },
    [config, jobs]
  )

  // Crawl by URL
  const crawlByUrl = useCallback(async (url: string) => {
    // Basic validation
    if (!url) return
    
    // Create placeholder job
    const tempId = crawlerUtils.generateId()
    const placeholderManga: MangaPreview = {
      id: tempId,
      name: url, // Show URL initially
      link: url,
      coverUrl: '',
    }

    const job: CrawlJob = {
      manga: placeholderManga,
      status: 'preparing',
      progress: 0,
      currentStep: 'Fetching info...'
    }
    
    // Add to jobs immediately
    setJobs(prev => [...prev, job])

    try {
      // Fetch details first to get name and chapters
      const detail = await clientCrawlerService.fetchMangaDetail(config.source, url)
      
      // Check if exists in DB
      const { exists, id, latestChapterOrder } = await mangaService.checkExists(detail.name)

      // Calculate stats
      let crawlChapterCount = undefined
      if (detail.chapters.length > 0) {
        crawlChapterCount = Math.max(...detail.chapters.map(c => c.order || 0))
      }

      // Update the job with real details and move to selecting
      const realManga: MangaPreview = {
        ...placeholderManga,
        name: detail.name,
        nameAlt: detail.nameAlt,
        coverUrl: detail.coverUrl,
        chapterCount: detail.chapters.length,
        exists,
        existingId: id,
        dbChapterCount: latestChapterOrder,
        crawlChapterCount
      }

      setJobs(prev => prev.map(j => 
        j.manga.id === tempId 
          ? { 
              ...j, 
              manga: realManga,
              status: 'selecting',
              chapters: detail.chapters,
              currentStep: 'Select chapters to crawl'
            }
          : j
      ))
      
      // Also add to previews list if not there? Optional.
      // Maybe not needed if we are just crawling specific URL.

    } catch (error) {
       setJobs(prev => prev.map(j => 
        j.manga.id === tempId 
          ? { 
              ...j, 
              status: 'failed',
              error: (error as Error).message
            }
          : j
      ))
      toast.error(`Failed to load manga: ${(error as Error).message}`)
    }
  }, [config])

  // Clear jobs
  const clearJobs = useCallback(() => {
    setJobs([])
  }, [])

  // Reset previews
  const resetPreviews = useCallback(() => {
    setPreviews([])
    setSelectedIds([])
    setJobs([])
  }, [])

  // Computed values
  const isLoading = previewMutation.isPending
  const isCrawling = jobs.some((j) => j.status === 'crawling')
  const selectedCount = selectedIds.length
  const newCount = previews.filter((p) => !p.exists).length

  return {
    // State
    config,
    previews,
    selectedIds,
    jobs,
    isLoading,
    isCrawling,

    // Computed
    selectedCount,
    newCount,

    // Actions
    updateConfig,
    fetchPreview,
    toggleSelect,
    selectAll,
    deselectAll,
    startCrawl,
    crawlSingle,
    crawlByUrl,
    clearJobs,
    resetPreviews
  }
}
