import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { defaultSettings } from '../types/settings'
import type { AppSettings } from '../types/settings'
import { useTheme } from '../components/theme-provider'

interface SettingsContextType {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
  exportSettings: () => string
  importSettings: (json: string) => boolean
  setApiKey: (key: string | null) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const SETTINGS_STORAGE_KEY = 'whisper-mate-settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 마이그레이션: panelRecording 제거
        if (parsed.shortcuts && parsed.shortcuts.panelRecording) {
          delete parsed.shortcuts.panelRecording
        }
        const migrated = { ...defaultSettings, ...parsed }
        // shortcuts도 마이그레이션 적용
        if (migrated.shortcuts) {
          migrated.shortcuts = { ...defaultSettings.shortcuts, ...migrated.shortcuts }
          delete migrated.shortcuts.panelRecording
        }
        return migrated
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    return defaultSettings
  })

  // 테마 동기화
  useEffect(() => {
    setTheme(settings.theme)
  }, [settings.theme, setTheme])

  // panelRecording 제거 마이그레이션 (설정 상태에서 제거)
  useEffect(() => {
    if (settings.shortcuts && 'panelRecording' in settings.shortcuts) {
      const { panelRecording, ...shortcuts } = settings.shortcuts
      setSettings((prev) => ({
        ...prev,
        shortcuts: shortcuts as AppSettings['shortcuts'],
      }))
    }
  }, [settings.shortcuts])

  // 설정 저장
  useEffect(() => {
    try {
      // panelRecording 제거 후 저장
      const settingsToSave = { ...settings }
      if (settingsToSave.shortcuts && settingsToSave.shortcuts.panelRecording) {
        const { panelRecording, ...shortcuts } = settingsToSave.shortcuts
        settingsToSave.shortcuts = shortcuts as AppSettings['shortcuts']
      }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [settings])

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2)
  }

  const importSettings = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json)
      setSettings((prev) => ({ ...defaultSettings, ...prev, ...parsed }))
      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }

  const setApiKey = (key: string | null) => {
    updateSettings({ apiKey: key })
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        exportSettings,
        importSettings,
        setApiKey,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

