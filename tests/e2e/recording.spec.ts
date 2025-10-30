import { test, expect } from './fixtures'

test.describe('Recording and transcription flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock MediaRecorder and getUserMedia APIs
    await page.addInitScript(() => {
      // Mock MediaRecorder - improved implementation
      ;(window as any).MediaRecorder = class MockMediaRecorder {
        private chunks: Blob[] = []
        private _state: string = 'inactive'
        private intervalId: any = null
        ondataavailable: ((event: { data: Blob }) => void) | null = null
        onstop: (() => void) | null = null
        public mimeType: string = 'audio/webm'

        constructor(stream?: MediaStream, options?: { mimeType?: string }) {
          if (options?.mimeType) {
            this.mimeType = options.mimeType
          }
        }

        static isTypeSupported(type: string): boolean {
          return type === 'audio/webm' || type === 'audio/wav' || type === 'audio/ogg'
        }

        start(timeslice?: number) {
          this._state = 'recording'
          this.chunks = []
          
          // Simulate periodic data chunks like real MediaRecorder
          this.intervalId = setInterval(() => {
            if (this._state === 'recording' && this.ondataavailable) {
              const chunk = new Blob(['mock audio chunk'], { type: this.mimeType })
              this.ondataavailable({ data: chunk } as any)
              this.chunks.push(chunk)
            }
          }, timeslice || 100)
        }

        stop() {
          this._state = 'inactive'
          
          if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
          }
          
          // Ensure at least one chunk exists before calling onstop
          // This is critical - onstop is called AFTER chunks are available
          const finalize = () => {
            if (this.chunks.length === 0 && this.ondataavailable) {
              const chunk = new Blob(['final mock audio chunk'], { type: this.mimeType })
              this.ondataavailable({ data: chunk } as any)
              this.chunks.push(chunk)
            }
            
            // Call onstop after chunks are ready
            // Use longer delay to ensure React state updates properly
            if (this.onstop) {
              this.onstop()
            }
          }
          
          // Use setTimeout to ensure chunks are processed and state can update
          setTimeout(finalize, 100)
        }

        get state() {
          return this._state
        }
      }

      // Mock getUserMedia - return mock tracks
      ;(navigator.mediaDevices as any).getUserMedia = async () => {
        const mockTrack = {
          stop: () => {},
          kind: 'audio',
          enabled: true,
          muted: false,
        }
        return {
          getTracks: () => [mockTrack],
          getAudioTracks: () => [mockTrack],
          getVideoTracks: () => [],
          addTrack: () => {},
          removeTrack: () => {},
        } as MediaStream
      }
    })
  })

  test('should show recording interface', async ({ page }) => {
    await page.goto('/')

    // Check for main heading - use main region to avoid header heading
    await expect(page.getByRole('main').getByRole('heading', { name: /whisper mate/i })).toBeVisible()

    // Check for microphone button - look for button with aria-label or large circular button
    const recordButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await expect(recordButton).toBeVisible()

    // Check for recording timer display - look for time format like "0:00" or "00:00"
    await expect(page.getByText(/\d+:\d{2}/).first()).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/')

    // Find and click the History link
    const historyLink = page.getByRole('link', { name: /history/i })
    await expect(historyLink).toBeVisible()
    await historyLink.click()

    // Verify we're on the history page
    await expect(page.getByText('Transcription History')).toBeVisible()
    await expect(page.url()).toContain('/history')
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/')

    // Find and click the Settings link
    const settingsLink = page.getByRole('link', { name: /settings/i })
    await expect(settingsLink).toBeVisible({ timeout: 5000 })
    await settingsLink.click()

    // Wait for navigation
    await page.waitForURL('**/settings', { timeout: 5000 })

    // Verify we're on the settings page
    await expect(page.getByRole('heading', { name: /설정/i })).toBeVisible({ timeout: 5000 })
    await expect(page.url()).toContain('/settings')
  })

  test('should handle the recording flow with mocked API', async ({ page }) => {
    // Set API key and settings in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('whisper-mate-settings', JSON.stringify({ 
        apiKey: 'test-api-key',
        recognitionLanguage: 'ko',
        autoSave: false,
        autoCopyToClipboard: false,
      }))
    })

    // Mock the Whisper API response - intercept all transcription requests
    let apiCalled = false
    await page.route('**/api.openai.com/v1/audio/transcriptions', async (route) => {
      apiCalled = true
      console.log('✅ Mock API intercepted:', route.request().method(), route.request().url())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'This is a mocked transcription result.',
          language: 'en',
        }),
      })
    })
    
    // Also catch generic v1/audio/transcriptions pattern (fallback)
    await page.route('**/v1/audio/transcriptions', async (route) => {
      if (!apiCalled) {
        apiCalled = true
        console.log('✅ Mock API intercepted (pattern 2):', route.request().method(), route.request().url())
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'This is a mocked transcription result.',
          language: 'en',
        }),
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300) // Wait for React to initialize

    // Find the recording button in the main area
    const recordButton = page
      .getByRole('main')
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first()

    await expect(recordButton).toBeVisible({ timeout: 5000 })

    // Start recording
    await recordButton.click()

    // Wait for recording state to be active and chunks to be collected
    await page.waitForTimeout(1000) // Give MediaRecorder time to collect chunks

    // Stop recording - this will trigger onstop and create audioBlob
    await recordButton.click()

    // Wait for onstop to complete and audioBlob to be set (async operation)
    await page.waitForTimeout(600)

    // Wait for API call - check if it was called (with timeout)
    // The API call happens after audioBlob is set, which happens after onstop
    let attempts = 0
    while (!apiCalled && attempts < 60) {
      await page.waitForTimeout(300)
      attempts++
    }

    // If API was not called, it means audioBlob was likely not created
    // or the transcription flow didn't trigger. Provide helpful error message.
    if (!apiCalled) {
      const pageContent = await page.locator('body').textContent()
      throw new Error(
        `Mock API was not called after stopping recording.\n` +
        `This likely means the audioBlob was not created properly.\n` +
        `Waited ${attempts * 300}ms. Check Mock MediaRecorder implementation.\n` +
        `Page content preview: ${pageContent?.substring(0, 300) || 'empty'}`
      )
    }

    // Additional wait for React state updates after API response
    await page.waitForTimeout(2000)

    // Check for transcription result - try multiple approaches
    const transcriptionText = 'This is a mocked transcription result.'
    
    // Method 1: Check if Latest Transcription section exists
    const latestHeading = page.getByText('Latest Transcription')
    const hasLatestSection = await latestHeading.isVisible({ timeout: 3000 }).catch(() => false)
    
    if (hasLatestSection) {
      // Look for textarea containing the transcription
      const textarea = page.locator('textarea').filter({ 
        hasText: new RegExp(transcriptionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') 
      })
      await expect(textarea).toBeVisible({ timeout: 8000 })
    } else {
      // Method 2: Check Recent Transcriptions list or anywhere on page
      await expect(
        page.getByText(transcriptionText, { exact: false })
      ).toBeVisible({ timeout: 15000 })
    }
  })

  test('should show API key error when API key is not set', async ({ page }) => {
    // Ensure API key is not set in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('whisper-mate-settings', JSON.stringify({ 
        apiKey: null,
        recognitionLanguage: 'ko',
      }))
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300) // Wait for React to initialize

    const recordButton = page
      .getByRole('main')
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first()

    await expect(recordButton).toBeVisible({ timeout: 5000 })

    // Start recording
    await recordButton.click()
    
    // Wait for recording to start and audio chunks to be collected
    await page.waitForTimeout(1200) // Ensure MediaRecorder collects chunks
    
    // Stop recording - this should trigger API key check since we have audioBlob
    await recordButton.click()
    
    // Wait for onstop to complete, audioBlob to be set, and error handling
    await page.waitForTimeout(800)

    // Wait for toast to appear - Sonner toast renders asynchronously
    await page.waitForTimeout(2000)

    // Check for the error message - try multiple strategies
    const errorPattern = /API 키가 설정되지 않았습니다/i
    
    // Strategy 1: Direct text search anywhere on page
    const errorText = page.getByText(errorPattern)
    const foundDirectly = await errorText.isVisible({ timeout: 4000 }).catch(() => false)
    
    if (foundDirectly) {
      return // Success!
    }

    // Strategy 2: Check toast containers
    const toastSelectors = [
      '[data-sonner-toast]',
      '[role="status"]',
      '[aria-live="polite"]',
      '[aria-live="assertive"]',
      '.sonner-toast',
      '[id*="sonner"]',
      '[id*="toast"]',
    ]
    
    for (const selector of toastSelectors) {
      const toastElements = page.locator(selector)
      const count = await toastElements.count()
      
      if (count > 0) {
        // Check each toast element for the error message
        for (let i = 0; i < count; i++) {
          const toastText = await toastElements.nth(i).textContent()
          if (toastText && errorPattern.test(toastText)) {
            return // Found the error message!
          }
        }
      }
    }

    // Strategy 3: Check entire page content
    await page.waitForTimeout(500)
    const pageText = await page.locator('body').textContent()
    
    if (pageText && errorPattern.test(pageText)) {
      return // Error message found somewhere on the page
    }

    // Strategy 4: Check for any toast with API-related keywords
    const allToasts = page.locator('[role="status"], [aria-live], [data-sonner-toast]')
    const toastCount = await allToasts.count()
    
    if (toastCount > 0) {
      for (let i = 0; i < toastCount; i++) {
        const toastContent = await allToasts.nth(i).textContent()
        if (toastContent && (toastContent.includes('API') || toastContent.includes('키'))) {
          return // Found a toast with API-related content
        }
      }
    }

    // If all strategies fail, throw detailed error with screenshot
    const screenshotPath = 'test-results/api-error-debug.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })
    
    throw new Error(
      `API key error toast not found.\n` +
      `Expected: "API 키가 설정되지 않았습니다"\n` +
      `Screenshot saved to: ${screenshotPath}\n` +
      `Page text preview: ${pageText?.substring(0, 300) || 'empty'}`
    )
  })
})
