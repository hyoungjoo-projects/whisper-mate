import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { captureError, captureMessage, trackUserAction } from './utils/sentry'

function App() {
  const [count, setCount] = useState(0)

  // Sentry 테스트 함수들
  const testError = () => {
    trackUserAction('clicked_test_error_button', { count })
    captureError(new Error('이것은 테스트 에러입니다! 🐛'), {
      count,
      timestamp: new Date().toISOString(),
    })
  }

  const testMessage = () => {
    trackUserAction('clicked_test_message_button')
    captureMessage('Sentry 메시지 테스트입니다! ✅', 'info')
  }

  const crashApp = () => {
    trackUserAction('clicked_crash_button')
    throw new Error('앱이 크래시됩니다! 💥')
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      {/* Sentry 테스트 섹션 */}
      <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
          🚨 Sentry 테스트
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={testError}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            에러 발생 테스트
          </button>
          <button 
            onClick={testMessage}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            메시지 전송 테스트
          </button>
          <button 
            onClick={crashApp}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            앱 크래시 테스트
          </button>
        </div>
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
          Sentry 대시보드에서 에러가 기록되는지 확인하세요.
        </p>
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
