import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import * as Sentry from '@sentry/react';
import { captureErrorWithNotification, monitorCriticalOperation, monitorAPIResponse } from '../utils/errorMonitor';
import { captureError, captureMessage, trackUserAction } from '../utils/sentry';

/**
 * 테스트용 에러 발생 컴포넌트
 * 다양한 종류의 에러를 테스트할 수 있습니다.
 */
export default function ErrorTestPanel() {
  const [errorCount, setErrorCount] = useState(0);

  // 간단한 에러 발생
  const throwSimpleError = () => {
    try {
      throw new Error('테스트 에러: 일반적인 JavaScript 에러입니다.');
    } catch (error) {
      if (error instanceof Error) {
        captureError(error, { source: 'ErrorTestPanel', type: 'simple' });
        trackUserAction('error_test', { type: 'simple' });
        setErrorCount(prev => prev + 1);
      }
    }
  };

  // TypeError 발생
  const throwTypeError = () => {
    try {
      // 의도적으로 null의 속성에 접근
      const obj: any = null;
      const value = obj.someProperty.nestedProperty;
      console.log(value);
    } catch (error) {
      if (error instanceof Error) {
        captureErrorWithNotification(error, {
          level: 'error',
          tags: { 
            error_type: 'TypeError',
            component: 'ErrorTestPanel',
            test: 'true'
          },
          contexts: {
            test: {
              action: 'throwTypeError',
              timestamp: new Date().toISOString(),
            }
          }
        });
        trackUserAction('error_test', { type: 'TypeError' });
        setErrorCount(prev => prev + 1);
      }
    }
  };

  // ReferenceError 발생
  const throwReferenceError = () => {
    try {
      // 정의되지 않은 변수 사용
      (window as any).undefinedVariable.nested();
    } catch (error) {
      if (error instanceof Error) {
        captureErrorWithNotification(error, {
          level: 'error',
          tags: { 
            error_type: 'ReferenceError',
            component: 'ErrorTestPanel'
          }
        });
        trackUserAction('error_test', { type: 'ReferenceError' });
        setErrorCount(prev => prev + 1);
      }
    }
  };

  // Promise rejection 에러
  const throwPromiseError = async () => {
    try {
      await Promise.reject(new Error('테스트 에러: Promise rejection입니다.'));
    } catch (error) {
      if (error instanceof Error) {
        captureErrorWithNotification(error, {
          level: 'error',
          tags: { 
            error_type: 'PromiseRejection',
            component: 'ErrorTestPanel'
          },
        });
        setErrorCount(prev => prev + 1);
      }
    }
  };

  // 미처리 Promise rejection (실제로 에러가 발생하도록)
  const throwUnhandledPromise = () => {
    trackUserAction('error_test', { type: 'unhandled_promise' });
    // 의도적으로 catch하지 않음
    Promise.reject(new Error('테스트 에러: 미처리 Promise rejection입니다.'));
    setErrorCount(prev => prev + 1);
  };

  // React 컴포넌트 렌더링 에러 시뮬레이션
  const throwComponentError = () => {
    trackUserAction('error_test', { type: 'component_error' });
    // 의도적으로 에러 발생
    throw new Error('테스트 에러: React 컴포넌트 렌더링 에러입니다.');
  };

  // API 에러 시뮬레이션
  const simulateAPIError = async () => {
    trackUserAction('error_test', { type: 'api_error' });
    try {
      await monitorAPIResponse(
        '/api/test-endpoint',
        async () => {
          // 실제로는 존재하지 않는 API 호출
          const response = await fetch('/api/non-existent-endpoint');
          if (!response.ok) {
            throw new Error(`API 에러: ${response.status} ${response.statusText}`);
          }
          return response.json();
        },
        { maxResponseTime: 2000, alertOnSlow: true }
      );
    } catch (error) {
      if (error instanceof Error) {
        captureErrorWithNotification(error, {
          level: 'error',
          tags: { 
            error_type: 'APIError',
            endpoint: '/api/test-endpoint'
          }
        });
        setErrorCount(prev => prev + 1);
      }
    }
  };

  // 중요 작업 모니터링 테스트
  const testCriticalOperation = async () => {
    trackUserAction('error_test', { type: 'critical_operation' });
    try {
      await monitorCriticalOperation(
        '테스트 중요 작업',
        async () => {
          // 시뮬레이션된 중요한 작업
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 50% 확률로 실패
          if (Math.random() > 0.5) {
            throw new Error('중요 작업이 실패했습니다.');
          }
          
          return { success: true };
        },
        {
          tags: { operation_type: 'test' },
          contexts: { test: { scenario: 'random_failure' } }
        }
      );
    } catch (error) {
      // 에러는 이미 monitorCriticalOperation에서 처리됨
      setErrorCount(prev => prev + 1);
    }
  };

  // 메시지 캡처 (에러가 아닌 정보)
  const captureInfoMessage = () => {
    captureMessage('테스트 정보 메시지입니다.', 'info');
    trackUserAction('error_test', { type: 'info_message' });
  };

  // 경고 메시지 캡처
  const captureWarningMessage = () => {
    captureMessage('테스트 경고 메시지입니다.', 'warning');
    trackUserAction('error_test', { type: 'warning_message' });
  };

  // Sentry 직접 사용
  const useSentryDirectly = () => {
    Sentry.captureException(new Error('직접 Sentry를 사용한 에러 테스트'), {
      tags: { method: 'direct_sentry_call' },
      extra: { test: true }
    });
    trackUserAction('error_test', { type: 'direct_sentry' });
    setErrorCount(prev => prev + 1);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sentry 에러 테스트 패널</CardTitle>
        <CardDescription>
          다양한 종류의 에러를 발생시켜 Sentry 모니터링을 테스트합니다.
          <br />
          발생한 에러 횟수: <strong>{errorCount}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">기본 에러 유형</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={throwSimpleError}>
              간단한 에러
            </Button>
            <Button variant="destructive" onClick={throwTypeError}>
              TypeError
            </Button>
            <Button variant="destructive" onClick={throwReferenceError}>
              ReferenceError
            </Button>
            <Button variant="destructive" onClick={throwPromiseError}>
              Promise 에러
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-2">고급 에러 시나리오</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={throwUnhandledPromise}>
              미처리 Promise
            </Button>
            <Button variant="destructive" onClick={simulateAPIError}>
              API 에러 시뮬레이션
            </Button>
            <Button variant="destructive" onClick={testCriticalOperation}>
              중요 작업 모니터링
            </Button>
            <Button variant="destructive" onClick={useSentryDirectly}>
              직접 Sentry 호출
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-2">정보 및 경고</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={captureInfoMessage}>
              정보 메시지
            </Button>
            <Button variant="outline" onClick={captureWarningMessage}>
              경고 메시지
            </Button>
          </div>
        </div>

        <Separator />

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>주의:</strong> React 컴포넌트 렌더링 에러는 ErrorBoundary에서 처리됩니다.
            아래 버튼을 클릭하면 즉시 에러가 발생합니다.
          </p>
          <Button 
            variant="destructive" 
            className="mt-2"
            onClick={throwComponentError}
          >
            컴포넌트 렌더링 에러 발생
          </Button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>팁:</strong> Sentry 대시보드에서 발생한 에러를 확인할 수 있습니다.
            모든 에러는 자동으로 기록되며, 컨텍스트 정보와 함께 전송됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

