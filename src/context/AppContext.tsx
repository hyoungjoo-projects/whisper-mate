import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Transcription } from '../services/transcriptionService'

interface AppState {
  currentTranscription: string
  isRecording: boolean
  isTranscribing: boolean
  recentTranscriptions: Transcription[]
}

type AppAction =
  | { type: 'SET_CURRENT_TRANSCRIPTION'; payload: string }
  | { type: 'SET_IS_RECORDING'; payload: boolean }
  | { type: 'SET_IS_TRANSCRIBING'; payload: boolean }
  | { type: 'ADD_RECENT_TRANSCRIPTION'; payload: Transcription }
  | { type: 'SET_RECENT_TRANSCRIPTIONS'; payload: Transcription[] }
  | { type: 'CLEAR_CURRENT_TRANSCRIPTION' }

const initialState: AppState = {
  currentTranscription: '',
  isRecording: false,
  isTranscribing: false,
  recentTranscriptions: [],
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_TRANSCRIPTION':
      return { ...state, currentTranscription: action.payload }
    case 'SET_IS_RECORDING':
      return { ...state, isRecording: action.payload }
    case 'SET_IS_TRANSCRIBING':
      return { ...state, isTranscribing: action.payload }
    case 'ADD_RECENT_TRANSCRIPTION':
      return {
        ...state,
        recentTranscriptions: [action.payload, ...state.recentTranscriptions].slice(0, 10),
      }
    case 'SET_RECENT_TRANSCRIPTIONS':
      return { ...state, recentTranscriptions: action.payload }
    case 'CLEAR_CURRENT_TRANSCRIPTION':
      return { ...state, currentTranscription: '' }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useAppState() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider')
  }
  return context
}

