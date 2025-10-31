/**
 * 키보드 단축키 관련 유틸리티 함수
 */

/**
 * 단축키 문자열을 파싱하여 키 이벤트와 비교 가능한 형태로 변환
 * @param shortcutStr - 단축키 문자열 (예: "Ctrl+Shift+R", "Meta+Shift+P")
 * @returns 파싱된 단축키 정보
 */
export interface ParsedShortcut {
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
  key: string
}

export function parseShortcut(shortcutStr: string): ParsedShortcut | null {
  if (!shortcutStr) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Keyboard Shortcuts] Empty shortcut string')
    }
    return null
  }

  const parts = shortcutStr.split('+').map(s => s.trim())
  const parsed: ParsedShortcut = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: '',
  }

  for (const part of parts) {
    const lower = part.toLowerCase()
    
    if (lower === 'ctrl' || lower === 'control') {
      parsed.ctrl = true
    } else if (lower === 'shift') {
      parsed.shift = true
    } else if (lower === 'alt' || lower === 'option') {
      parsed.alt = true
    } else if (lower === 'meta' || lower === 'cmd' || lower === 'command') {
      parsed.meta = true
    } else {
      // 마지막 파트가 실제 키
      parsed.key = part.toUpperCase()
    }
  }

  // 키가 없으면 유효하지 않음
  if (!parsed.key) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Keyboard Shortcuts] No key found in shortcut:', shortcutStr, parts)
    }
    return null
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Keyboard Shortcuts] Parsed shortcut:', shortcutStr, '->', parsed)
  }

  return parsed
}

/**
 * 키보드 이벤트가 단축키와 일치하는지 확인
 * @param event - 키보드 이벤트
 * @param shortcutStr - 단축키 문자열 (예: "Ctrl+Shift+R")
 * @returns 일치 여부
 */
export function matchesShortcut(event: KeyboardEvent, shortcutStr: string): boolean {
  const parsed = parseShortcut(shortcutStr)
  if (!parsed) return false

  // 플랫폼별 메타 키 처리
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  
  // Ctrl 키는 모든 플랫폼에서 event.ctrlKey입니다 (Mac에서도 실제 Ctrl 키)
  // Meta 키는 Mac에서 Command 키입니다
  const ctrlMatch = parsed.ctrl ? event.ctrlKey : !event.ctrlKey
  const metaMatch = parsed.meta ? event.metaKey : !event.metaKey

  // 키 매칭: event.key와 event.code 모두 확인
  // event.key는 브라우저 기본 단축키(Ctrl+R 새로고침 등)와 충돌할 수 있어서
  // event.code를 우선적으로 사용
  const keyFromEventKey = event.key?.toUpperCase() || ''
  
  // event.code에서 키 추출: "KeyR" -> "R", "Digit1" -> "1", "Space" -> "SPACE"
  let keyFromCode = ''
  if (event.code?.startsWith('Key')) {
    keyFromCode = event.code.replace('Key', '')
  } else if (event.code?.startsWith('Digit')) {
    keyFromCode = event.code.replace('Digit', '')
  } else {
    // Space, Enter 등 특수 키는 그대로 사용
    keyFromCode = event.code
  }
  
  // 키 매칭: event.code를 우선 사용 (브라우저 기본 동작과 무관)
  const keyMatch = 
    parsed.key === keyFromCode ||
    parsed.key === keyFromEventKey ||
    (parsed.key.length === 1 && event.code === `Key${parsed.key}`) ||
    (parsed.key === ' ' && event.code === 'Space')
  
  const finalResult = ctrlMatch && parsed.shift === event.shiftKey && parsed.alt === event.altKey && metaMatch && keyMatch
  
  if (process.env.NODE_ENV === 'development') {
    console.group(`[Keyboard Shortcut] ${shortcutStr}`)
    console.log('Parsed:', parsed)
    console.log('Event:', {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    })
    console.log('Matches:', {
      ctrl: ctrlMatch,
      shift: parsed.shift === event.shiftKey,
      alt: parsed.alt === event.altKey,
      meta: metaMatch,
      key: keyMatch,
      '⚠️ Key mismatch': !keyMatch ? `Expected "${parsed.key}" but got key="${keyFromEventKey}" code="${keyFromCode}"` : 'OK',
      'Details': {
        'parsed.key': parsed.key,
        'event.key': event.key,
        'event.code': event.code,
        'keyFromCode': keyFromCode,
      }
    })
    console.log(`✅ Result: ${finalResult ? 'MATCH!' : '❌ NO MATCH'}`)
    console.groupEnd()
  }
  
  return (
    ctrlMatch &&
    parsed.shift === event.shiftKey &&
    parsed.alt === event.altKey &&
    metaMatch &&
    parsed.key === event.key.toUpperCase()
  )
}

/**
 * Electron용 단축키 문자열을 Electron 형식으로 변환
 * @param shortcutStr - 단축키 문자열 (예: "Ctrl+Shift+R")
 * @returns Electron 형식 (예: "CommandOrControl+Shift+R")
 */
export function toElectronShortcut(shortcutStr: string): string {
  if (!shortcutStr) return shortcutStr

  // Ctrl을 CommandOrControl로 변환 (Mac과 Windows 모두 지원)
  return shortcutStr
    .replace(/\bCtrl\b/gi, 'CommandOrControl')
    .replace(/\bControl\b/gi, 'CommandOrControl')
    .replace(/\bMeta\b/gi, 'Command')
    .replace(/\bCmd\b/gi, 'Command')
}

