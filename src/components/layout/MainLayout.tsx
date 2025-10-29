import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto py-6 px-4">
        <Outlet />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t mt-auto">
        © {new Date().getFullYear()} Whisper Mate
      </footer>
    </div>
  )
}
