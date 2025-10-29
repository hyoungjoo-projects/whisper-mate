import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      
      streamRef.current = stream
      
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('audio/webm') && !MediaRecorder.isTypeSupported('audio/wav')) {
        throw new Error('Audio recording is not supported in this browser')
      }
      
      // Determine the best audio format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/wav')
        ? 'audio/wav'
        : 'audio/ogg'
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        })
        setAudioBlob(audioBlob)
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }
      
      mediaRecorder.onerror = (event) => {
        const error = new Error('Recording error occurred')
        setError(error)
        console.error('MediaRecorder error:', event)
      }
      
      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      startTimeRef.current = Date.now()
      setIsRecording(true)
      
      // Update duration every 100ms
      timerRef.current = window.setInterval(() => {
        setAudioDuration((Date.now() - startTimeRef.current) / 1000)
      }, 100)
    } catch (err) {
      const error = err instanceof Error 
        ? err 
        : new Error('Failed to access microphone')
      setError(error)
      setIsRecording(false)
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const reset = useCallback(() => {
    setAudioBlob(null)
    setAudioDuration(0)
    setError(null)
    audioChunksRef.current = []
  }, [])

  return {
    isRecording,
    audioDuration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    reset,
  }
}

