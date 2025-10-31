import { useEffect, useRef } from 'react'
import { useSettings } from '../context/SettingsContext'
import { matchesShortcut } from '../utils/keyboardShortcuts'

interface KeyboardShortcutCallbacks {
  startStopRecording?: () => void
  copyText?: (text?: string) => void
  saveTranscription?: (text?: string) => void
  currentTranscription?: string // 현재 전사된 텍스트
}

/**
 * 키보드 단축키를 처리하는 훅
 * @param callbacks - 각 단축키에 대한 콜백 함수들
 */
export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  const { settings } = useSettings()
  const callbacksRef = useRef(callbacks)

  // 콜백 참조 업데이트
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    // 디버깅: 훅이 마운트되었는지 확인
    if (process.env.NODE_ENV === 'development') {
      console.log('[Keyboard Shortcuts] Hook mounted with shortcuts:', settings.shortcuts)
      console.log('[Keyboard Shortcuts] Callbacks:', {
        hasStartStop: !!callbacks.startStopRecording,
        hasCopyText: !!callbacks.copyText,
        hasSaveTranscription: !!callbacks.saveTranscription,
      })
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      // 수정자 키(Control, Shift, Alt, Meta)만 눌린 경우 무시
      // 실제 키(알파벳, 숫자 등)가 눌린 경우만 처리
      const isModifierOnly = 
        event.key === 'Control' || 
        event.key === 'Shift' || 
        event.key === 'Alt' || 
        event.key === 'Meta' ||
        event.code === 'ControlLeft' ||
        event.code === 'ControlRight' ||
        event.code === 'ShiftLeft' ||
        event.code === 'ShiftRight' ||
        event.code === 'AltLeft' ||
        event.code === 'AltRight' ||
        event.code === 'MetaLeft' ||
        event.code === 'MetaRight'
      
      if (isModifierOnly) {
        // 수정자 키만 눌린 경우는 무시 (다른 키와 조합될 때까지 대기)
        return
      }

      // 단축키 확인 (먼저 확인하여 브라우저 기본 동작 방지)
      const shortcuts = settings.shortcuts

      // 입력 필드나 텍스트 영역에 포커스가 있으면 단축키 무시
      const target = event.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || 
                             target.tagName === 'TEXTAREA' || 
                             target.isContentEditable
      
      // Escape 키는 예외적으로 허용 (편집 취소 등)
      if (isInputFocused && event.key !== 'Escape') {
        if (process.env.NODE_ENV === 'development' && event.ctrlKey) {
          console.log('[Keyboard Shortcuts] Ignored: input field focused')
        }
        return
      }

      // 디버깅: 모든 키 이벤트 로그 (개발 환경)
      if (process.env.NODE_ENV === 'development' && (event.ctrlKey || event.shiftKey)) {
        console.log('[Keyboard Shortcuts] Key pressed:', {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          target: target?.tagName,
        })
      }

      // 녹음 시작/중지 - 먼저 확인하여 preventDefault
      if (shortcuts.startStopRecording) {
        const matches = matchesShortcut(event, shortcuts.startStopRecording.key)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Keyboard Shortcuts] Checking startStopRecording:', {
            shortcut: shortcuts.startStopRecording.key,
            matches,
            hasCallback: !!callbacksRef.current.startStopRecording,
          })
        }
        if (matches) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          console.log('[Keyboard Shortcuts] ✅ MATCH! Triggering startStopRecording callback')
          if (callbacksRef.current.startStopRecording) {
            callbacksRef.current.startStopRecording()
          } else {
            console.error('[Keyboard Shortcuts] ❌ ERROR: startStopRecording callback is missing!')
          }
          return
        }
      }

      // 텍스트 복사
      if (shortcuts.copyText && matchesShortcut(event, shortcuts.copyText.key)) {
        event.preventDefault()
        // 현재 전사 텍스트 찾기 (우선순위: 콜백의 currentTranscription > DOM 요소)
        const textFromCallback = callbacksRef.current.currentTranscription
        const transcriptionElement = document.querySelector('[data-transcription-text]') as HTMLElement
        const textFromDOM = transcriptionElement?.textContent?.trim() || 
                          transcriptionElement?.getAttribute('data-transcription-text') || ''
        const currentText = textFromCallback || textFromDOM
        
        if (currentText && callbacksRef.current.copyText) {
          callbacksRef.current.copyText(currentText)
        }
        return
      }

      // 전사 저장
      if (shortcuts.saveTranscription && matchesShortcut(event, shortcuts.saveTranscription.key)) {
        event.preventDefault()
        const textFromCallback = callbacksRef.current.currentTranscription
        const transcriptionElement = document.querySelector('[data-transcription-text]') as HTMLElement
        const textFromDOM = transcriptionElement?.textContent?.trim() || 
                          transcriptionElement?.getAttribute('data-transcription-text') || ''
        const currentText = textFromCallback || textFromDOM
        
        if (currentText && callbacksRef.current.saveTranscription) {
          callbacksRef.current.saveTranscription(currentText)
        }
        return
      }
    }

    // window와 document 모두에 리스너 추가 (이벤트 캡처 보장)
    window.addEventListener('keydown', handleKeyDown, true) // capture phase
    document.addEventListener('keydown', handleKeyDown, true) // capture phase

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [settings.shortcuts])
}

