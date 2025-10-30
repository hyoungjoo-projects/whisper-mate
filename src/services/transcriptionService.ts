import { supabase, isSupabaseConfigured } from './supabaseClient'

export interface Transcription {
  id: string
  created_at: string
  text: string
  audio_duration: number
  language?: string
}

/**
 * 전사를 Supabase에 저장합니다.
 * @param text - 전사된 텍스트
 * @param audioDuration - 오디오 길이 (초)
 * @param language - 언어 코드 (선택사항)
 * @returns 저장된 전사 데이터
 * @throws Error
 */
export async function saveTranscription(
  text: string,
  audioDuration: number,
  language?: string
): Promise<Transcription | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase가 설정되지 않아 전사를 저장할 수 없습니다.')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('transcriptions')
      .insert([
        {
          text,
          audio_duration: audioDuration,
          language,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error saving transcription:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to save transcription:', error)
    throw error
  }
}

/**
 * 모든 전사를 최신순으로 가져옵니다.
 * @returns 전사 배열
 * @throws Error
 */
export async function getTranscriptions(): Promise<Transcription[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase가 설정되지 않아 전사 목록을 불러올 수 없습니다.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transcriptions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch transcriptions:', error)
    throw error
  }
}

/**
 * 특정 전사를 삭제합니다.
 * @param id - 삭제할 전사의 ID
 * @throws Error
 */
export async function deleteTranscription(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase가 설정되지 않아 전사를 삭제할 수 없습니다.')
    return
  }

  try {
    const { error } = await supabase.from('transcriptions').delete().eq('id', id)

    if (error) {
      console.error('Error deleting transcription:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to delete transcription:', error)
    throw error
  }
}

/**
 * 전사 텍스트로 검색합니다.
 * @param query - 검색 쿼리
 * @returns 검색 결과 전사 배열
 * @throws Error
 */
export async function searchTranscriptions(query: string): Promise<Transcription[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase가 설정되지 않아 전사를 검색할 수 없습니다.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .ilike('text', `%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching transcriptions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to search transcriptions:', error)
    throw error
  }
}

/**
 * 모든 전사 데이터를 삭제합니다.
 * @throws Error
 */
export async function deleteAllTranscriptions(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase가 설정되지 않아 전사를 삭제할 수 없습니다.')
    return
  }

  try {
    // Delete all transcriptions (no filter = delete all)
    const { error } = await supabase.from('transcriptions').delete().gte('id', '')

    if (error) {
      console.error('Error deleting all transcriptions:', error)
      throw error
    }
  } catch (error) {
    console.error('Failed to delete all transcriptions:', error)
    throw error
  }
}

