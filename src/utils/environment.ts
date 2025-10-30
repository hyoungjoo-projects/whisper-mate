/**
 * Detect if the application is running in Electron environment
 */
export const isElectron = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.navigator?.userAgent?.toLowerCase().indexOf('electron') > -1
  )
}

/**
 * Get the Electron API object from window
 */
export const getElectronAPI = (): {
  copyToClipboard?: (text: string) => Promise<boolean>
} | null => {
  if (isElectron() && typeof window !== 'undefined') {
    return (window as any).electron || null
  }
  return null
}

/**
 * Get the Electron API for receiving messages from main process
 */
export const getElectronEventAPI = (): {
  onStartRecording?: (callback: () => void) => void
  removeStartRecordingListener?: (callback: () => void) => void
} | null => {
  if (isElectron() && typeof window !== 'undefined') {
    return (window as any).electronAPI || null
  }
  return null
}

