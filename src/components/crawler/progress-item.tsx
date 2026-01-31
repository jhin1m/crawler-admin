import { Progress } from '@/components/ui/progress'
import { MangaCover } from './manga-cover'
import { ProgressStatus } from './progress-status'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { CrawlJob } from '@/types/crawler.types'
import { cn } from '@/lib/utils'

interface ProgressItemProps {
  job: CrawlJob
  className?: string
}

export function ProgressItem({ job, className }: ProgressItemProps) {
  const { manga, status, progress, currentStep, error } = job

  return (
    <div
      className={cn(
        'flex gap-4 p-4 border rounded-lg',
        status === 'failed' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
        status === 'success' && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
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

        {/* Progress bar */}
        {(status === 'crawling' || status === 'pending') && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Current step */}
        {currentStep && status !== 'failed' && (
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
