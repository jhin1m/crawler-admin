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
        exists && 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
        !exists && 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
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
