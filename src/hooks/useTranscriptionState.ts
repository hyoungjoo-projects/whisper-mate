import { useCallback, useRef } from 'react'
import { useAppState } from '../context/AppContext'
import { useSettings } from '../context/SettingsContext'
import { saveTranscription, type Transcription } from '../services/transcriptionService'
import { useClipboard } from './useClipboard'
import { isElectron } from '../utils/environment'

export function useTranscriptionState() {
  const { state, dispatch } = useAppState()
  const { settings } = useSettings()
  const { copy, isCopying } = useClipboard()
  const processingRef = useRef<Set<string>>(new Set()) // 처리 중인 텍스트 추적

  const setCurrentTranscription = (text: string) => {
    dispatch({ type: 'SET_CURRENT_TRANSCRIPTION', payload: text })
  }

  const setIsRecording = (isRecording: boolean) => {
    dispatch({ type: 'SET_IS_RECORDING', payload: isRecording })
  }

  const setIsTranscribing = (isTranscribing: boolean) => {
    dispatch({ type: 'SET_IS_TRANSCRIBING', payload: isTranscribing })
  }

  const addRecentTranscription = (transcription: Transcription) => {
    dispatch({ type: 'ADD_RECENT_TRANSCRIPTION', payload: transcription })
  }

  const clearCurrentTranscription = () => {
    dispatch({ type: 'CLEAR_CURRENT_TRANSCRIPTION' })
  }

  const saveAndCopyTranscription = useCallback(async (
    text: string,
    audioDuration: number,
    language?: string
  ): Promise<Transcription | null> => {
    // 중복 처리 방지: 같은 텍스트는 한 번만 처리
    const textKey = `${text}_${audioDuration}_${language || ''}`
    if (processingRef.current.has(textKey)) {
      console.log('Transcription already being processed, skipping:', textKey)
      return null
    }

    // 처리 시작 표시
    processingRef.current.add(textKey)

    try {
      // Save to database (if autoSave is enabled)
      // 저장 실패는 중요한 에러이므로 throw함
      let savedTranscription: Transcription | null = null
      if (settings.autoSave) {
        try {
          savedTranscription = await saveTranscription(text, audioDuration, language)
          if (savedTranscription) {
            addRecentTranscription(savedTranscription)
          }
        } catch (error) {
          console.error('Error saving transcription:', error)
          // 저장 실패는 중요한 에러이지만, 전사는 완료되었으므로 사용자는 다시 녹음할 수 있어야 함
          // 에러는 각 서비스에서 토스트로 표시되므로 여기서는 로그만 남김
        }
      }

      // Copy to clipboard (if autoCopyToClipboard is enabled)
      // 웹 환경에서는 사용자 인터랙션 없이 자동 복사가 실패할 수 있음
      // Electron 환경에서만 자동 복사, 웹에서는 사용자가 버튼을 클릭해야 함
      if (settings.autoCopyToClipboard) {
        try {
          if (isElectron()) {
            // Electron에서는 자동 복사 가능
            await copy(text)
          } else {
            // 웹에서는 자동 복사 건너뛰기 (브라우저 보안 정책으로 사용자 인터랙션 필요)
            // 사용자가 복사 버튼을 클릭하면 그때 복사됨
            console.log('[TranscriptionState] Web environment: auto-copy skipped, user must click copy button')
          }
        } catch (error) {
          // 복사 실패는 이미 useClipboard에서 토스트로 표시되므로 로그만 남김
          // 실패해도 재시도하지 않음
          console.error('Error copying to clipboard:', error)
        }
      }

      return savedTranscription
    } finally {
      // 처리 완료 후에도 플래그 유지하여 재시도 방지 (같은 텍스트는 한 번만)
      // 다음 녹음 시 플래그는 HomePage에서 리셋됨
    }
  }, [settings.autoSave, settings.autoCopyToClipboard, copy, addRecentTranscription])

  return {
    // State
    currentTranscription: state.currentTranscription,
    isRecording: state.isRecording,
    isTranscribing: state.isTranscribing,
    recentTranscriptions: state.recentTranscriptions,
    isCopying,

    // Actions
    setCurrentTranscription,
    setIsRecording,
    setIsTranscribing,
    addRecentTranscription,
    clearCurrentTranscription,
    saveAndCopyTranscription,
  }
}

