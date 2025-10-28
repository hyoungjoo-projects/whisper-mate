/**
 * Sentry 유틸리티 함수들
 * 이 파일은 Sentry 관련 편의 함수들을 제공합니다.
 */

import * as Sentry from '@sentry/react';

// 에러 발생 시 Sentry로 전송
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
};

// 메시지 기록 (에러가 아닌 정보성 메시지)
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

// 사용자 정보 설정
export const setUser = (user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}) => {
  Sentry.setUser(user);
};

// 사용자 정보 초기화
export const clearUser = () => {
  Sentry.setUser(null);
};

// 추가 컨텍스트 정보 설정
export const setContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

// 태그 설정
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

// 태그 제거
export const removeTag = (key: string) => {
  Sentry.setTag(key, undefined);
};

// 버readcrumbs 추가 (사용자 액션 추적)
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};

// 성능 추적을 위한 트랜잭션 시작
export const startTransaction = (name: string, op?: string) => {
  return Sentry.startSpan(
    {
      name,
      op: op || 'custom',
    },
    () => {
      // 트랜잭션이 여기서 실행됩니다
      return Sentry.getCurrentScope();
    }
  );
};

/**
 * async 함수를 래핑하여 에러를 자동으로 Sentry로 전송합니다.
 * 
 * @example
 * const safeFunction = withSentry(async () => {
 *   await someAsyncOperation();
 * });
 */
export const withSentry = <T extends (...args: any[]) => Promise<any>>(
  fn: T
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, { function: fn.name });
      }
      throw error;
    }
  }) as T;
};

/**
 * 비동기 액션을 추적합니다.
 * 
 * @example
 * await trackAsync('fetchUserData', async () => {
 *   return await fetchUserData(userId);
 * });
 */
export const trackAsync = async <T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const transaction = Sentry.startSpan(
    {
      name,
      op: 'async',
    },
    async (span) => {
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          span?.setAttribute(key, value);
        });
      }
      
      try {
        const result = await fn();
        span?.setStatus({ code: 1, message: 'ok' }); // success
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: 'error' }); // error
        if (error instanceof Error) {
          Sentry.captureException(error, { 
            tags: { operation: name },
            contexts: { operation: metadata || {} }
          });
        }
        throw error;
      }
    }
  );
  
  return transaction;
};

/**
 * 사용자 액션을 추적합니다.
 * 
 * @example
 * trackUserAction('clicked_button', { buttonName: 'submit', page: 'login' });
 */
export const trackUserAction = (action: string, metadata?: Record<string, any>) => {
  addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data: metadata,
  });
  
  // 메타데이터가 있으면 태그로도 추가
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      setTag(`user_action_${key}`, String(value));
    });
  }
};

/**
 * API 호출을 추적합니다.
 * 
 * @example
 * await trackAPI('POST /api/users', async () => {
 *   return await fetch('/api/users', { method: 'POST', body: data });
 * });
 */
export const trackAPI = async <T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> => {
  return trackAsync(`API: ${endpoint}`, fn, { endpoint });
};


