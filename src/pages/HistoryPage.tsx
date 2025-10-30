import { useState, useEffect } from 'react'
import { Search, Trash2, Copy, Clock, Calendar, FileText, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getTranscriptions,
  deleteTranscription,
  searchTranscriptions,
  type Transcription,
} from '../services/transcriptionService'
import { toast } from 'sonner'

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60))
      return diffMinutes === 0 ? 'Just now' : `${diffMinutes} minutes ago`
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadTranscriptions = async () => {
    try {
      setIsLoading(true)
      const data = await getTranscriptions()
      setTranscriptions(data)
    } catch (error) {
      console.error('Failed to load transcriptions:', error)
      toast.error('이력을 불러오는데 실패했습니다.', {
        description: '전사 이력을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTranscriptions()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return loadTranscriptions()
    }

    try {
      setIsLoading(true)
      const results = await searchTranscriptions(searchQuery)
      setTranscriptions(results)
      if (results.length === 0) {
        toast.info('검색 결과가 없습니다.', {
          description: '다른 검색어로 시도해주세요.',
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
      toast.error('검색에 실패했습니다.', {
        description: '전사를 검색할 수 없습니다.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (transcription: Transcription) => {
    setSelectedTranscription(transcription)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedTranscription) return

    try {
      await deleteTranscription(selectedTranscription.id)
      setTranscriptions((prev) => prev.filter((t) => t.id !== selectedTranscription.id))
      setDeleteDialogOpen(false)
      toast.success('전사가 삭제되었습니다.')
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('삭제에 실패했습니다.', {
        description: '전사를 삭제할 수 없습니다.',
      })
    }
  }

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('클립보드에 복사되었습니다.')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('복사에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Transcription History
          </h1>
          <p className="text-muted-foreground">Manage and review all your transcriptions</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-5 duration-700 delay-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search transcriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-background/60 backdrop-blur-sm border-border/50 focus:border-primary transition-all"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        {isLoading ? (
          <Card className="border-dashed border-2 bg-background/40 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <h3 className="text-xl font-semibold mb-2">Loading transcriptions...</h3>
              <p className="text-muted-foreground">Please wait while we fetch your transcriptions</p>
            </CardContent>
          </Card>
        ) : transcriptions.length === 0 ? (
          <Card className="border-dashed border-2 bg-background/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No transcriptions found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Start by creating your first transcription'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {transcriptions.map((transcription, index) => (
              <Card
                key={transcription.id}
                className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 bg-background/60 backdrop-blur-sm border-border/50 hover:border-primary/50 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms`, animationDuration: '500ms' }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                        Transcription {index + 1}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {transcription.text}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(transcription.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDuration(transcription.audio_duration)}</span>
                    </div>
                    {transcription.language && (
                      <Badge variant="outline" className="text-xs">
                        {transcription.language}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(transcription.text, transcription.id)}
                      className="flex-1 group/btn hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      {copiedId === transcription.id ? (
                        <Copy className="h-4 w-4 mr-1 text-green-468" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(transcription)}
                      className="group/btn hover:bg-destructive hover:text-destructive-foreground transition-all"
                      aria-label="Delete transcription"
                    >
                      <Trash2 className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transcription</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transcription? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
