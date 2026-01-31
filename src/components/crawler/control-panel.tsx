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
                  <Label htmlFor={`storage-${key}`} className="font-normal cursor-pointer">
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
