import { useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Mic, Square, AlertCircle } from 'lucide-react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import WaveSurfer from 'wavesurfer.js'
import { Progress } from './ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const {
    isRecording,
    audioDuration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useAudioRecorder()
  
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Initialize WaveSurfer
  useEffect(() => {
    if (waveformRef.current && !wavesurferRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'hsl(var(--muted-foreground))',
        progressColor: 'hsl(var(--primary))',
        height: 80,
        cursorWidth: 0,
        barWidth: 2,
        barGap: 3,
        normalize: true,
        interact: false,
      })
    }
    
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy()
        wavesurferRef.current = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Real-time waveform visualization during recording
  useEffect(() => {
    if (isRecording && !audioContextRef.current) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        audioStreamRef.current = stream
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext
        
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        analyserRef.current = analyser
        
        source.connect(analyser)
        
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        
        const updateWaveform = () => {
          if (analyserRef.current && wavesurferRef.current && isRecording) {
            analyserRef.current.getByteFrequencyData(dataArray)
            
            // Simple visualization update
            // const max = Math.max(...Array.from(dataArray.slice(0, 100)))
            // const normalized = max / 255
            // Visual feedback can be implemented here if needed
            
            // Update waveform visualization
            if (wavesurferRef.current) {
              // Create simple visual feedback
              const canvas = waveformRef.current?.querySelector('canvas')
              if (canvas && wavesurferRef.current) {
                // Visual feedback could be added here
              }
            }
            
            animationFrameRef.current = requestAnimationFrame(updateWaveform)
          }
        }
        
        updateWaveform()
      }).catch((err) => {
        console.error('Error setting up audio visualization:', err)
      })
    } else if (!isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
        audioStreamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [isRecording])

  // Load recorded audio into WaveSurfer after recording
  useEffect(() => {
    if (audioBlob && !isRecording && wavesurferRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob)
      wavesurferRef.current.load(audioUrl)
      
      onRecordingComplete(audioBlob, audioDuration)
      
      // Clean up object URL after WaveSurfer loads it
      return () => {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioBlob, isRecording, audioDuration, onRecordingComplete])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Error Dialog */}
      <Dialog open={!!error} onOpenChange={() => reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              녹음 오류
            </DialogTitle>
            <DialogDescription>
              {error?.message || '마이크 접근에 실패했습니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              가능한 해결 방법:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>브라우저에서 마이크 권한을 허용했는지 확인하세요</li>
              <li>다른 애플리케이션이 마이크를 사용 중이 아닌지 확인하세요</li>
              <li>마이크가 올바르게 연결되어 있는지 확인하세요</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Waveform Visualization */}
      <div className="w-full h-20 bg-muted rounded-lg flex items-center justify-center">
        {waveformRef.current && (
          <div ref={waveformRef} className="w-full h-full" />
        )}
        {!isRecording && !audioBlob && (
          <p className="text-sm text-muted-foreground">녹음 버튼을 눌러 시작하세요</p>
        )}
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4">
        {/* Recording Button */}
        <Button
          size="lg"
          variant={isRecording ? 'destructive' : 'default'}
          className="rounded-full w-20 h-20 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!error}
          aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
        >
          {isRecording ? (
            <Square className="h-8 w-8" fill="currentColor" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </Button>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-lg font-semibold">
                녹음 중: {formatDuration(audioDuration)}
              </span>
            </div>
            <Progress value={(audioDuration % 60) * (100 / 60)} className="w-48" />
          </div>
        )}

        {/* Recorded Duration */}
        {audioBlob && !isRecording && (
          <div className="text-sm text-muted-foreground">
            녹음 완료: {formatDuration(audioDuration)}
          </div>
        )}
      </div>
    </div>
  )
}

