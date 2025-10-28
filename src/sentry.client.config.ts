// Sentry 클라이언트 설정 파일
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN, // Sentry 프로젝트 DSN
  environment: import.meta.env.MODE, // development, production 등
  integrations: [
    Sentry.browserTracingIntegration({
      // 성능 추적 설정
      enableInp: true, // Interaction to Next Paint 추적
    }),
    Sentry.replayIntegration({
      // 세션 리플레이 설정
      maskAllText: false, // 개인정보 보호를 위해 텍스트 마스킹 (필요시 true로 변경)
      blockAllMedia: false,
    }),
  ],

  // 성능 모니터링
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0, // 프로덕션에서는 10% 샘플링

  // 세션 리플레이 샘플링
  replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0, // 에러 발생 시 항상 리플레이 기록

  // 릴리스 정보
  release: `whisper-mate@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
  
  // 사용자 정보 수집
  beforeSend(event, _hint) {
    // 민감한 정보 제거
    if (event.request) {
      // URL에서 토큰 등 민감한 정보 제거
      if (event.request.url) {
        event.request.url = event.request.url.replace(/token=[^&]+/gi, 'token=[FILTERED]');
      }
      // 쿠키 정보 제거
      if (event.request.cookies) {
        delete event.request.cookies;
      }
    }
    return event;
  },

  // 실시간 에러 추적을 위한 설정
  beforeSendTransaction(transaction) {
    // 성능 트랜잭션 필터링 (선택사항)
    return transaction;
  },

  // 에러 리스너 (실시간 알림을 위한 추가 정보 수집)
  beforeBreadcrumb(breadcrumb) {
    // 특정 타입의 breadcrumb만 기록
    return breadcrumb;
  },

  // 디버그 모드 (개발 환경에서만)
  debug: import.meta.env.MODE === 'development' ? false : false,
  
  // 에러 무시 설정
  ignoreErrors: [
    // 브라우저 확장 프로그램에서 발생하는 에러
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'atomicFindClose',
    'fb_xd_fragment',
    'bmi_SafeAddOnload',
    'EBCallBackMessageReceived',
    'conduitPage',
  ],
  
  // 데니얼 리스트 (특정 URL/도메인 제외)
  denyUrls: [
    // 브라우저 확장 프로그램
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
});

export default Sentry;


