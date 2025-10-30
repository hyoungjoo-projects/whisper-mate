import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSettings } from '@/context/SettingsContext'
import { deleteAllTranscriptions } from '@/services/transcriptionService'
import { useTheme } from '@/components/theme-provider'
import { languageOptions, audioQualityOptions, type Language, type AudioQuality, type Theme } from '@/types/settings'
import { toast } from 'sonner'
import { 
  Key, 
  Languages, 
  Volume2, 
  Palette, 
  Settings2, 
  Keyboard, 
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  AlertCircle,
} from 'lucide-react'

interface SettingItemProps {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex items-center justify-between py-4 px-1">
      <div className="flex items-start gap-4 flex-1">
        <div className="mt-1 text-muted-foreground">{icon}</div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <div className="ml-4">{action}</div>
    </div>
  )
}

interface SettingsSectionProps {
  title: string
  description?: string
  badge?: string
  children: React.ReactNode
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, badge, children }) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1.5">{description}</CardDescription>
            )}
          </div>
          {badge && (
            <Badge variant="secondary" className="ml-2">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {children}
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, exportSettings, importSettings, setApiKey } = useSettings()
  const { theme, setTheme } = useTheme()
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [shortcutValue, setShortcutValue] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleApiKeyChange = (value: string) => {
    setApiKey(value || null)
    if (value) {
      toast.success('API 키가 저장되었습니다')
    }
  }

  const handleRemoveApiKey = () => {
    setApiKey(null)
    toast.success('API 키가 제거되었습니다')
  }

  const handleExportSettings = () => {
    const json = exportSettings()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whisper-mate-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('설정이 내보내기되었습니다')
  }

  const handleImportSettings = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        if (importSettings(json)) {
          toast.success('설정이 가져오기되었습니다')
        } else {
          toast.error('설정 가져오기에 실패했습니다. 파일 형식을 확인해주세요.')
        }
      } catch (error) {
        toast.error('설정 가져오기에 실패했습니다.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleShortcutEdit = (shortcutKey: string, currentKey: string) => {
    setEditingShortcut(shortcutKey)
    setShortcutValue(currentKey)
  }

  const handleShortcutSave = (shortcutKey: string) => {
    updateSettings({
      shortcuts: {
        ...settings.shortcuts,
        [shortcutKey]: {
          ...settings.shortcuts[shortcutKey as keyof typeof settings.shortcuts],
          key: shortcutValue,
        },
      },
    })
    setEditingShortcut(null)
    setShortcutValue('')
    toast.success('단축키가 저장되었습니다')
  }

  const handleShortcutCancel = () => {
    setEditingShortcut(null)
    setShortcutValue('')
  }

  const formatShortcutKey = (key: string) => {
    return key.split('+').map(k => {
      const keyMap: Record<string, string> = {
        'Ctrl': '⌃',
        'Shift': '⇧',
        'Alt': '⌥',
        'Meta': '⌘',
      }
      return keyMap[k.trim()] || k.trim()
    }).join(' + ')
  }

  const handleDeleteAllData = async () => {
    try {
      await deleteAllTranscriptions()
      setDeleteDialogOpen(false)
      toast.success('모든 전사 데이터가 삭제되었습니다')
    } catch (error) {
      console.error('Failed to delete all transcriptions:', error)
      toast.error('데이터 삭제에 실패했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 md:p-8 lg:p-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">설정</h1>
          <p className="text-muted-foreground">
            애플리케이션의 모든 설정을 관리하세요
          </p>
        </div>

        <div className="space-y-6">
          {/* API Settings */}
          <SettingsSection
            title="API 설정"
            description="OpenAI API 키를 입력하고 관리합니다"
          >
            <div className="py-4 px-1">
              <div className="flex items-start gap-4">
                <div className="mt-1 text-muted-foreground">
                  <Key className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor="api-key" className="text-sm font-medium mb-2 block">
                      OpenAI API Key
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="api-key"
                          type={apiKeyVisible ? 'text' : 'password'}
                          value={settings.apiKey || ''}
                          onChange={(e) => handleApiKeyChange(e.target.value)}
                          placeholder="sk-..."
                          className="pr-12"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                          aria-label={apiKeyVisible ? 'Hide API key' : 'Show API key'}
                        >
                          {apiKeyVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {settings.apiKey && (
                        <Button variant="outline" onClick={handleRemoveApiKey}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          제거
                        </Button>
                      )}
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      API 키는 브라우저의 로컬 저장소에 암호화되어 안전하게 보관됩니다.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Language Settings */}
          <SettingsSection
            title="언어 설정"
            description="음성 인식 및 인터페이스 언어를 선택하세요"
          >
            <SettingItem
              icon={<Languages className="w-5 h-5" />}
              title="음성 인식 언어"
              description="전사할 음성의 언어를 선택하세요"
              action={
                <Select
                  value={settings.recognitionLanguage}
                  onValueChange={(value) => updateSettings({ recognitionLanguage: value as Language })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <Separator />
            <SettingItem
              icon={<Languages className="w-5 h-5" />}
              title="UI 언어"
              description="인터페이스 언어를 선택하세요"
              action={
                <Select
                  value={settings.uiLanguage}
                  onValueChange={(value) => updateSettings({ uiLanguage: value as Language })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </SettingsSection>

          {/* Audio Settings */}
          <SettingsSection
            title="오디오 설정"
            description="녹음 오디오의 품질을 조절하세요"
          >
            <SettingItem
              icon={<Volume2 className="w-5 h-5" />}
              title="오디오 품질"
              description="높은 품질은 더 나은 인식 정확도를 제공하지만 파일 크기가 더 큽니다"
              action={
                <Select
                  value={settings.audioQuality}
                  onValueChange={(value) => updateSettings({ audioQuality: value as AudioQuality })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {audioQualityOptions.map((quality) => (
                      <SelectItem key={quality.value} value={quality.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{quality.label}</span>
                          <Badge variant="outline" className="ml-4">
                            {quality.bitrate}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </SettingsSection>

          {/* Theme Settings */}
          <SettingsSection
            title="테마"
            description="애플리케이션의 시각적 스타일을 선택하세요"
          >
            <SettingItem
              icon={<Palette className="w-5 h-5" />}
              title="테마 모드"
              description="라이트, 다크 또는 시스템 설정을 따릅니다"
              action={
                <Select
                  value={theme}
                  onValueChange={(value) => {
                    updateSettings({ theme: value as Theme })
                    setTheme(value as Theme)
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">☀️ 라이트</SelectItem>
                    <SelectItem value="dark">🌙 다크</SelectItem>
                    <SelectItem value="system">💻 시스템 설정</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </SettingsSection>

          {/* Behavior Settings */}
          <SettingsSection
            title="동작 설정"
            description="애플리케이션의 자동 동작을 구성하세요"
          >
            <SettingItem
              icon={<Settings2 className="w-5 h-5" />}
              title="자동 클립보드 복사"
              description="전사 완료 시 자동으로 클립보드에 복사합니다"
              action={
                <Switch
                  checked={settings.autoCopyToClipboard}
                  onCheckedChange={(checked) => updateSettings({ autoCopyToClipboard: checked })}
                />
              }
            />
            <Separator />
            <SettingItem
              icon={<Settings2 className="w-5 h-5" />}
              title="자동 저장"
              description="전사 완료 시 자동으로 이력에 저장합니다"
              action={
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => updateSettings({ autoSave: checked })}
                />
              }
            />
            <Separator />
            <SettingItem
              icon={<Settings2 className="w-5 h-5" />}
              title="자동 녹음 시작"
              description="페이지 로드 시 자동으로 녹음을 시작합니다"
              action={
                <Switch
                  checked={settings.autoStartRecording}
                  onCheckedChange={(checked) => updateSettings({ autoStartRecording: checked })}
                />
              }
            />
          </SettingsSection>

          {/* Keyboard Shortcuts */}
          <SettingsSection
            title="키보드 단축키"
            description="작업 속도를 높일 수 있는 단축키를 설정하세요"
          >
            {Object.entries(settings.shortcuts).map(([key, shortcut], index) => (
              <div key={key}>
                <div className="flex items-center justify-between py-4 px-1">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1 text-muted-foreground">
                      <Keyboard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{shortcut.action}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {shortcut.description || '키보드 단축키를 사용하여 작업을 빠르게 수행합니다'}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4">
                    {editingShortcut === key ? (
                      <div className="flex gap-2 items-center">
                          <Input
                            value={shortcutValue}
                            onChange={(e) => setShortcutValue(e.target.value)}
                            placeholder="Ctrl+Shift+R"
                            className="w-48"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleShortcutSave(key)
                              } else if (e.key === 'Escape') {
                                handleShortcutCancel()
                              }
                            }}
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleShortcutSave(key)}
                          >
                            저장
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleShortcutCancel}
                          >
                            취소
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <kbd className="px-3 py-1 bg-muted rounded text-sm font-mono">
                            {formatShortcutKey(shortcut.key)}
                          </kbd>
                          {shortcut.editable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShortcutEdit(key, shortcut.key)}
                            >
                              편집
                            </Button>
                          )}
                        </div>
                      )}
                  </div>
                </div>
                {index < Object.entries(settings.shortcuts).length - 1 && (
                  <Separator />
                )}
              </div>
            ))}
          </SettingsSection>

          {/* Data Management */}
          <SettingsSection
            title="데이터 관리"
            description="설정을 백업하거나 복원하세요"
          >
            <div className="flex items-center justify-between py-4 px-1">
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1 text-muted-foreground">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">설정 내보내기</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    설정을 JSON 파일로 다운로드합니다
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportSettings}>
                내보내기
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-4 px-1">
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1 text-muted-foreground">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">설정 가져오기</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    백업 파일에서 설정을 복원합니다
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleImportSettings}>
                가져오기
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Separator />
            <div className="flex items-center justify-between py-4 px-1">
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1 text-destructive">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-destructive">모든 전사 데이터 삭제</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    저장된 모든 전사 이력을 영구적으로 삭제합니다
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                삭제
              </Button>
            </div>
          </SettingsSection>

          {/* Delete All Data Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>모든 전사 데이터 삭제</DialogTitle>
                <DialogDescription>
                  이 작업은 되돌릴 수 없습니다. 저장된 모든 전사 이력이 영구적으로 삭제됩니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAllData}
                >
                  삭제
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Save Button */}
          <div className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                설정은 자동으로 저장됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
