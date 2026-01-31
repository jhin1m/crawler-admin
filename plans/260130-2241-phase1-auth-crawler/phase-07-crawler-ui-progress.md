# Phase 7: Crawler UI - Progress Tracker & Integration

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: [Phase 6: Crawler UI Control](./phase-06-crawler-ui-control.md)
- **Docs**: [PHASE_1_AUTH_AND_CRAWLER.md](../../docs/PHASE_1_AUTH_AND_CRAWLER.md)

## Overview

| Field | Value |
|-------|-------|
| Duration | 2 days |
| Priority | P1 |
| Status | pending |
| Effort | 16h |

## Key Insights

1. Progress tracker shows real-time crawl status
2. Progress bar per manga with percentage
3. Status badges: pending, crawling, success, failed
4. Error messages display for failed items
5. Ability to clear completed jobs

## Requirements

### Progress Tracker Features

- List of current/recent crawl jobs
- Progress bar for each job
- Status indicator (icon + badge)
- Current step description
- Error message display
- Time elapsed (optional)
- Clear completed button

### Status Flow

```
pending -> crawling -> success
                   \-> failed
```

### Integration

- Connect ProgressTracker to useCrawler hook
- Show tracker when jobs.length > 0
- Real-time updates as crawl progresses
- Toast notifications on completion

## Architecture

### Component Structure

```
<ProgressTracker>
  <ProgressHeader
    totalJobs
    completedJobs
    onClear
  />
  <ProgressList>
    {jobs.map(job => (
      <ProgressItem
        manga={job.manga}
        status={job.status}
        progress={job.progress}
        currentStep={job.currentStep}
        error={job.error}
      />
    ))}
  </ProgressList>
</ProgressTracker>
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/crawler/progress-tracker.tsx` | Main progress component |
| `src/components/crawler/progress-item.tsx` | Individual job progress |
| `src/components/crawler/progress-status.tsx` | Status icon + badge |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/crawler-page.tsx` | Add ProgressTracker |
| `src/components/crawler/index.ts` | Export new components |

## Implementation Steps

### Step 1: Create Progress Status Component (30 min)

**src/components/crawler/progress-status.tsx**

```typescript
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CrawlStatus } from '@/types/crawler.types'
import { cn } from '@/lib/utils'

interface ProgressStatusProps {
  status: CrawlStatus
  className?: string
}

const statusConfig: Record<
  CrawlStatus,
  { icon: typeof Clock; label: string; color: string }
> = {
  idle: {
    icon: Clock,
    label: 'Idle',
    color: 'bg-gray-100 text-gray-700'
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'bg-blue-100 text-blue-700'
  },
  crawling: {
    icon: Loader2,
    label: 'Crawling',
    color: 'bg-yellow-100 text-yellow-700'
  },
  success: {
    icon: CheckCircle2,
    label: 'Success',
    color: 'bg-green-100 text-green-700'
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'bg-red-100 text-red-700'
  }
}

export function ProgressStatus({ status, className }: ProgressStatusProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant="secondary"
      className={cn('gap-1.5', config.color, className)}
    >
      <Icon
        className={cn('h-3.5 w-3.5', status === 'crawling' && 'animate-spin')}
      />
      {config.label}
    </Badge>
  )
}
```

### Step 2: Create Progress Item Component (60 min)

**src/components/crawler/progress-item.tsx**

```typescript
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
        status === 'failed' && 'border-red-200 bg-red-50',
        status === 'success' && 'border-green-200 bg-green-50',
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
          <p className="text-sm text-green-600">
            Created manga ID: {job.createdMangaId.slice(0, 8)}...
          </p>
        )}
      </div>
    </div>
  )
}
```

### Step 3: Create Progress Tracker Component (90 min)

**src/components/crawler/progress-tracker.tsx**

```typescript
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
```

### Step 4: Add ScrollArea Component (10 min)

ScrollArea may not be installed yet. Add it:

```bash
pnpm dlx shadcn@latest add scroll-area
```

### Step 5: Update Index Export (10 min)

**src/components/crawler/index.ts** - Updated

```typescript
export { ControlPanel } from './control-panel'
export { PreviewTable } from './preview-table'
export { PreviewSkeleton } from './preview-skeleton'
export { StatusBadge } from './status-badge'
export { MangaCover } from './manga-cover'
export { ProgressTracker } from './progress-tracker'
export { ProgressItem } from './progress-item'
export { ProgressStatus } from './progress-status'
```

### Step 6: Update Crawler Page with Progress (60 min)

**src/pages/crawler-page.tsx** - Final

```typescript
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
    newCount,
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6" />
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
            <Button onClick={startCrawl} disabled={isCrawling}>
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
```

### Step 7: Enhance useCrawler with Better Progress (60 min)

Update `src/hooks/use-crawler.ts` to support more granular progress:

```typescript
// Add to startCrawl function for better progress tracking

// Update job with step info
const updateJobProgress = (
  index: number,
  updates: Partial<CrawlJob>
) => {
  setJobs((prev) =>
    prev.map((j, idx) => (idx === index ? { ...j, ...updates } : j))
  )
}

// In the crawl loop:
updateJobProgress(i, {
  status: 'crawling',
  currentStep: 'Fetching manga details...',
  progress: 10
})

// After creating manga:
updateJobProgress(i, {
  currentStep: 'Creating manga...',
  progress: 30
})

// During chapter uploads:
updateJobProgress(i, {
  currentStep: `Uploading chapter ${chapterNum}/${totalChapters}...`,
  progress: 30 + (chapterNum / totalChapters) * 60
})

// On completion:
updateJobProgress(i, {
  status: 'success',
  progress: 100,
  currentStep: `Done: ${chaptersCreated} chapters`,
  createdMangaId: result.mangaId
})
```

## Todo List

- [ ] Add scroll-area shadcn component
- [ ] Create src/components/crawler/progress-status.tsx
- [ ] Create src/components/crawler/progress-item.tsx
- [ ] Create src/components/crawler/progress-tracker.tsx
- [ ] Update src/components/crawler/index.ts
- [ ] Update src/pages/crawler-page.tsx
- [ ] Enhance useCrawler with progress updates
- [ ] Test progress display during crawl
- [ ] Test status transitions
- [ ] Test error display
- [ ] Test clear jobs button
- [ ] Verify scroll area works

## Success Criteria

- [ ] Progress tracker shows all jobs
- [ ] Progress bar updates during crawl
- [ ] Status badges reflect job state
- [ ] Current step text updates
- [ ] Error messages display clearly
- [ ] Success shows created manga ID
- [ ] Clear button removes completed jobs
- [ ] Scroll area allows viewing many jobs

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Progress updates too fast | Low | Debounce state updates |
| Memory leak with many jobs | Medium | Limit job history, clear old |
| ScrollArea performance | Low | Virtualize if >50 items |

## Security Considerations

- Don't expose full manga IDs (truncate in UI)
- Sanitize error messages before display
- Rate limit crawl operations

## Next Steps

After completion, proceed to [Phase 8: Polish & Testing](./phase-08-polish-testing.md)
