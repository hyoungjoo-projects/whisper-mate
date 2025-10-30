#!/bin/bash
# Sentry 이슈 조회 스크립트 (간단 버전)

ORG="hyoungjoo-5l"
PROJECT="whisper-mate"
STATS_PERIOD="24h"

# .env.local 파일에서 Auth Token 읽기
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 오류: .env.local 파일을 찾을 수 없습니다."
  exit 1
fi

AUTH_TOKEN=$(grep "^VITE_SENTRY_AUTH_TOKEN=" "$ENV_FILE" | cut -d'=' -f2)

if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" = "" ]; then
  echo "❌ 오류: VITE_SENTRY_AUTH_TOKEN이 설정되지 않았습니다."
  echo ""
  echo "설정 방법:"
  echo "1. https://sentry.io/settings/account/api/auth-tokens/ 방문"
  echo "2. 'Create New Token' 클릭"
  echo "3. 다음 권한 선택:"
  echo "   - event:read"
  echo "   - org:read"
  echo "   - project:read"
  echo "4. 생성된 토큰을 .env.local 파일의 VITE_SENTRY_AUTH_TOKEN에 추가"
  exit 1
fi

echo "📊 Sentry 이슈 조회 중..."
echo "   조직: $ORG"
echo "   프로젝트: $PROJECT"
echo "   기간: $STATS_PERIOD"
echo ""

URL="https://sentry.io/api/0/projects/$ORG/$PROJECT/issues/?statsPeriod=$STATS_PERIOD&sort=users&query=is:unresolved"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  "$URL")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ API 호출 실패: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi

# jq가 설치되어 있는지 확인
if ! command -v jq &> /dev/null; then
  echo "⚠️  jq가 설치되지 않았습니다. JSON 파싱을 위해 설치해주세요:"
  echo "   macOS: brew install jq"
  echo "   Ubuntu: sudo apt-get install jq"
  echo ""
  echo "원본 응답:"
  echo "$BODY"
  exit 1
fi

ISSUE_COUNT=$(echo "$BODY" | jq '. | length')

if [ "$ISSUE_COUNT" -eq 0 ]; then
  echo "✅ 지난 24시간 동안 발생한 에러 이슈가 없습니다!"
  exit 0
fi

echo "📋 총 $ISSUE_COUNT 개의 에러 이슈가 발견되었습니다."
echo ""
echo "=================================================================================="
echo ""

echo "$BODY" | jq -r 'sort_by(-.userCount) | .[] | 
  "\(.title // "N/A")
   📌 ID: \(.shortId // "N/A")
   👥 영향받은 사용자: \(.userCount // 0)명
   🔢 발생 횟수: \(.count // "0")회
   📅 최초 발생: \(.firstSeen // "N/A")
   📅 최근 발생: \(.lastSeen // "N/A")
   🏷️  레벨: \(.level // "N/A") | 상태: \(.status // "N/A")
   \(if .culprit then "   📍 위치: \(.culprit)" else "" end)
   \(if .metadata.value then "   💬 에러: \(.metadata.value)" else "" end)
   🔗 URL: https://sentry.io/organizations/\(.project.slug // "hyoungjoo-5l")/issues/\(.id)/
   
   ------------------------------------------------------------------------------------
   "'

TOTAL_USERS=$(echo "$BODY" | jq '[.[] | .userCount] | add')
TOTAL_COUNT=$(echo "$BODY" | jq '[.[] | (.count | tonumber)] | add')

echo ""
echo "=================================================================================="
echo ""
echo "📊 요약:"
echo "   - 총 이슈 수: $ISSUE_COUNT 개"
echo "   - 총 영향받은 사용자: $TOTAL_USERS 명"
echo "   - 총 발생 횟수: $TOTAL_COUNT 회"
