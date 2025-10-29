import { Button } from './ui/button'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useClipboard } from '../hooks/useClipboard'

interface CopyButtonProps {
  text: string
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export default function CopyButton({ 
  text, 
  className,
  size = 'sm',
  variant = 'outline'
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { copy, isCopying } = useClipboard()

  const handleCopy = async () => {
    const success = await copy(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleCopy}
      disabled={isCopying || !text}
      aria-label={copied ? '복사됨' : '클립보드에 복사'}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          복사됨
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          복사
        </>
      )}
    </Button>
  )
}

