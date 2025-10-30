/**
 * Sentry 이슈 조회 스크립트
 * 지난 24시간 동안 발생한 모든 에러 이슈를 사용자 영향도 순으로 조회
 * 
 * 사용법:
 * 1. .env.local 파일에 VITE_SENTRY_AUTH_TOKEN 설정
 * 2. npx tsx scripts/fetch-sentry-issues.ts
 */

import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// .env.local 파일 로드
const envPath = join(process.cwd(), '.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.error('.env.local 파일을 읽을 수 없습니다.');
}

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  level: string;
  status: string;
  userCount: number;
  count: string;
  firstSeen: string;
  lastSeen: string;
  metadata: {
    type?: string;
    value?: string;
    [key: string]: any;
  };
  project: {
    slug: string;
  };
}

async function fetchSentryIssues() {
  const org = process.env.VITE_SENTRY_ORG || 'hyoungjoo-5l';
  const project = process.env.VITE_SENTRY_PROJECT || 'whisper-mate';
  const authToken = process.env.VITE_SENTRY_AUTH_TOKEN;

  if (!authToken) {
    console.error('❌ 오류: VITE_SENTRY_AUTH_TOKEN이 설정되지 않았습니다.');
    console.log('');
    console.log('설정 방법:');
    console.log('1. https://sentry.io/settings/account/api/auth-tokens/ 방문');
    console.log('2. "Create New Token" 클릭');
    console.log('3. 다음 권한 선택:');
    console.log('   - event:read');
    console.log('   - org:read');
    console.log('   - project:read');
    console.log('4. 생성된 토큰을 .env.local 파일의 VITE_SENTRY_AUTH_TOKEN에 추가');
    process.exit(1);
  }

  const statsPeriod = '24h';
  const url = `https://sentry.io/api/0/projects/${org}/${project}/issues/?statsPeriod=${statsPeriod}&sort=freq&query=is:unresolved`;

  console.log('📊 Sentry 이슈 조회 중...');
  console.log(`   조직: ${org}`);
  console.log(`   프로젝트: ${project}`);
  console.log(`   기간: ${statsPeriod}`);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API 호출 실패: ${response.status} ${response.statusText}`);
      console.error(errorText);
      process.exit(1);
    }

    const issues: SentryIssue[] = await response.json();
    
    if (issues.length === 0) {
      console.log('✅ 지난 24시간 동안 발생한 에러 이슈가 없습니다!');
      return;
    }

    // 사용자 영향도 순으로 정렬 (이미 API에서 정렬되어 있지만 재정렬)
    const sortedIssues = [...issues].sort((a, b) => {
      if (b.userCount !== a.userCount) {
        return b.userCount - a.userCount;
      }
      const countA = parseInt(a.count, 10) || 0;
      const countB = parseInt(b.count, 10) || 0;
      return countB - countA;
    });

    console.log(`📋 총 ${sortedIssues.length}개의 에러 이슈가 발견되었습니다.\n`);
    console.log('='.repeat(80));
    console.log('');

    sortedIssues.forEach((issue, index) => {
      const levelEmoji: Record<string, string> = {
        'fatal': '🔴',
        'error': '🔴',
        'warning': '🟡',
        'info': '🔵',
        'debug': '⚪',
      };

      const emoji = levelEmoji[issue.level.toLowerCase()] || '⚪';
      
      console.log(`${index + 1}. ${emoji} ${issue.title}`);
      console.log(`   📌 ID: ${issue.shortId}`);
      console.log(`   👥 영향받은 사용자: ${issue.userCount}명`);
      console.log(`   🔢 발생 횟수: ${issue.count}회`);
      console.log(`   📅 최초 발생: ${new Date(issue.firstSeen).toLocaleString('ko-KR')}`);
      console.log(`   📅 최근 발생: ${new Date(issue.lastSeen).toLocaleString('ko-KR')}`);
      console.log(`   🏷️  레벨: ${issue.level} | 상태: ${issue.status}`);
      if (issue.culprit) {
        console.log(`   📍 위치: ${issue.culprit}`);
      }
      if (issue.metadata?.value) {
        console.log(`   💬 에러: ${issue.metadata.value}`);
      }
      console.log(`   🔗 URL: https://sentry.io/organizations/${org}/issues/${issue.id}/`);
      console.log('');
      console.log('-'.repeat(80));
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('');
    console.log('📊 요약:');
    console.log(`   - 총 이슈 수: ${sortedIssues.length}개`);
    console.log(`   - 총 영향받은 사용자: ${sortedIssues.reduce((sum, issue) => sum + issue.userCount, 0)}명`);
    console.log(`   - 총 발생 횟수: ${sortedIssues.reduce((sum, issue) => sum + (parseInt(issue.count, 10) || 0), 0)}회`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

fetchSentryIssues();

