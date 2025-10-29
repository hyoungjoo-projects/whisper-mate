import { useState } from 'react'
import { Search, Filter, Eye, Edit2, Copy, Trash2, Clock, Calendar, FileText, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Transcription {
  id: string
  title: string
  content: string
  timestamp: string
  duration: number
  language: string
  status: 'completed' | 'processing' | 'failed'
}

const mockTranscriptions: Transcription[] = [
  {
    id: '1',
    title: 'Team Meeting Notes',
    content:
      'Discussion about Q4 roadmap and feature priorities. Key points: focus on user experience improvements, implement new analytics dashboard, and optimize performance for mobile devices.',
    timestamp: '2024-01-15T10:30:00',
    duration: 1845,
    language: 'English',
    status: 'completed',
  },
  {
    id: '2',
    title: 'Client Interview',
    content:
      'Interview with potential client about their requirements for the new project. They need a comprehensive solution that includes real-time collaboration features.',
    timestamp: '2024-01-14T14:20:00',
    duration: 2730,
    language: 'English',
    status: 'completed',
  },
  {
    id: '3',
    title: 'Product Demo Recording',
    content:
      'Demonstration of the new features including voice recognition, multi-language support, and export capabilities. The demo covered all major use cases.',
    timestamp: '2024-01-13T09:15:00',
    duration: 1260,
    language: 'English',
    status: 'completed',
  },
  {
    id: '4',
    title: 'Podcast Episode 42',
    content:
      'Discussion about the future of AI in transcription services and how it impacts content creators. Guest speaker shared insights on industry trends.',
    timestamp: '2024-01-12T16:45:00',
    duration: 3600,
    language: 'English',
    status: 'completed',
  },
]

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  return `${minutes}m ${secs}s`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function HistoryPage() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>(mockTranscriptions)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredTranscriptions = transcriptions.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || t.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const handleView = (transcription: Transcription) => {
    setSelectedTranscription(transcription)
    setViewDialogOpen(true)
  }

  const handleEdit = (transcription: Transcription) => {
    setSelectedTranscription(transcription)
    setEditContent(transcription.content)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (selectedTranscription) {
      setTranscriptions((prev) =>
        prev.map((t) => (t.id === selectedTranscription.id ? { ...t, content: editContent } : t))
      )
      setEditDialogOpen(false)
    }
  }

  const handleCopy = async (transcription: Transcription) => {
    await navigator.clipboard.writeText(transcription.content)
    setCopiedId(transcription.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (transcription: Transcription) => {
    setSelectedTranscription(transcription)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedTranscription) {
      setTranscriptions((prev) => prev.filter((t) => t.id !== selectedTranscription.id))
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
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
              className="pl-10 bg-background/60 backdrop-blur-sm border-border/50 focus:border-primary transition-all"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] bg-background/60 backdrop-blur-sm border-border/50">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredTranscriptions.length === 0 ? (
          <Card className="border-dashed border-2 bg-background/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-primary/10 p-6 mb-4">
                <FileText className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No transcriptions found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by creating your first transcription'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {filteredTranscriptions.map((transcription, index) => (
              <Card
                key={transcription.id}
                className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 bg-background/60 backdrop-blur-sm border-border/50 hover:border-primary/50 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms`, animationDuration: '500ms' }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                        {transcription.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {transcription.content}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={transcription.status === 'completed' ? 'default' : 'secondary'}
                      className="ml-2 shrink-0"
                    >
                      {transcription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(transcription.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDuration(transcription.duration)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(transcription)}
                      className="flex-1 group/btn hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Eye className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(transcription)}
                      className="flex-1 group/btn hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <Edit2 className="h-4 w-4 mr-1 group-hover/btn:scale-110 transition-transform" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(transcription)}
                      className="group/btn hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      {copiedId === transcription.id ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(transcription)}
                      className="group/btn hover:bg-destructive hover:text-destructive-foreground transition-all"
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

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTranscription?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {selectedTranscription && formatDate(selectedTranscription.timestamp)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {selectedTranscription && formatDuration(selectedTranscription.duration)}
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {selectedTranscription?.content}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transcription</DialogTitle>
            <DialogDescription>Make changes to your transcription content</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[300px] resize-none"
              placeholder="Enter transcription content..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transcription</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTranscription?.title}"? This action cannot
              be undone.
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
