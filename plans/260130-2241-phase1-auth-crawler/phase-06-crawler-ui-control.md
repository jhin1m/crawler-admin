# Phase 6: Crawler UI - Control Panel & Preview Table

## Context

- **Parent**: [plan.md](./plan.md)
- **Dependencies**: [Phase 5: Crawler Foundation](./phase-05-crawler-foundation.md)
- **Docs**: [PHASE_1_AUTH_AND_CRAWLER.md](../../docs/PHASE_1_AUTH_AND_CRAWLER.md)

## Overview

| Field | Value |
|-------|-------|
| Duration | 2 days |
| Priority | P1 |
| Status | pending |
| Effort | 16h |

## Key Insights

1. Control Panel: source, storage, page range, fetch button
2. Preview Table: cover, name, chapters, status, actions
3. Batch selection with "select all new"
4. Loading skeletons during fetch
5. Status badges (exists/new)

## Requirements

### Control Panel Features

- Source dropdown (TruyenVN, VyvyComi)
- Storage radio group (S3, Hotlink)
- Page range inputs (start, end) with validation
- Fetch Preview button
- Loading state

### Preview Table Features

- Cover image thumbnail (lazy load)
- Manga name + alternative name
- Chapter count or latest chapter
- Status badge (Exists/New)
- Checkbox for selection
- Crawl button per row
- Select all checkbox (new only)
- Empty state when no previews

## Architecture

### Component Hierarchy

```
<CrawlerPage>
  <ControlPanel
    config={config}
    onConfigChange={updateConfig}
    onFetch={fetchPreview}
    isLoading={isLoading}
  />

  <PreviewTable
    previews={previews}
    selectedIds={selectedIds}
    onToggleSelect={toggleSelect}
    onSelectAll={selectAll}
    onDeselectAll={deselectAll}
    onCrawlSingle={crawlSingle}
    isLoading={isLoading}
  />
</CrawlerPage>
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/crawler/control-panel.tsx` | Crawler configuration form |
| `src/components/crawler/preview-table.tsx` | Manga preview table |
| `src/components/crawler/preview-skeleton.tsx` | Loading skeleton |
| `src/components/crawler/status-badge.tsx` | Exists/New badge |
| `src/components/crawler/manga-cover.tsx` | Cover image with fallback |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/crawler-page.tsx` | Integrate crawler components |

## Implementation Steps

### Step 1: Create Status Badge (20 min)

**src/components/crawler/status-badge.tsx**

```typescript
import { Badge } from '@/components/ui/badge'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  exists: boolean
  className?: string
}

export function StatusBadge({ exists, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={exists ? 'secondary' : 'default'}
      className={cn(
        'gap-1',
        exists && 'bg-amber-100 text-amber-700 hover:bg-amber-100',
        !exists && 'bg-green-100 text-green-700 hover:bg-green-100',
        className
      )}
    >
      {exists ? (
        <>
          <Check className="h-3 w-3" />
          Exists
        </>
      ) : (
        <>
          <Plus className="h-3 w-3" />
          New
        </>
      )}
    </Badge>
  )
}
```

### Step 2: Create Manga Cover (30 min)

**src/components/crawler/manga-cover.tsx**

```typescript
import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MangaCoverProps {
  src: string
  alt: string
  className?: string
}

export function MangaCover({ src, alt, className }: MangaCoverProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded',
          className
        )}
      >
        <ImageOff className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded', className)}>
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
```

### Step 3: Create Preview Skeleton (30 min)

**src/components/crawler/preview-skeleton.tsx**

```typescript
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

export function PreviewSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Skeleton className="h-4 w-4" />
          </TableHead>
          <TableHead className="w-16">Cover</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="w-24">Chapters</TableHead>
          <TableHead className="w-24">Status</TableHead>
          <TableHead className="w-24">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-16 w-12 rounded" />
            </TableCell>
            <TableCell>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Step 4: Create Control Panel (90 min)

**src/components/crawler/control-panel.tsx**

