import { Progress } from '@/components/ui/progress'
import { MangaCover } from './manga-cover'
import { ProgressStatus } from './progress-status'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckSquare, Loader2, Play } from 'lucide-react'
import type { CrawlJob } from '@/types/crawler.types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect } from 'react'

interface ProgressItemProps {
  job: CrawlJob
  className?: string
  onConfirmCrawl?: (job: CrawlJob, selectedChapters: string[]) => void
}

export function ProgressItem({ job, className, onConfirmCrawl }: ProgressItemProps) {
  const { manga, status, progress, currentStep, error, chapters } = job
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
        status === 'selecting' && 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
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
                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Fetching chapter list...
             </div>
        )}

        {/* Selecting State - Chapter List */}
        {status === 'selecting' && chapters && (
            <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{chapters.length} chapters found</span>
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
                        <Play className="w-3 h-3 mr-2" /> Start Crawl ({selectedChapters.length})
                    </Button>
                </div>
            </div>
        )}

        {/* Progress bar */}
        {(status === 'crawling' || status === 'pending') && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Current step */}
        {currentStep && status !== 'failed' && status !== 'selecting' && status !== 'preparing' && (
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
            Created manga ID: {job.createdMangaId.slice(0, 8)}...
          </p>
        )}
      </div>
    </div>
  )
}
