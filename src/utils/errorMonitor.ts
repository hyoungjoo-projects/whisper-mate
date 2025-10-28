/**
 * 실시간 에러 모니터링 유틸리티
 * 이 파일은 Sentry를 활용한 고급 에러 모니터링 기능을 제공합니다.
 */

import * as Sentry from '@sentry/react';

// 에러 발생 시 알림 전송
export interface ErrorNotificationOptions {
  level?: Sentry.SeverityLevel;
  tags?: Record<string, string>;
  contexts?: Record<string, any>;
  fingerprint?: string[];
  user?: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  };
}

/**
 * 에러를 캡처하고 즉시 알림을 전송합니다
 * 
 * @example
 * captureErrorWithNotification(new Error('API 호출 실패'), {
 *   level: 'error',
 *   tags: { component: 'Payment', severity: 'high' },
 *   user: { id: 'user123', email: 'user@example.com' }
 * });
 */
export const captureErrorWithNotification = (
  error: Error,
  options: ErrorNotificationOptions = {}
) => {
  const {
    level = 'error',
    tags,
    contexts,
    fingerprint,
    user,
  } = options;

  // 사용자 정보 설정
  if (user) {
    Sentry.setUser(user);
  }

  // 태그 설정
  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  // 컨텍스트 추가
  if (contexts) {
    Object.entries(contexts).forEach(([key, value]) => {
      Sentry.setContext(key, value);
    });
  }

  // 에러 캡처
  const eventId = Sentry.captureException(error, {
    level,
    fingerprint,
  });

  console.error(`[Sentry] 에러가 기록되었습니다. Event ID: ${eventId}`, error);

  return eventId;
};

/**
 * 중요한 작업을 감시하고 실패 시 알림을 전송합니다
 * 
 * @example
 * await monitorCriticalOperation('결제 처리', async () => {
 *   await processPayment(orderId);
 * });
 */
export const monitorCriticalOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  options?: ErrorNotificationOptions
): Promise<T> => {
  const span = Sentry.startSpan(
    {
      name: operationName,
      op: 'critical.operation',
    },
    async (span) => {
      try {
        addBreadcrumb({
          category: 'operation.start',
          message: `${operationName} 시작`,
          level: 'info',
        });

        const result = await operation();

        addBreadcrumb({
          category: 'operation.success',
          message: `${operationName} 성공`,
          level: 'info',
        });

        span?.setStatus({ code: 1, message: 'ok' });
        return result;
      } catch (error) {
        addBreadcrumb({
          category: 'operation.error',
          message: `${operationName} 실패`,
          level: 'error',
        });

        span?.setStatus({ code: 2, message: 'error' });

        if (error instanceof Error) {
          captureErrorWithNotification(error, {
            ...options,
            tags: {
              ...options?.tags,
              operation: operationName,
              severity: 'critical',
            },
            level: 'error',
          });
        }

        throw error;
      }
    }
  );

  return span;
};

/**
 * 주기적인 건강 상태 체크
 */
export const healthCheck = () => {
  const timestamp = new Date().toISOString();
  
  addBreadcrumb({
    category: 'health',
    message: 'Health check',
    level: 'info',
    data: { timestamp },
  });

  // 앱 상태 정보 수집
  const appState = {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp,
    memory: (performance as any).memory ? {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      limit: (performance as any).memory.jsHeapSizeLimit,
    } : null,
  };

  Sentry.setContext('health', appState);
};

/**
 * API 응답 시간 추적 및 이상 징후 감지
 */
export const monitorAPIResponse = async <T>(
  endpoint: string,
  apiCall: () => Promise<T>,
  options?: {
    maxResponseTime?: number; // 최대 응답 시간 (ms)
    alertOnSlow?: boolean;
  }
): Promise<T> => {
  const startTime = performance.now();
  const { maxResponseTime = 5000, alertOnSlow = true } = options || {};

  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;

    addBreadcrumb({
      category: 'api',
      message: `${endpoint} 호출`,
      level: 'info',
      data: { endpoint, duration: `${duration.toFixed(2)}ms` },
    });

    // 응답 시간이 너무 길면 경고
    if (duration > maxResponseTime && alertOnSlow) {
      Sentry.captureMessage(
        `API 응답 시간 초과: ${endpoint} (${duration.toFixed(2)}ms)`,
        'warning'
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    if (error instanceof Error) {
      captureErrorWithNotification(error, {
        level: 'error',
        tags: {
          endpoint,
          api_error: 'true',
        },
        contexts: {
          api: {
            endpoint,
            duration: `${duration.toFixed(2)}ms`,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    throw error;
  }
};

/**
 * 실시간 모니터링 시작
 */
export const startRealTimeMonitoring = () => {
  // 주기적으로 건강 상태 체크 (5분마다)
  setInterval(() => {
    healthCheck();
  }, 5 * 60 * 1000);

  // 초기 건강 상태 체크
  healthCheck();

  // 전역 에러 핸들러
  window.addEventListener('error', (event) => {
    captureErrorWithNotification(event.error, {
      level: 'error',
      tags: { global_error: 'true' },
    });
  });

  // Promise rejection 감지
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    captureErrorWithNotification(error, {
      level: 'error',
      tags: { unhandled_promise: 'true' },
    });
  });

  console.log('[Sentry] 실시간 모니터링이 시작되었습니다.');
};

/**
 * 빵 부스러기(Breadcrumb) 추가
 */
const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

// 자동 모니터링 시작 (선택적)
if (typeof window !== 'undefined') {
  // 프로덕션 환경에서만 자동 시작
  if (import.meta.env.MODE === 'production') {
    startRealTimeMonitoring();
  }
}
