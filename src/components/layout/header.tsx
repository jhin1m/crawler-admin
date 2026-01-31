import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './user-menu'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Breadcrumb or page title can go here */}
      </div>

      <div className="flex items-center gap-4">
        <UserMenu />
      </div>
    </header>
  )
}
