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

export function useCrawler() {
  // State
  const [config, setConfig] = useState<CrawlerConfig>(defaultConfig)
  const [previews, setPreviews] = useState<MangaPreview[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [jobs, setJobs] = useState<CrawlJob[]>([])

  // Fetch preview mutation - uses client-side scraping
  const previewMutation = useMutation({
    mutationFn: async () => {
      // Use client-side crawler to fetch and parse HTML directly
      const result = await clientCrawlerService.fetchPreview(
        config.source,
        config.startPage,
        config.endPage
      )
      return result
    },
    onSuccess: async (data) => {
      // Add unique IDs to previews
      const previewsWithIds = data.mangas.map((m) => ({
        ...m,
        id: crawlerUtils.generateId()
      }))

      // Check which mangas already exist
      toast.info(`Checking ${previewsWithIds.length} mangas in database...`)
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
                  // Chapters are sorted newest first, so first one should have highest order
                  // But let's find max just to be safe
                  crawlChapterCount = Math.max(...detail.chapters.map(c => c.order || 0))
                }
              } catch (e) {
                console.warn(`Failed to fetch detail for existing manga ${preview.name}`, e)
              }
            }

            return { 
              ...preview, 
              exists, 
              existingId: id,
              dbChapterCount: latestChapterOrder,
              crawlChapterCount
            }
          } catch {
            // If check fails, assume not exists
            return { ...preview, exists: false, existingId: undefined }
          }
        })
      )

      setPreviews(checkedPreviews)
      setSelectedIds([])
      const existsCount = checkedPreviews.filter((p) => p.exists).length
      const newCount = checkedPreviews.length - existsCount
      toast.success(`Loaded ${checkedPreviews.length} mangas (${newCount} new, ${existsCount} exists)`)
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
        setJobs([initialState])

        try {
            const detail = await clientCrawlerService.fetchMangaDetail(config.source, manga.link)
            setJobs([{
                ...initialState,
                status: 'selecting',
                chapters: detail.chapters,
                currentStep: 'Select chapters to crawl'
            }])
        } catch (error) {
            setJobs([{
                ...initialState,
                status: 'failed',
                error: `Failed to load chapters: ${(error as Error).message}`
            }])
            toast.error('Failed to load chapters')
        }
        return
      }

      // Step 2: Start actual crawl with selected chapters
      // We need to find the existing job or create a new one (safe to recreate structure here as we have selectedChapters)
      const job: CrawlJob = {
        manga,
        status: 'crawling',
        progress: 0,
        currentStep: 'Starting...',
        selectedChapters // Preserve selected chapters in job state if needed
      }
      setJobs([job])

      try {
        const result = await clientCrawlerService.crawlManga(
          config.source,
          config.storage,
          manga.link,
          (progress: CrawlProgress) => {
            // Update job with progress info
            setJobs([{
              ...job,
              currentStep: progress.message,
              progress: Math.round((progress.current / progress.total) * 100)
            }])
          },
          selectedChapters
        )

        setJobs([
          {
            ...job,
            status: 'success',
            progress: 100,
            createdMangaId: result.mangaId,
            currentStep: `Done: ${result.chaptersCreated} chapters`
          }
        ])

        setPreviews((prev) =>
          prev.map((p) =>
            p.id === manga.id
              ? { ...p, exists: true, existingId: result.mangaId }
              : p
          )
        )

        toast.success(`Crawled: ${manga.name}`)
      } catch (error) {
        setJobs([
          {
            ...job,
            status: 'failed',
            error: (error as Error).message
          }
        ])
        toast.error(`Failed: ${(error as Error).message}`)
      }
    },
    [config]
  )

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
    clearJobs,
    resetPreviews
  }
}
