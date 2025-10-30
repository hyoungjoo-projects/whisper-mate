import { useAppState } from '../context/AppContext'
import { useSettings } from '../context/SettingsContext'
import { saveTranscription, type Transcription } from '../services/transcriptionService'
import { useClipboard } from './useClipboard'

export function useTranscriptionState() {
  const { state, dispatch } = useAppState()
  const { settings } = useSettings()
  const { copy, isCopying } = useClipboard()

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

  const saveAndCopyTranscription = async (
    text: string,
    audioDuration: number,
    language?: string
  ): Promise<Transcription | null> => {
    try {
      // Save to database (if autoSave is enabled)
      let savedTranscription: Transcription | null = null
      if (settings.autoSave) {
        savedTranscription = await saveTranscription(text, audioDuration, language)
        if (savedTranscription) {
          addRecentTranscription(savedTranscription)
        }
      }

      // Copy to clipboard (if autoCopyToClipboard is enabled)
      if (settings.autoCopyToClipboard) {
        await copy(text)
      }

      return savedTranscription
    } catch (error) {
      console.error('Error in saveAndCopyTranscription:', error)
      // 에러는 각 함수에서 처리되므로 여기서는 로그만 남김
      return null
    }
  }

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

