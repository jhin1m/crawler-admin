import { Trash2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProgressItem } from './progress-item'
import type { CrawlJob } from '@/types/crawler.types'

interface ProgressTrackerProps {
  jobs: CrawlJob[]
  onClear: () => void
}

export function ProgressTracker({ jobs, onClear }: ProgressTrackerProps) {
  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    crawling: jobs.filter((j) => j.status === 'crawling').length,
    success: jobs.filter((j) => j.status === 'success').length,
    failed: jobs.filter((j) => j.status === 'failed').length
  }

  const isComplete = stats.pending === 0 && stats.crawling === 0
  const hasErrors = stats.failed > 0

  if (jobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {!isComplete ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Crawling Progress
                </>
              ) : hasErrors ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Crawl Completed with Errors
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Crawl Completed
                </>
              )}
            </CardTitle>
            <CardDescription>
              {stats.success} succeeded, {stats.failed} failed
              {!isComplete &&
                ` • ${stats.crawling} crawling, ${stats.pending} pending`}
            </CardDescription>
          </div>

          {isComplete && (
            <Button variant="outline" size="sm" onClick={onClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {jobs.map((job, index) => (
              <ProgressItem key={job.manga.id || index} job={job} />
            ))}
          </div>
        </ScrollArea>

        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {stats.success} success
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {stats.failed} failed
            </span>
            {!isComplete && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                {stats.crawling + stats.pending} in progress
              </span>
            )}
          </div>
          <span>Total: {stats.total}</span>
        </div>
      </CardContent>
    </Card>
  )
}
