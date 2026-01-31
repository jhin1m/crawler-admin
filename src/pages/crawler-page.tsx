import { Bug, Play, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ControlPanel,
  PreviewTable,
  ProgressTracker
} from '@/components/crawler'
import { useCrawler } from '@/hooks/use-crawler'

export function CrawlerPage() {
  const {
    config,
    previews,
    selectedIds,
    jobs,
    isLoading,
    isCrawling,
    selectedCount,
    updateConfig,
    fetchPreview,
    toggleSelect,
    selectAll,
    deselectAll,
    startCrawl,
    crawlSingle,
    clearJobs
  } = useCrawler()

  const hasJobs = jobs.length > 0
  const jobsComplete = hasJobs && !jobs.some(
    (j) => j.status === 'pending' || j.status === 'crawling'
  )

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bug className="h-7 w-7" />
            Manga Crawler
          </h1>
          <p className="text-muted-foreground">
            Fetch and crawl manga from external sources
          </p>
        </div>

        <div className="flex items-center gap-2">
          {previews.length > 0 && (
            <Button
              variant="outline"
              onClick={fetchPreview}
              disabled={isLoading || isCrawling}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}

          {selectedCount > 0 && (
            <Button onClick={startCrawl} disabled={isCrawling} size="lg">
              <Play className="mr-2 h-4 w-4" />
              Crawl {selectedCount} Selected
            </Button>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <ControlPanel
        config={config}
        onConfigChange={updateConfig}
        onFetch={fetchPreview}
        isLoading={isLoading}
        disabled={isCrawling}
      />

      {/* Progress Tracker (when crawling) */}
      {hasJobs && (
        <>
          <Separator />
          <ProgressTracker jobs={jobs} onClear={clearJobs} />
        </>
      )}

      {/* Preview Table (hide during active crawl, show after) */}
      {(!hasJobs || jobsComplete) && (
        <PreviewTable
          previews={previews}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onCrawlSingle={crawlSingle}
          isLoading={isLoading}
          isCrawling={isCrawling}
        />
      )}
    </div>
  )
}
