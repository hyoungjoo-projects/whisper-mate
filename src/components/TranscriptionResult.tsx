import { memo, useState, useEffect, useCallback } from 'react'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'
import CopyButton from './CopyButton'
import { useClipboard } from '../hooks/useClipboard'
import { Edit2, Check, X, Loader2 } from 'lucide-react'

interface TranscriptionResultProps {
  text: string
  onTextChange?: (text: string) => void
  onSave?: (text: string) => void
  isLoading?: boolean
}

const TranscriptionResult = memo(function TranscriptionResult({
  text,
  onTextChange,
  onSave,
  isLoading = false,
}: TranscriptionResultProps) {
  const [editedText, setEditedText] = useState(text)
  const [isEditing, setIsEditing] = useState(false)
  const { copy } = useClipboard()
  
  useEffect(() => {
    setEditedText(text)
  }, [text])
  
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setEditedText(newText)
    onTextChange?.(newText)
  }, [onTextChange])
  
  const handleSave = useCallback(async () => {
    setIsEditing(false)
    onSave?.(editedText)
    await copy(editedText)
  }, [editedText, onSave, copy])

  const handleCancel = useCallback(() => {
    setEditedText(text)
    setIsEditing(false)
  }, [text])
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>전사 결과</span>
          {!isLoading && text && (
            <span className="text-sm font-normal text-muted-foreground">
              {editedText.length}자
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="h-32 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">음성을 텍스트로 변환하는 중...</p>
              <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
            </div>
          </div>
        ) : isEditing ? (
          <Textarea
            value={editedText}
            onChange={handleTextChange}
            className="min-h-[150px] resize-y font-mono text-sm"
            placeholder="전사 결과가 여기에 표시됩니다"
            autoFocus
          />
        ) : (
          <div className="min-h-[150px] p-4 border rounded-md bg-muted/50 whitespace-pre-wrap break-words">
            {editedText || (
              <span className="text-muted-foreground italic">
                전사 결과가 여기에 표시됩니다
              </span>
            )}
          </div>
        )}
      </CardContent>
      
      {!isLoading && (
        <CardFooter className="flex justify-between">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!editedText.trim()}
              >
                <Check className="h-4 w-4 mr-2" />
                저장 및 복사
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={isLoading || !text}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                편집
              </Button>
              <CopyButton text={editedText} />
            </>
          )}
        </CardFooter>
      )}
    </Card>
  )
})

export default TranscriptionResult

