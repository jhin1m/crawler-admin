import { Loader2, Search, Download } from 'lucide-react'
import * as React from 'react'
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
  onCrawlUrl: (url: string) => void
  isLoading: boolean
  disabled: boolean
}

export function ControlPanel({
  config,
  onConfigChange,
  onFetch,
  onCrawlUrl,
  isLoading,
  disabled
}: ControlPanelProps) {
  const [crawlUrl, setCrawlUrl] = React.useState('')

  const handleSourceChange = (value: string) => {
    onConfigChange({ source: value as CrawlerSource })
  }

  const handleStorageChange = (value: string) => {
    onConfigChange({ storage: value as StorageType })
  }

  const handleStartPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, parseInt(e.target.value) || 1)
    onConfigChange({ startPage: value })
  }

  const handleEndPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(config.startPage, parseInt(e.target.value) || 1)
    onConfigChange({ endPage: value })
  }

  const handleUrlCrawl = () => {
    if (crawlUrl) {
      onCrawlUrl(crawlUrl)
      setCrawlUrl('')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cấu hình Crawl</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fetch List Config */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-end">
          {/* Source Selector */}
          <div className="space-y-2">
            <Label htmlFor="source">Chọn nguồn</Label>
            <Select
              value={config.source}
              onValueChange={handleSourceChange}
              disabled={disabled}
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
            <Label>Chọn Storage</Label>
            <RadioGroup
              value={config.storage}
              onValueChange={handleStorageChange}
              className="flex gap-4"
              disabled={disabled}
            >
              {Object.entries(STORAGE_TYPES).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={`storage-${key}`} />
                  <Label htmlFor={`storage-${key}`} className="font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Page Range */}
          <div className="space-y-2">
            <Label>Số trang</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={config.startPage}
                onChange={handleStartPageChange}
                disabled={disabled}
                className="w-20"
                placeholder="Start"
              />
              <span className="text-muted-foreground">tới</span>
              <Input
                type="number"
                min={config.startPage}
                value={config.endPage}
                onChange={handleEndPageChange}
                disabled={disabled}
                className="w-20"
                placeholder="End"
              />
            </div>
          </div>

          {/* Fetch Button */}
          <Button
            onClick={onFetch}
            disabled={isLoading || disabled}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang load...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Bắt đầu
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-4">
            <Label className="mb-2 block">Hoặc Crawl theo URL cụ thể</Label>
            <div className="flex gap-2">
                <Input
                    placeholder="Nhập URL manga (Ví dụ: https://truyenvn.shop/doc-truyen/ten-truyen)"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    disabled={disabled}
                />
                <Button onClick={handleUrlCrawl} disabled={!crawlUrl || disabled} variant="secondary">
                    <Download className="mr-2 h-4 w-4" />
                    Crawl URL
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
