import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Download, Copy, Trash2, Volume2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useSettings } from '../context/SettingsContext'
import { useTranscriptionState } from '../hooks/useTranscriptionState'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useClipboard } from '../hooks/useClipboard'
import { transcribeAudio, type TranscriptionError } from '../services/whisperService'
import { toast } from 'sonner'
import { getElectronEventAPI, isElectron } from '../utils/environment'
import { saveTranscription } from '../services/transcriptionService'

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
  const { settings } = useSettings()
  const {
    currentTranscription,
    isTranscribing: appIsTranscribing,
    setCurrentTranscription,
    setIsTranscribing,
    saveAndCopyTranscription,
  } = useTranscriptionState()
  const { copy } = useClipboard()

  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([
    {
      id: '1',
      text: 'This is a sample transcription. Your recorded audio will appear here after processing.',
      duration: '0:05',
      timestamp: new Date(),
    },
  ])
  const timerRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const savedTranscriptionRef = useRef<string | null>(null)
  const processedAudioBlobRef = useRef<Blob | null>(null)

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

  // Listen for Electron global shortcut events
  useEffect(() => {
    if (isElectron() && !isRecording) {
      const electronEventAPI = getElectronEventAPI()
      if (electronEventAPI?.onStartRecording) {
        const handleStartRecording = () => {
          if (!isRecording && !appIsTranscribing) {
            startRecording()
          }
        }

        electronEventAPI.onStartRecording(handleStartRecording)

        return () => {
          if (electronEventAPI.removeStartRecordingListener) {
            electronEventAPI.removeStartRecordingListener(handleStartRecording)
          }
        }
      }
    }
  }, [isRecording, appIsTranscribing, startRecording])

  // Auto-process audioBlob when it becomes available after recording stops
  useEffect(() => {
    // 이미 처리된 audioBlob인지 확인
    const isAlreadyProcessed = processedAudioBlobRef.current === audioBlob
    
    if (!isRecording && audioBlob && audioDuration > 0 && !processingRef.current && !isAlreadyProcessed) {
      console.log('[HomePage] Starting transcription for new audioBlob')
      
      // 현재 설정값들을 저장 (의존성 변경으로 인한 재실행 방지)
      const currentApiKey = settings.apiKey
      const currentLanguage = settings.recognitionLanguage
      const currentAutoSave = settings.autoSave
      const currentAutoCopy = settings.autoCopyToClipboard
      const currentDuration = audioDuration
      
      processingRef.current = true
      processedAudioBlobRef.current = audioBlob // 처리 시작 전에 마킹
      savedTranscriptionRef.current = null // 새 녹음 시작 시 리셋
      
      // API 키 확인
      if (!currentApiKey) {
        toast.error('API 키가 설정되지 않았습니다.', {
          description: '설정 페이지에서 OpenAI API 키를 입력해주세요.',
          action: {
            label: '설정으로 이동',
            onClick: () => {
              window.location.href = '/settings'
            },
          },
        })
        processingRef.current = false
        processedAudioBlobRef.current = null // 리셋하여 재시도 가능하게
        return
      }

      setIsTranscribing(true)
      toast.loading('오디오를 전사하는 중...', { id: 'transcribing' })

      transcribeAudio(
        audioBlob,
        currentApiKey,
        currentLanguage
      )
        .then((result) => {
          // 이미 저장/복사된 텍스트인지 확인 (중복 방지)
          if (savedTranscriptionRef.current === result.text) {
            console.log('[HomePage] Transcription already processed, skipping')
            return
          }

          console.log('[HomePage] Transcription completed, adding to list')

          const newTranscription: TranscriptionResult = {
            id: Date.now().toString(),
            text: result.text,
            duration: formatTime(currentDuration),
            timestamp: new Date(),
          }

          setTranscriptions((prev) => [newTranscription, ...prev])
          setCurrentTranscription(result.text)

          toast.success('전사가 완료되었습니다.', { id: 'transcribing' })

          // 자동 저장 및 복사 (설정에서 활성화된 경우)
          // 한 번만 실행되도록 체크
          if (currentAutoSave || currentAutoCopy) {
            savedTranscriptionRef.current = result.text // 저장 시작 전에 플래그 설정
            saveAndCopyTranscription(result.text, currentDuration, result.language)
              .then(() => {
                // 성공 시 플래그는 유지 (중복 방지)
              })
              .catch((error) => {
                // 실패 시에도 플래그는 유지하여 반복 시도 방지
                console.error('Save or copy failed:', error)
              })
          }
        })
        .catch((error) => {
          const transcriptionError = error as TranscriptionError
          console.error('Transcription error:', transcriptionError)

          let errorMessage = transcriptionError.message || '전사에 실패했습니다.'
          let errorDescription = ''

          switch (transcriptionError.code) {
            case 'INVALID_API_KEY':
              errorDescription = '설정 페이지에서 API 키를 확인해주세요.'
              break
            case 'NETWORK_ERROR':
              errorDescription = '인터넷 연결을 확인해주세요.'
              break
            case 'FILE_ERROR':
              errorDescription = '오디오 파일 형식이나 크기를 확인해주세요.'
              break
            case 'MAX_RETRIES_EXCEEDED':
              errorDescription = '잠시 후 다시 시도해주세요.'
              break
            default:
              errorDescription = '잠시 후 다시 시도해주세요.'
          }

          toast.error(errorMessage, {
            id: 'transcribing',
            description: errorDescription,
            duration: 5000,
          })

          // API 키 오류인 경우 설정 페이지로 안내
          if (transcriptionError.code === 'INVALID_API_KEY') {
            setTimeout(() => {
              window.location.href = '/settings'
            }, 3000)
          }
        })
        .finally(() => {
          setIsTranscribing(false)
          processingRef.current = false
          // audioBlob은 유지 (다른 곳에서 사용할 수 있으므로)
          // 하지만 같은 blob에 대한 재처리는 processedAudioBlobRef로 방지됨
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, isRecording, audioDuration]) // 의존성을 최소화하여 재실행 방지

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRecordToggle = async () => {
    console.log('[HomePage] handleRecordToggle called, isRecording:', isRecording)
    if (isRecording) {
      stopRecording()
      // 전사는 useEffect에서 자동으로 처리되므로 여기서는 녹음만 중지
    } else {
      // 새 녹음 시작 시 이전 처리 플래그 리셋
      savedTranscriptionRef.current = null
      processingRef.current = false // 처리 플래그도 리셋
      processedAudioBlobRef.current = null // 처리된 audioBlob 리셋
      startRecording()
    }
  }

  const handleCopy = async (text: string) => {
    if (text) {
      await copy(text)
    }
  }

  const handleSaveTranscription = async (text: string) => {
    if (!text.trim()) {
      toast.error('저장할 텍스트가 없습니다')
      return
    }

    try {
      await saveTranscription(text, audioDuration)
      toast.success('전사가 저장되었습니다')
    } catch (error) {
      console.error('Failed to save transcription:', error)
      toast.error('저장에 실패했습니다')
    }
  }

  const handleDelete = (id: string) => {
    setTranscriptions(transcriptions.filter((t) => t.id !== id))
    if (currentTranscription && transcriptions.find((t) => t.id === id)?.text === currentTranscription) {
      setCurrentTranscription('')
    }
  }

  // 키보드 단축키 설정
  useKeyboardShortcuts({
    startStopRecording: handleRecordToggle,
    copyText: handleCopy,
    saveTranscription: handleSaveTranscription,
    currentTranscription: currentTranscription,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
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
                  disabled={appIsTranscribing}
                  className={`w-32 h-32 rounded-full transition-all duration-300 flex items-center justify-center ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
                      : appIsTranscribing
                      ? 'bg-muted cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/50'
                  }`}
                >
                  {appIsTranscribing ? (
                    <Loader2 className="w-24 h-24 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-24 h-24" fill="currentColor" />
                  ) : (
                    <Mic className="w-24 h-24" />
                  )}
                </Button>

                <p className="text-sm text-muted-foreground">
                  {appIsTranscribing
                    ? '전사 중...'
                    : isRecording
                    ? 'Click to stop recording'
                    : 'Click to start recording'}
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
                data-transcription-text={currentTranscription}
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
