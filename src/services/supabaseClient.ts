import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경 변수가 없어도 앱이 크래시되지 않도록 처리
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase 환경 변수가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.\n' +
      '환경 변수를 설정하려면:\n' +
      '1. Supabase 프로젝트를 생성하세요 (https://supabase.com)\n' +
      '2. 프로젝트립 설정에서 URL과 anon key를 복사하세요\n' +
      '3. .env 파일에 다음을 추가하세요:\n' +
      '   VITE_SUPABASE_URL=your_supabase_url\n' +
      '   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key'
  )
}

// 환경 변수가 없어도 클라이언트를 생성 (기능 제한됨)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Supabase가 설정되어 있는지 확인하는 헬퍼 함수
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co')
}

