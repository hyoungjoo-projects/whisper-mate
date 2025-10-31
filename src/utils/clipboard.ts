import { getElectronAPI, isElectron } from './environment'

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    console.warn('[Clipboard] No text provided')
    return false
  }

  try {
    // Use Electron API if available (for desktop app)
    if (isElectron()) {
      const electronAPI = getElectronAPI()
      if (electronAPI?.copyToClipboard) {
        try {
          const result = await electronAPI.copyToClipboard(text)
          if (result === true) {
            return true
          }
          // Fall through to web fallback
        } catch (error) {
          console.error('[Clipboard] Electron clipboard error:', error)
          // Fall through to web fallback
        }
      }
    }

    // Use modern Clipboard API if available (for web)
    // 웹에서는 사용자 인터랙션에 직접 응답해야 함
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const isSecure = typeof isSecureContext !== 'undefined' && isSecureContext
      
      if (isSecure) {
        try {
          await navigator.clipboard.writeText(text)
          return true
        } catch (error) {
          console.error('[Clipboard] Clipboard API error:', error)
          // Fall through to fallback
        }
      }
    }
    
    // Fallback: execCommand (웹에서도 작동하며 사용자 인터랙션 필요)
    if (typeof document !== 'undefined' && document.body) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.top = '0'
      textArea.style.left = '0'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      textArea.setAttribute('readonly', '')
      textArea.setAttribute('aria-hidden', 'true')
      
      document.body.appendChild(textArea)
      
      // iOS Safari requires focus and selection
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        textArea.contentEditable = 'true'
        textArea.readOnly = false
        const range = document.createRange()
        range.selectNodeContents(textArea)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
        textArea.setSelectionRange(0, 999999)
      } else {
        textArea.focus()
        textArea.select()
      }
      
      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (successful) {
          return true
        }
        return false
      } catch (err) {
        console.error('[Clipboard] execCommand copy error:', err)
        document.body.removeChild(textArea)
        return false
      }
    }
    
    return false
  } catch (error) {
    console.error('[Clipboard] Failed to copy text:', error)
    return false
  }
}

