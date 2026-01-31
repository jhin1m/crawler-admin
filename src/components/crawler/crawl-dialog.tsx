import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle } from 'lucide-react'
import { clientCrawlerService } from '@/services/client-crawler.service'
import type { MangaPreview, ChapterInfo, CrawlerSource } from '@/types/crawler.types'
import { StatusBadge } from './status-badge'
import { MangaCover } from './manga-cover'

interface CrawlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  manga: MangaPreview | null
  source: CrawlerSource
  onConfirm: (selectedChapters: string[]) => void
  isProcessing: boolean
}

export function CrawlDialog({
  open,
  onOpenChange,
  manga,
  source,
  onConfirm,
  isProcessing
}: CrawlDialogProps) {
  const [loading, setLoading] = useState(false)
  const [chapters, setChapters] = useState<ChapterInfo[]>([])
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && manga) {
      fetchChapters()
    } else {
      setChapters([])
      setSelectedChapters([])
      setError(null)
    }
  }, [open, manga])

  async function fetchChapters() {
    if (!manga) return
    setLoading(true)
    setError(null)
    try {
      const detail = await clientCrawlerService.fetchMangaDetail(source, manga.link)
      setChapters(detail.chapters)
      
      // Auto select chapters based on logic
      let preSelected: string[] = []
      
      if (manga.exists && manga.dbChapterCount !== undefined) {
        // Select only new chapters
        preSelected = detail.chapters
          .filter(c => (c.order || 0) > (manga.dbChapterCount || 0))
          .map(c => c.name)
      } else {
        // Select all for new manga
        preSelected = detail.chapters.map(c => c.name)
      }
      
      setSelectedChapters(preSelected)
    } catch (err) {
      setError('Failed to load chapters via proxy. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleAll() {
    if (selectedChapters.length === chapters.length) {
      setSelectedChapters([])
    } else {
      setSelectedChapters(chapters.map(c => c.name))
    }
  }

  function toggleChapter(name: string) {
    if (selectedChapters.includes(name)) {
      setSelectedChapters(prev => prev.filter(n => n !== name))
    } else {
      setSelectedChapters(prev => [...prev, name])
    }
  }

  const handleConfirm = () => {
    onConfirm(selectedChapters)
  }

  if (!manga) return null

  return (
    <Dialog open={open} onOpenChange={(val) => !isProcessing && onOpenChange(val)}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crawl Options: {manga.name}</DialogTitle>
          <DialogDescription>
            Select chapters to crawl. {manga.exists ? 'Currently updating existing manga.' : 'Creating new manga.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 p-4 border rounded-md bg-muted/20">
            <MangaCover src={manga.coverUrl} alt={manga.name} className="w-24 h-32 object-cover rounded shadow-sm" />
            <div className="space-y-2">
                <h3 className="font-semibold text-lg">{manga.name}</h3>
                <div className="flex items-center gap-2">
                    <StatusBadge exists={!!manga.exists} />
                    {manga.exists && (
                        <span className="text-sm text-muted-foreground">
                            Latest DB Chapter: {manga.dbChapterCount}
                        </span>
                    )}
                </div>
                {error && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}
            </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col border rounded-md">
            <div className="p-3 border-b flex items-center justify-between bg-muted/40">
                <div className="flex items-center gap-2">
                    <Checkbox 
                        checked={chapters.length > 0 && selectedChapters.length === chapters.length}
                        onCheckedChange={toggleAll}
                        disabled={loading || isProcessing}
                    />
                    <span className="text-sm font-medium">Select All ({selectedChapters.length}/{chapters.length})</span>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {loading ? (
                    <div className="space-y-2">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
                        ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {chapters.map(chapter => (
                            <div key={chapter.name} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 border border-transparent hover:border-border transition-colors">
                                <Checkbox 
                                    checked={selectedChapters.includes(chapter.name)}
                                    onCheckedChange={() => toggleChapter(chapter.name)}
                                    disabled={isProcessing}
                                />
                                <span className="text-sm flex-1 truncate" title={chapter.name}>{chapter.name}</span>
                                {chapter.order && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{chapter.order}</span>}
                            </div>
                        ))}
                    </div>
                  )}
                  {!loading && chapters.length === 0 && !error && (
                      <div className="text-center py-8 text-muted-foreground">No chapters found for this manga.</div>
                  )}
                </div>
            </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || selectedChapters.length === 0 || loading}>
            {isProcessing ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Crawling...
                </>
            ) : (
                `Crawl ${selectedChapters.length} Chapters`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
