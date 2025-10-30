/**
 * Sentry API 유틸리티
 * Sentry REST API를 통해 이슈를 조회하는 함수들
 */

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  level: string;
  status: string;
  numComments: number;
  assignedTo: any;
  isPublic: boolean;
  platform: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  firstSeen: string;
  lastSeen: string;
  count: string;
  userCount: number;
  hasSeen: boolean;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
    [key: string]: any;
  };
  stats: {
    '24h'?: Array<[number, number]>;
    '30d'?: Array<[number, number]>;
  };
  tags: Array<{
    key: string;
    value: string;
  }>;
}

// Interface for Sentry API response (currently unused, but kept for future use)
// interface SentryIssueResponse {
//   results: SentryIssue[];
// }

/**
 * Sentry API를 통해 이슈 목록 조회
 * 
 * @param org - Sentry 조직 이름
 * @param project - Sentry 프로젝트 이름
 * @param statsPeriod - 통계 기간 (예: '24h', '7d', '30d')
 * @param sort - 정렬 기준 (예: 'users', 'freq', 'new')
 * @param authToken - Sentry Auth Token
 * @returns Promise<SentryIssue[]>
 */
export async function fetchSentryIssues(
  org: string,
  project: string,
  statsPeriod: string = '24h',
  sort: string = 'freq',
  authToken?: string
): Promise<SentryIssue[]> {
  if (!authToken) {
    throw new Error('Sentry Auth Token이 필요합니다. .env.local 파일에 VITE_SENTRY_AUTH_TOKEN을 설정해주세요.');
  }

  const url = `https://sentry.io/api/0/projects/${org}/${project}/issues/?statsPeriod=${statsPeriod}&sort=${sort}&query=is:unresolved`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sentry API 호출 실패: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data: SentryIssue[] = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Sentry API 호출 중 오류 발생: ${String(error)}`);
  }
}

/**
 * 이슈를 사용자 영향도 순으로 정렬
 */
export function sortIssuesByUserImpact(issues: SentryIssue[]): SentryIssue[] {
  return [...issues].sort((a, b) => {
    // 1순위: 사용자 수 (내림차순)
    if (b.userCount !== a.userCount) {
      return b.userCount - a.userCount;
    }
    // 2순위: 발생 횟수 (내림차순)
    const countA = parseInt(a.count, 10) || 0;
    const countB = parseInt(b.count, 10) || 0;
    if (countB !== countA) {
      return countB - countA;
    }
    // 3순위: 최근 발생 시간 (내림차순)
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });
}

/**
 * 이슈 정보를 포맷팅하여 표시
 */
export function formatIssueSummary(issue: SentryIssue): string {
  const levelEmoji: Record<string, string> = {
    'fatal': '🔴',
    'error': '🔴',
    'warning': '🟡',
    'info': '🔵',
    'debug': '⚪',
  };

  const emoji = levelEmoji[issue.level] || '⚪';
  
  return `
${emoji} **${issue.title}**
- ID: ${issue.shortId}
- 레벨: ${issue.level}
- 사용자 영향: ${issue.userCount}명
- 발생 횟수: ${issue.count}회
- 최초 발생: ${new Date(issue.firstSeen).toLocaleString('ko-KR')}
- 최근 발생: ${new Date(issue.lastSeen).toLocaleString('ko-KR')}
- 상태: ${issue.status}
${issue.culprit ? `- 위치: ${issue.culprit}` : ''}
- URL: https://sentry.io/organizations/${issue.project.slug}/issues/${issue.id}/
  `.trim();
}




