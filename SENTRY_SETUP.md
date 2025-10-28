# Sentry 설정 가이드

이 문서는 Whisper Mate 프로젝트에서 Sentry를 설정하고 사용하는 방법을 설명합니다.

## 📋 목차

- [Sentry란?](#sentry란)
- [프로젝트 설정](#프로젝트-설정)
- [환경 변수 설정](#환경-변수-설정)
- [소스맵 업로드 설정](#소스맵-업로드-설정)
- [실시간 에러 추적](#실시간-에러-추적)
- [고급 기능](#고급-기능)
- [문제 해결](#문제-해결)

## Sentry란?

Sentry는 실시간 에러 추적 및 성능 모니터링 플랫폼입니다. 프로덕션 환경에서 발생하는 에러를 자동으로 감지하고, 상세한 스택 트레이스와 컨텍스트 정보를 제공합니다.

### 주요 기능

- ✅ **실시간 에러 추적**: 프로덕션 에러 즉시 알림
- ✅ **세션 리플레이**: 문제 발생 전후 사용자 액션 녹화
- ✅ **성능 모니터링**: 느린 API 호출 및 렌더링 이슈 감지
- ✅ **소스맵 지원**: 미니파이된 코드를 원본으로 매핑
- ✅ **릴리스 추적**: 에러 발생 버전 추적

## 프로젝트 설정

### 1. Sentry 계정 생성

1. [Sentry.io](https://sentry.io) 방문
2. 무료 계정 생성
3. 새로운 프로젝트 생성: **React** 플랫폼 선택

### 2. DSN 복사

프로젝트 생성 후, 다음 위치에서 DSN을 복사합니다:

```
Settings → Projects → [프로젝트 이름] → Client Keys (DSN)
```

## 환경 변수 설정

### 기본 설정

`.env.local` 파일에 DSN을 설정합니다:

```bash
# .env.local
VITE_SENTRY_DSN=your_dsn_here
VITE_APP_VERSION=0.0.0
```

### 소스地理位置 계 업로드 설정 (선택사항)

소스맵 업로드를 원한다면 추가 설정이 필요합니다:

1. **Auth Token 생성**
   - Settings → Account → Auth Tokens
   - "Create New Token" 클릭
   - 다음 권한 선택:
     - `project:releases`
     - `project:releases`

2. **`.env.local`에 추가**

```bash
VITE_SENTRY_ORG=your-org-name
VITE_SENTRY_PROJECT=your-project-name
VITE_SENTRY_AUTH_TOKEN=your-auth-token
```

## 소스맵 업로드 설정

소스맵 업로드를 통해 미니파이된 프로덕션 코드를 원본으로 매핑할 수 있습니다.

### 빌드 스크립트

```bash
# 일반 빌드
npm run build

# Sentry 포함 빌드 (소스맵 자동 업로드)
npm run build:sentry
```

### 환경 변수 확인

소스맵 업로드를 위해서는 다음 환경 변수가 필요합니다:

- `VITE_SENTRY_ORG`: Sentry 조직 이름
- `VITE_SENTRY_PROJECT`: 프로젝트 이름
- `VITE_SENTRY_AUTH_TOKEN`: 인증 토큰

## 실시간 에러 추적

### 기본 사용

프로젝트에는 이미 Sentry가 설정되어 있습니다. 에러가 발생하면 자동으로 전송됩니다.

```tsx
import { captureError, captureMessage } from './utils/sentry';

// 에러 캡처
try {
  // 코드
} catch (error) {
  captureError(error, { 
    context: 'additional info',
    userId: '123' 
  });
}

// 메시지 전송
captureMessage('중요한 이벤트 발생', 'info');
```

### 고급 기능 사용

실시간 모니터링 유틸리티를 활용할 수 있습니다:

```tsx
import { 
  captureErrorWithNotification,
  monitorCriticalOperation,
  monitorAPIResponse,
  startRealTimeMonitoring 
} from './utils/errorMonitor';

// 중요 작업 모니터링
await monitorCriticalOperation('결제 처리', async () => {
  await processPayment(orderId);
}, {
  tags: { feature: 'payment' },
  user: { id: userId }
});

// API 응답 시간 추적
await monitorAPIResponse('/api/users', async () => {
  return await fetch('/api/users');
}, {
  maxResponseTime: 3000,
  alertOnSlow: true
});
```

### 전역 모니터링 시작

프로덕션 환경에서 자동으로 시작됩니다. 수동으로 시작하려면:

```tsx
// main.tsx
import { startRealTimeMonitoring } from './utils/errorMonitor';

startRealTimeMonitoring();
```

## 고급 기능

### 1. 사용자 컨텍스트

에러 발생 시 사용자 정보를 자동으로 포함합니다:

```tsx
import { setUser } from './utils/sentry';

setUser({
  id: '123',
  email: 'user@example.com',
  username: 'john_doe'
});
```

### 2. 태그 및 컨텍스트

특정 에러에 태그와 컨텍스트를 추가합니다:

```tsx
import { setTag, setContext } from './utils/sentry';

setTag('page', 'checkout');
setContext('checkout', {
  cartItems: 3,
  total: 29900
});
```

### 3. 커스텀 Breadcrumb

사용자 액션 추적:

```tsx
import { addBreadcrumb } from './utils/sentry';

addBreadcrumb({
  category: 'navigation',
  message: '페이지 이동',
  level: 'info',
  data: {
    from: '/home',
    to: '/checkout'
  }
});
```

### 4. 성능 추적

트랜잭션을 통한 성능 추적:

```tsx
import { trackAsync } from './utils/sentry';

await trackAsync('loadUserData', async () => {
  return await fetchUserData(userId);
}, {
  endpoint: '/api/users',
  cache: 'miss'
});
```

## Sentry 대시보드

### 에러 확인

1. Sentry 대시보드 로그인
2. 프로젝트 선택
3. Issues 탭에서 최근 에러 확인

### 알림 설정

1. Settings → Projects → [프로젝트] → Alerts
2. "Create Alert Rule" 클릭
3. 알림 조건 설정:
   - 에러 발생 빈도
   - 특정 에러 타입
   - 사용자 영향도

### 통합 설정

Slack, Discord, Email 등으로 알림을 받을 수 있습니다:

1. Settings → Projects → [프로젝트] → Integrations
2. 원하는 통합 연결
3. 알림 규칙 설정

## 문제 해결

### 에러가 전송되지 않는 경우

1. **DSN 확인**
   ```bash
   echo $VITE_SENTRY_DSN
   ```

2. **네트워크 확인**
   - 브라우저 개발자 도구 → Network 탭
   - Sentry API 호출 확인

3. **디버그 모드 활성화**
   ```typescript
   // sentry.client.config.ts
   debug: true
   ```

### 소스맵이 업로드되지 않는 경우

1. **환경 변수 확인**
   ```bash
   cat .env.local | grep SENTRY
   ```

2. **빌드 스크립트 사용**
   ```bash
   npm run build:sentry
   ```

3. **인증 토큰 권한 확인**
   - Settings → Account → Auth Tokens
   - `project:releases` 권한 확인

### 환경별 설정

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE, // development, production
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  // ...
});
```

## 추가 리소스

- [Sentry React 공식 문서](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry 성능 모니터링](https://docs.sentry.io/product/performance/)
- [세션 리플레이](https://docs.sentry.io/product/session-replay/)

## 도움이 필요하신가요?

문제가 발생하면 다음을 확인하세요:

1. 이 문서의 "문제 해결" 섹션
2. [Sentry 지원 센터](https://docs.sentry.io/)
3. 프로젝트 이슈 트래커

---

**작성일**: 2024
**버전**: 1.0.0
