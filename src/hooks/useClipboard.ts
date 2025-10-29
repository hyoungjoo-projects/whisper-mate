import { useState } from 'react'
import { copyToClipboard } from '../utils/clipboard'
import { toast } from 'sonner'

export function useClipboard() {
  const [isCopying, setIsCopying] = useState(false)

  const copy = async (text: string): Promise<boolean> => {
    if (!text) {
      toast.error('복사할 텍스트가 없습니다')
      return false
    }
    
    setIsCopying(true)
    try {
      const success = await copyToClipboard(text)
      
      if (success) {
        toast.success('클립보드에 복사되었습니다', {
          description: '텍스트가 클립보드에 복사되었습니다',
        })
      } else {
        toast.error('복사에 실패했습니다', {
          description: '수동으로 복사해주세요',
        })
      }
      
      return success
    } catch (error) {
      console.error('Clipboard error:', error)
      toast.error('복사 중 오류가 발생했습니다')
      return false
    } finally {
      setIsCopying(false)
    }
  }

  return { copy, isCopying }
}

