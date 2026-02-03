import { CheckCircle2, XCircle, Loader2, Clock, Eye } from 'lucide-react'
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
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  crawling: {
    icon: Loader2,
    label: 'Crawling',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  },
  preparing: {
    icon: Loader2,
    label: 'Preparing',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  },
  selecting: {
    icon: Clock,
    label: 'Selecting',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
  },
  success: {
    icon: CheckCircle2,
    label: 'Success',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  },
  previewing: {
    icon: Eye,
    label: 'Previewing',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
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
