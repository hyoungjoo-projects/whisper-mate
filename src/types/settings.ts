export type Language = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru' | 'it'

export type AudioQuality = 'low' | 'medium' | 'high'

export type Theme = 'light' | 'dark' | 'system'

export interface KeyboardShortcut {
  action: string
  key: string
  editable: boolean
  description?: string
}

export interface AppSettings {
  // API 설정
  apiKey: string | null
  
  // 언어 설정
  recognitionLanguage: Language
  uiLanguage: Language
  
  // 오디오 품질
  audioQuality: AudioQuality
  
  // 테마
  theme: Theme
  
  // 동작 설정
  autoCopyToClipboard: boolean
  autoSave: boolean
  autoStartRecording: boolean
  
  // 키보드 단축키
  shortcuts: {
    startStopRecording: KeyboardShortcut
    copyText: KeyboardShortcut
    saveTranscription: KeyboardShortcut
  }
}

export const defaultSettings: AppSettings = {
  apiKey: null,
  recognitionLanguage: 'ko',
  uiLanguage: 'ko',
  audioQuality: 'medium',
  theme: 'system',
  autoCopyToClipboard: false,
  autoSave: true,
  autoStartRecording: false,
  shortcuts: {
    startStopRecording: {
      action: '녹음 시작/중지',
      key: 'Ctrl+Shift+R',
      editable: true,
      description: '음성 녹음을 시작하거나 중지합니다',
    },
    copyText: {
      action: '텍스트 복사',
      key: 'Ctrl+Shift+C',
      editable: true,
      description: '현재 전사된 텍스트를 클립보드에 복사합니다',
    },
    saveTranscription: {
      action: '전사 저장',
      key: 'Ctrl+Shift+S',
      editable: true,
      description: '현재 전사된 텍스트를 이력에 저장합니다',
    },
  },
}

export const languageOptions: { value: Language; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'it', label: 'Italiano' },
]

export const uiLanguageOptions: { value: Language; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English(개발중)' },
]

export const audioQualityOptions: { value: AudioQuality; label: string; bitrate: string }[] = [
  { value: 'low', label: 'Low', bitrate: '64kbps' },
  { value: 'medium', label: 'Medium', bitrate: '128kbps' },
  { value: 'high', label: 'High', bitrate: '192kbps' },
]

