import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Download, Copy, Trash2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

interface AudioVisualizerProps {
  isRecording: boolean
  audioLevel?: number
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording }) => {
  const bars = 40

  return (
    <div className="flex items-center justify-center gap-1 h-32">
      {Array.from({ length: bars }).map((_, i) => {
        const height = isRecording ? Math.random() * 80 + 20 : 20
        const delay = i * 0.05

        return (
          <div
            key={i}
            className="w-1 bg-gradient-to-t from-primary/60 to-primary rounded-full transition-all duration-150"
            style={{
              height: `${height}%`,
              opacity: isRecording ? 0.8 : 0.3,
              animationDelay: `${delay}s`,
            }}
          />
        )
      })}
    </div>
  )
}

interface TranscriptionResult {
  id: string
  text: string
  duration: string
  timestamp: Date
}

export default function HomePage() {
  const {
    isRecording,
    audioDuration,
    audioBlob,
    startRecording,
    stopRecording,
  } = useAudioRecorder()

  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([
    {
      id: '1',
      text: 'This is a sample transcription. Your recorded audio will appear here after processing.',
      duration: '0:05',
      timestamp: new Date(),
    },
  ])
  const [currentTranscription, setCurrentTranscription] = useState('')
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        // Timer will use audioDuration from hook
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording()
      if (audioDuration > 0 && audioBlob) {
        // TODO: Task #5에서 Whisper API 통합 후 실제 전사 구현
        // 현재는 UI만 표시
        const newTranscription: TranscriptionResult = {
          id: Date.now().toString(),
          text: 'New transcription from your recording. This is where the AI-powered transcription would appear.',
          duration: formatTime(audioDuration),
          timestamp: new Date(),
        }
        setTranscriptions([newTranscription, ...transcriptions])
        setCurrentTranscription(newTranscription.text)
      }
    } else {
      startRecording()
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleDelete = (id: string) => {
    setTranscriptions(transcriptions.filter((t) => t.id !== id))
    if (currentTranscription && transcriptions.find((t) => t.id === id)?.text === currentTranscription) {
      setCurrentTranscription('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Whisper Mate
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered voice transcription at your fingertips. Record, transcribe, and manage your audio with ease.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Badge variant="secondary" className="px-4 py-2 text-base font-medium">
              Real-time Processing
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-base font-medium">
              High Accuracy
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-base font-medium">
              Multi-language
            </Badge>
          </div>
        </div>

        {/* Recorder Card */}
        <Card className="mb-8 overflow-hidden border-2 shadow-xl">
          <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8">
            <div className="space-y-6">
              {/* Waveform Visualizer */}
              <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50">
                <AudioVisualizer isRecording={isRecording} />
              </div>

              {/* Recording Controls */}
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-foreground mb-2">
                    {formatTime(audioDuration)}
                  </div>
                  {isRecording && (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm text-muted-foreground">Recording...</span>
                    </div>
                  )}
                </div>

                <Button
                  size="lg"
                  onClick={handleRecordToggle}
                  className={`w-32 h-32 rounded-full transition-all duration-300 flex items-center justify-center ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
                      : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/50'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-24 h-24" fill="currentColor" />
                  ) : (
                    <Mic className="w-24 h-24" />
                  )}
                </Button>

                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Click to stop recording' : 'Click to start recording'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Current Transcription */}
        {currentTranscription && (
          <Card className="mb-8 p-6 border-2 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Latest Transcription</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(currentTranscription)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              <Textarea
                value={currentTranscription}
                onChange={(e) => setCurrentTranscription(e.target.value)}
                className="min-h-[120px] resize-none"
                placeholder="Your transcription will appear here..."
              />
            </div>
          </Card>
        )}

        {/* Transcription History */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Recent Transcriptions</h2>
          <div className="grid gap-4">
            {transcriptions.map((transcription) => (
              <Card
                key={transcription.id}
                className="p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {transcription.duration}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {transcription.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        {transcription.text}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(transcription.text)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(transcription.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Powered by advanced AI transcription technology</p>
        </div>
      </div>
    </div>
  )
}
