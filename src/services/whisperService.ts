import axios from 'axios'

const WHISPER_API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms
const MIN_REQUEST_INTERVAL = 200 // ms

let lastRequestTime = 0

export interface TranscriptionResponse {
  text: string
  language?: string
}

export interface TranscriptionError {
  message: string
  code?: string
  status?: number
}

/**
 * Rate limiting을 고려하여 요청 간격을 조절합니다.
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeElapsed = now - lastRequestTime
  if (timeElapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeElapsed))
  }
  lastRequestTime = Date.now()
}

/**
 * 오디오를 Whisper API를 사용하여 텍스트로 전사합니다.
 * @param audioBlob - 전사할 오디오 Blob
 * @param apiKey - OpenAI API 키
 * @param language - 음성 인식 언어 (선택사항)
 * @returns 전사 결과
 * @throws TranscriptionError
 */
export async function transcribeAudio(
  audioBlob: Blob,
  apiKey: string,
  language?: string
): Promise<TranscriptionResponse> {
  if (!apiKey) {
    throw new Error('API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 입력해주세요.')
  }

  // Rate limiting 대기
  await waitForRateLimit()

  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.wav')
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'json')

  // 언어가 지정된 경우 추가
  if (language) {
    formData.append('language', language)
  }

  let attempt = 0
  let lastError: any = null

  while (attempt < MAX_RETRIES) {
    try {
      const response = await axios.post(WHISPER_API_ENDPOINT, formData, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60초 타임아웃
      })

      return {
        text: response.data.text,
        language: response.data.language,
      }
    } catch (error: any) {
      attempt++
      lastError = error

      // 에러 정보 로깅
      if (error.response) {
        const status = error.response.status
        const errorData = error.response.data

        // API 키 오류는 즉시 실패
        if (status === 401) {
          throw {
            message: 'API 키가 유효하지 않습니다. 설정 페이지에서 API 키를 확인해주세요.',
            code: 'INVALID_API_KEY',
            status: 401,
          } as TranscriptionError
        }

        // Rate limit 오류
        if (status === 429) {
          const retryAfter = error.response.headers['retry-after']
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : RETRY_DELAY * attempt

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            continue
          }
        }

        // 파일 크기 오류
        if (status === 413 || status === 400) {
          throw {
            message:
              errorData.error?.message ||
              '오디오 파일이 너무 크거나 형식이 올바르지 않습니다. 최대 25MB의 M4A, MP3, MP4, MPEG, MPGA, OGA, OGG, WAV, 또는 WEBM 파일을 사용해주세요.',
            code: 'FILE_ERROR',
            status,
          } as TranscriptionError
        }
      } else if (error.request) {
        // 네트워크 오류
        if (attempt < MAX_RETRIES) {
          console.error(`Transcription attempt ${attempt} failed: Network error`, error)
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt))
          continue
        } else {
          throw {
            message: '네트워크 연결 문제로 전사에 실패했습니다. 인터넷 연결을 확인해주세요.',
            code: 'NETWORK_ERROR',
          } as TranscriptionError
        }
      }

      // 재시도 횟수 초과
      if (attempt >= MAX_RETRIES) {
        throw {
          message:
            error.response?.data?.error?.message ||
            `전사에 실패했습니다. (${attempt}번 시도 후 실패)`,
          code: 'MAX_RETRIES_EXCEEDED',
          status: error.response?.status,
        } as TranscriptionError
      }
    }
  }

  // 이 지점에 도달하면 안 되지만, 타입 안전성을 위해
  throw {
    message: lastError?.message || '전사에 실패했습니다.',
    code: 'UNKNOWN_ERROR',
  } as TranscriptionError
}

