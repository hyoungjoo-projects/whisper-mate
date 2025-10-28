import React from 'react';
import * as Sentry from '@sentry/react';
import { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';

// 커스텀 에러 UI 컴포넌트
const ErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => {
  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>
        🚨 문제가 발생했습니다
      </h1>
      <p style={{ marginBottom: '1rem', color: '#64748b' }}>
        예상치 못한 오류가 발생했습니다. 이 문제는 자동으로 기록되었으며 빠르게 해결하겠습니다.
      </p>
      {error && (
        <details style={{ 
          marginBottom: '1.5rem', 
          textAlign: 'left',
          maxWidth: '600px',
          margin: '0 auto 1.5rem auto'
        }}>
          <summary style={{ 
            cursor: 'pointer', 
            color: '#1e293b',
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            기술적 세부정보 보기
          </summary>
          <pre style={{ 
            background: '#f1f5f9', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            overflow: 'auto',
            fontSize: '0.875rem'
          }}>
            {error.toString()}
          </pre>
        </details>
      )}
      <button
        onClick={resetError}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
      >
        페이지 새로고침
      </button>
    </div>
  );
};

// Sentry ErrorBoundary로 감싸는 HOC
export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return (
    <SentryErrorBoundary 
      fallback={ErrorFallback}
      showDialog={false} // 자동 다이얼로그 비활성화 (커스텀 UI 사용)
    >
      {children}
    </SentryErrorBoundary>
  );
};

export default ErrorBoundary;


