/**
 * Type definitions for Electron APIs exposed through the preload script
 */

interface ElectronAPI {
  copyToClipboard: (text: string) => Promise<boolean>
}

interface ElectronEventAPI {
  onStartRecording: (callback: () => void) => void
  removeStartRecordingListener: (callback: () => void) => void
}

interface Window {
  electron?: ElectronAPI
  electronAPI?: ElectronEventAPI
}