```typescript
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { CrawlerConfig, CrawlerSource, StorageType } from '@/types/crawler.types'
import { CRAWLER_SOURCES, STORAGE_TYPES } from '@/lib/constants'

interface ControlPanelProps {
  config: CrawlerConfig
  onConfigChange: (updates: Partial<CrawlerConfig>) => void
  onFetch: () => void
  isLoading: boolean
  disabled?: boolean
}

export function ControlPanel({
  config,
  onConfigChange,
  onFetch,
  isLoading,
  disabled
}: ControlPanelProps) {
  const handleSourceChange = (value: CrawlerSource) => {
    onConfigChange({ source: value })
  }

  const handleStorageChange = (value: StorageType) => {
    onConfigChange({ storage: value })
  }

  const handleStartPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, parseInt(e.target.value) || 1)
    onConfigChange({ startPage: value })
  }

  const handleEndPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(config.startPage, parseInt(e.target.value) || 1)
    onConfigChange({ endPage: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Crawler Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Source Selector */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select
              value={config.source}
              onValueChange={handleSourceChange}
              disabled={disabled || isLoading}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CRAWLER_SOURCES).map(([key, { name }]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage Selector */}
          <div className="space-y-2">
            <Label>Storage Type</Label>
            <RadioGroup
              value={config.storage}
              onValueChange={handleStorageChange}
              className="flex gap-4"
              disabled={disabled || isLoading}
            >
              {Object.entries(STORAGE_TYPES).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={`storage-${key}`} />
                  <Label htmlFor={`storage-${key}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Page Range */}
          <div className="space-y-2">
            <Label>Page Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={config.startPage}
                onChange={handleStartPageChange}
                disabled={disabled || isLoading}
                className="w-20"
                placeholder="Start"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                min={config.startPage}
                value={config.endPage}
                onChange={handleEndPageChange}
                disabled={disabled || isLoading}
                className="w-20"
                placeholder="End"
              />
            </div>
          </div>

          {/* Fetch Button */}
          <div className="flex items-end">
            <Button
              onClick={onFetch}
              disabled={disabled || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Fetch Preview
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 5: Create Preview Table (120 min)

**src/components/crawler/preview-table.tsx**

```typescript
import { Bug, CheckSquare, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { StatusBadge } from './status-badge'
import { MangaCover } from './manga-cover'
import { PreviewSkeleton } from './preview-skeleton'
import type { MangaPreview } from '@/types/crawler.types'

interface PreviewTableProps {
  previews: MangaPreview[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onCrawlSingle: (manga: MangaPreview) => void
  isLoading: boolean
  isCrawling: boolean
}

export function PreviewTable({
  previews,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onCrawlSingle,
  isLoading,
  isCrawling
}: PreviewTableProps) {
  const newCount = previews.filter((p) => !p.exists).length
  const allNewSelected = newCount > 0 && selectedIds.length === newCount

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview Results</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (previews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bug className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No previews yet</h3>
            <p className="text-sm text-muted-foreground">
              Configure the crawler and click "Fetch Preview" to start
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Preview Results</CardTitle>
          <p className="text-sm text-muted-foreground">
            {previews.length} mangas found ({newCount} new)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={allNewSelected ? onDeselectAll : onSelectAll}
            disabled={newCount === 0 || isCrawling}
          >
            {allNewSelected ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Deselect All
              </>
            ) : (
              <>
                <CheckSquare className="mr-2 h-4 w-4" />
                Select All New
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-16">Cover</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-24">Chapters</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previews.map((manga) => (
                <TableRow key={manga.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(manga.id!)}
                      onCheckedChange={() => onToggleSelect(manga.id!)}
                      disabled={manga.exists || isCrawling}
                    />
                  </TableCell>
                  <TableCell>
                    <MangaCover
                      src={manga.coverUrl}
                      alt={manga.name}
                      className="h-16 w-12"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-1">{manga.name}</p>
                      {manga.nameAlt && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {manga.nameAlt}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {manga.chapterCount
                      ? `${manga.chapterCount} chaps`
                      : manga.latestChapter || '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge exists={manga.exists ?? false} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCrawlSingle(manga)}
                      disabled={manga.exists || isCrawling}
                    >
                      {isCrawling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Crawl'
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 6: Create Index Export (10 min)

**src/components/crawler/index.ts**

```typescript
export { ControlPanel } from './control-panel'
export { PreviewTable } from './preview-table'
export { PreviewSkeleton } from './preview-skeleton'
export { StatusBadge } from './status-badge'
export { MangaCover } from './manga-cover'
```

### Step 7: Update Crawler Page (60 min)

**src/pages/crawler-page.tsx**

```typescript
import { Bug, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ControlPanel, PreviewTable } from '@/components/crawler'
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
    crawlSingle
  } = useCrawler()

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

        {selectedCount > 0 && (
          <Button onClick={startCrawl} disabled={isCrawling}>
            <Play className="mr-2 h-4 w-4" />
            Crawl {selectedCount} Selected
          </Button>
        )}
      </div>

      {/* Control Panel */}
      <ControlPanel
        config={config}
        onConfigChange={updateConfig}
        onFetch={fetchPreview}
        isLoading={isLoading}
        disabled={isCrawling}
      />

      {/* Preview Table */}
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

      {/* Progress Tracker - Phase 7 */}
      {jobs.length > 0 && (
        <div className="text-muted-foreground">
          Progress tracker coming in Phase 7...
        </div>
      )}
    </div>
  )
}
```

## Todo List

- [ ] Create src/components/crawler/status-badge.tsx
- [ ] Create src/components/crawler/manga-cover.tsx
- [ ] Create src/components/crawler/preview-skeleton.tsx
- [ ] Create src/components/crawler/control-panel.tsx
- [ ] Create src/components/crawler/preview-table.tsx
- [ ] Create src/components/crawler/index.ts
- [ ] Update src/pages/crawler-page.tsx
- [ ] Test source dropdown changes
- [ ] Test storage radio selection
- [ ] Test page range validation
- [ ] Test fetch preview button
- [ ] Test checkbox selection
- [ ] Test select all / deselect all
- [ ] Verify loading states

## Success Criteria

- [ ] Control panel displays all config options
- [ ] Source dropdown shows TruyenVN and VyvyComi
- [ ] Storage radio toggles between S3 and Hotlink
- [ ] Page range inputs validate (end >= start)
- [ ] Fetch button shows loading state
- [ ] Preview table shows manga list
- [ ] Cover images load with fallback
- [ ] Status badges show Exists/New correctly
- [ ] Checkboxes allow selection
- [ ] Select All selects only new mangas
- [ ] Single crawl button triggers crawl

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cover images blocked by CORS | Medium | Use backend proxy for images |
| Table performance with many items | Medium | Add virtualization if >100 items |
| Checkbox state desync | Low | Use controlled component pattern |

## Security Considerations

- Validate page range on client and server
- Don't expose source URLs in UI
- Sanitize manga names before display (XSS)

## Next Steps

After completion, proceed to [Phase 7: Crawler UI - Progress & Integration](./phase-07-crawler-ui-progress.md)
