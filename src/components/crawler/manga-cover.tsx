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
