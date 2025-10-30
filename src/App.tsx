import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/theme-provider'
import { SettingsProvider } from './context/SettingsContext'
import { AppProvider } from './context/AppContext'
import MainLayout from './components/layout/MainLayout'
import LoadingSpinner from './components/LoadingSpinner'
import { Toaster } from './components/ui/sonner'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="whisper-mate-theme">
        <SettingsProvider>
          <AppProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
            <Toaster />
          </AppProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}