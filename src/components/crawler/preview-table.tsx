import { Bug, CheckSquare, Square, Loader2, Play } from 'lucide-react'
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
  onStartCrawl: () => void
  selectedCount: number
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
  onStartCrawl,
  selectedCount,
  isLoading,
  isCrawling
}: PreviewTableProps) {
  const newCount = previews.filter((p) => !p.exists).length
  const allSelected = previews.length > 0 && selectedIds.length === previews.length
  
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
          {selectedCount > 0 && (
              <Button onClick={onStartCrawl} disabled={isCrawling} size="sm">
                <Play className="mr-2 h-4 w-4" />
                Crawl {selectedCount} Selected
              </Button>
          )}
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            disabled={previews.length === 0 || isCrawling}
          >
            {allSelected ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Deselect All
              </>
            ) : (
              <>
                <CheckSquare className="mr-2 h-4 w-4" />
                Select All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
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
                      disabled={isCrawling}
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
                    {manga.exists ? (
                      <div className="flex flex-col space-y-0.5">
                         <span className="text-xs text-muted-foreground">New / Old</span>
                         <div className="font-medium text-sm">
                            <span className="text-green-600" title="Crawl Source">
                              {manga.crawlChapterCount ?? '?'}
                            </span>
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-blue-600" title="Database">
                              {manga.dbChapterCount ?? '?'}
                            </span>
                          </div>
                      </div>
                    ) : (
                      <span>
                        {manga.crawlChapterCount
                          ? `${manga.crawlChapterCount} chaps`
                          : manga.latestChapter || '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge exists={manga.exists ?? false} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCrawlSingle(manga)}
                      disabled={isCrawling}
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
