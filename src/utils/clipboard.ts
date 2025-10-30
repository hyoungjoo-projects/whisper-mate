import { getElectronAPI, isElectron } from './environment'

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false
  }

  try {
    // Use Electron API if available (for desktop app)
    if (isElectron()) {
      const electronAPI = getElectronAPI()
      if (electronAPI?.copyToClipboard) {
        try {
          return await electronAPI.copyToClipboard(text)
        } catch (error) {
          console.error('Electron clipboard error:', error)
          // Fall through to web fallback
        }
      }
    }

    // Use modern Clipboard API if available (for web)
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.top = '0'
      textArea.style.left = '0'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        return successful
      } catch (err) {
        document.body.removeChild(textArea)
        return false
      }
    }
  } catch (error) {
    console.error('Failed to copy text:', error)
    return false
  }
}

