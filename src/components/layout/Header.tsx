import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../theme-provider'
import { Button } from '../ui/button'
import { Moon, Sun, History, Settings } from 'lucide-react'

export default function Header() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // Get current resolved theme (considering system preference)
    const root = window.document.documentElement
    const isDark = root.classList.contains('dark')
    setTheme(isDark ? 'light' : 'dark')
  }

  // Get current effective theme for icon display
  const getEffectiveTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return theme
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Whisper Mate</h1>
        </Link>

        <nav className="flex items-center gap-4">
          <Link to="/history">
            <Button
              variant={location.pathname === '/history' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <History size={16} />
              History
            </Button>
          </Link>
          <Link to="/settings">
            <Button
              variant={location.pathname === '/settings' ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
            >
              <Settings size={16} />
              Settings
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {getEffectiveTheme() === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </nav>
      </div>
    </header>
  )
}
