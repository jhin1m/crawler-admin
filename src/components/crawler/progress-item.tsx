import { Progress } from '@/components/ui/progress'
import { MangaCover } from './manga-cover'
import { ProgressStatus } from './progress-status'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckSquare, Loader2, Play, Upload, CheckCircle2 } from 'lucide-react'
import type { CrawlJob } from '@/types/crawler.types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ProgressItemProps {
  job: CrawlJob
  className?: string
  onConfirmCrawl?: (job: CrawlJob, selectedChapters: string[]) => void
}

export function ProgressItem({ job, className, onConfirmCrawl }: ProgressItemProps) {
  const { manga, status, progress, currentStep, error, chapters, previewImages, currentImageIndex } = job
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])

  // Initialize selected chapters when entering selecting state
  useEffect(() => {
    if (status === 'selecting' && chapters) {
        // Default to new chapters logic if available
        let preSelected: string[] = []
        if (manga.exists && manga.dbChapterCount !== undefined) {
             preSelected = chapters
                .filter(c => (c.order || 0) > (manga.dbChapterCount || 0))
                .map(c => c.name)
        } else {
             preSelected = chapters.map(c => c.name)
        }
        setSelectedChapters(preSelected)
    }
  }, [status, chapters, manga.exists, manga.dbChapterCount])

  // Restore selected chapters if we are in previewing mode
  useEffect(() => {
    if (status === 'previewing' && job.selectedChapters) {
        setSelectedChapters(job.selectedChapters)
    }
  }, [status, job.selectedChapters])


  const toggleAll = () => {
    if (!chapters) return
    if (selectedChapters.length === chapters.length) {
        setSelectedChapters([])
    } else {
        setSelectedChapters(chapters.map(c => c.name))
    }
  }

  const toggleChapter = (name: string) => {
    if (selectedChapters.includes(name)) {
        setSelectedChapters(prev => prev.filter(n => n !== name))
    } else {
        setSelectedChapters(prev => [...prev, name])
    }
  }

  return (
    <div
      className={cn(
        'flex gap-4 p-4 border rounded-lg',
        status === 'failed' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
        status === 'success' && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
        (status === 'selecting' || status === 'previewing') && 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
        className
      )}
    >
      {/* Cover */}
      <MangaCover
        src={manga.coverUrl}
        alt={manga.name}
        className="h-20 w-14 flex-shrink-0"
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{manga.name}</p>
            {manga.nameAlt && (
              <p className="text-sm text-muted-foreground truncate">
                {manga.nameAlt}
              </p>
            )}
          </div>
          <ProgressStatus status={status} />
        </div>

        {/* Preparing State */}
        {status === 'preparing' && (
             <div className="flex items-center text-sm text-muted-foreground animate-pulse">
                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> {currentStep || 'Đang xử lý...'}
             </div>
        )}

        {/* Selecting State - Chapter List */}
        {status === 'selecting' && chapters && (
            <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Đã tìm thấy {chapters.length}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={toggleAll}>
                        <CheckSquare className="w-3 h-3 mr-1" />
                        {selectedChapters.length === chapters.length ? 'Deselect All' : 'Select All'}
                    </Button>
                </div>
                
                <div className="border rounded bg-background/50 max-h-[250px] overflow-y-auto p-2 grid grid-cols-1 gap-2">
                    {chapters.map(chapter => (
                        <div key={chapter.name} className="flex items-center gap-2 text-sm">
                             <Checkbox 
                                id={`chk-${manga.id}-${chapter.name}`}
                                checked={selectedChapters.includes(chapter.name)}
                                onCheckedChange={() => toggleChapter(chapter.name)}
                             />
                             <label htmlFor={`chk-${manga.id}-${chapter.name}`} className="truncate cursor-pointer select-none text-xs" title={chapter.name}>
                                {chapter.name}
                             </label>
                        </div>
                    ))}
                </div>
                
                <div className="flex justify-end pt-2">
                    <Button 
                        size="sm" 
                        onClick={() => onConfirmCrawl?.(job, selectedChapters)}
                        disabled={selectedChapters.length === 0}
                    >
                        <Play className="w-3 h-3 mr-2" /> 
                        {selectedChapters.length === 1 ? 'Preview & Crawl' : `Bắt đầu (${selectedChapters.length})`}
                    </Button>
                </div>
            </div>
        )}

        {/* Previewing State - Image Grid */}
        {status === 'previewing' && previewImages && (
             <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preview {previewImages.length} images</span>
                </div>
                
                <ScrollArea className="h-[300px] border rounded bg-background/50 p-2">
                    <div className="grid grid-cols-4 gap-2">
                        {previewImages.map((img, idx) => (
                            <div key={idx} className="aspect-square relative group overflow-hidden rounded border bg-muted">
                                <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
                                    {idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                
                <div className="flex justify-end pt-2 gap-2">
                     <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                            // Back logic could be implemented if needed, but for now just show upload
                        }}
                    >
                        Back
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={() => onConfirmCrawl?.(job, selectedChapters)}
                    >
                        <Upload className="w-3 h-3 mr-2" /> Bắt đầu Upload
                    </Button>
                </div>
            </div>
        )}

        {/* Crawling State with Grid Progress */}
        {status === 'crawling' && previewImages && (
            <div className="space-y-3 mt-2">
                 <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground flex justify-between">
                        <span>{progress}%</span>
                        <span>{currentStep}</span>
                    </p>
                  </div>

                 <ScrollArea className="h-[300px] border rounded bg-background/50 p-2">
                    <div className="grid grid-cols-4 gap-2">
                        {previewImages.map((img, idx) => {
                            const isDone = currentImageIndex !== undefined && idx < currentImageIndex
                            const isCurrent = currentImageIndex !== undefined && idx === currentImageIndex
                            
                            return (
                                <div key={idx} className="aspect-square relative group overflow-hidden rounded border bg-muted">
                                    <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover opacity-80" />
                                    
                                    {isDone && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                                        </div>
                                    )}
                                    
                                    {isCurrent && (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center border-2 border-primary">
                                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                        </div>
                                    )}
                                    
                                    <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
                                        {idx + 1}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>
        )}

        {/* Normal Progress bar (if no preview images or multiple chapters) */}
        {(status === 'crawling' || status === 'pending') && !previewImages && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Current step (only if not previewing/selecting/failed) */}
        {currentStep && status !== 'failed' && status !== 'selecting' && status !== 'preparing' && status !== 'previewing' &&  (
          <p className="text-sm text-muted-foreground">{currentStep}</p>
        )}

        {/* Error message */}
        {status === 'failed' && error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success info */}
        {status === 'success' && job.createdMangaId && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Đã tạo manga với ID: {job.createdMangaId.slice(0, 8)}...
          </p>
        )}
      </div>
    </div>
  )
}
