import { test, expect } from './fixtures'

test.describe('Transcription history', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase response for transcriptions
    await page.route('**/rest/v1/transcriptions**', async (route) => {
      const url = route.request().url()
      
      // Handle search requests (contains ilike parameter)
      if (url.includes('ilike')) {
        const searchMatch = url.match(/ilike=text\.%25(.*?)%25/)
        if (searchMatch && searchMatch[1]) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: {
              'content-range': '0-0/1',
            },
            body: JSON.stringify([
              {
                id: '1',
                created_at: new Date().toISOString(),
                text: 'This is a test transcription.',
                audio_duration: 5.2,
                language: 'en',
              },
            ]),
          })
          return
        }
      }

      // Default: return all transcriptions
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': '0-1/2',
        },
        body: JSON.stringify([
          {
            id: '1',
            created_at: new Date().toISOString(),
            text: 'This is a test transcription.',
            audio_duration: 5.2,
            language: 'en',
          },
          {
            id: '2',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            text: 'This is an older transcription.',
            audio_duration: 3.7,
            language: 'en',
          },
        ]),
      })
    })

    await page.goto('/history')
  })

  test('should display transcription history', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check for heading
    await expect(page.getByText('Transcription History')).toBeVisible()

    // Verify transcriptions are displayed
    await expect(page.getByText('This is a test transcription.', { exact: false })).toBeVisible()
    await expect(
      page.getByText('This is an older transcription.', { exact: false })
    ).toBeVisible()
  })

  test('should search transcriptions', async ({ page }) => {
    // Override route for this test to handle search properly
    await page.route('**/rest/v1/transcriptions**', async (route) => {
      const url = route.request().url()
      
      // Handle search requests (contains ilike parameter)
      if (url.includes('ilike') && url.includes('test')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'content-range': '0-0/1',
          },
          body: JSON.stringify([
            {
              id: '1',
              created_at: new Date().toISOString(),
              text: 'This is a test transcription.',
              audio_duration: 5.2,
              language: 'en',
            },
          ]),
        })
        return
      }
      
      // Default: return all transcriptions
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'content-range': '0-1/2',
        },
        body: JSON.stringify([
          {
            id: '1',
            created_at: new Date().toISOString(),
            text: 'This is a test transcription.',
            audio_duration: 5.2,
            language: 'en',
          },
          {
            id: '2',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            text: 'This is an older transcription.',
            audio_duration: 3.7,
            language: 'en',
          },
        ]),
      })
    })

    // Wait for initial content to load
    await page.waitForLoadState('networkidle')

    // Find search input
    const searchInput = page.getByPlaceholder('Search transcriptions...')
    await expect(searchInput).toBeVisible()

    // Type search query
    await searchInput.fill('test')

    // Click search button or press Enter
    const searchButton = page.getByRole('button', { name: /search/i })
    await searchButton.click()

    // Wait for search results - wait longer for the search to complete
    await page.waitForTimeout(1000)
    await page.waitForLoadState('networkidle')

    // Verify search results
    await expect(page.getByText('This is a test transcription.', { exact: false })).toBeVisible({ timeout: 5000 })

    // Verify non-matching transcription is not visible
    await expect(page.getByText('This is an older transcription.', { exact: false })).not.toBeVisible({ timeout: 5000 })
  })

  test('should handle empty search results', async ({ page }) => {
    // Mock empty search response
    await page.route('**/rest/v1/transcriptions**', async (route) => {
      const url = route.request().url()
      if (url.includes('ilike')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'content-range': '0--1/0',
          },
          body: JSON.stringify([]),
        })
        return
      }
      route.continue()
    })

    await page.goto('/history')
    await page.waitForLoadState('networkidle')

    const searchInput = page.getByPlaceholder('Search transcriptions...')
    await searchInput.fill('nonexistent query')
    await page.getByRole('button', { name: /search/i }).click()

    // Wait for search to complete
    await page.waitForTimeout(1000)

    // Should show empty state - use getByRole to find heading specifically, not toast message
    await expect(page.getByRole('heading', { name: /no transcriptions found/i })).toBeVisible({ timeout: 5000 })
  })

  test('should delete a transcription', async ({ page }) => {
    let deleteRequestMade = false

    // Override route for this test to handle DELETE properly
    await page.route('**/rest/v1/transcriptions**', async (route) => {
      const url = route.request().url()
      
      // Handle DELETE requests
      if (route.request().method() === 'DELETE') {
        deleteRequestMade = true
        await route.fulfill({
          status: 204,
        })
        return
      }
      
      // Handle GET requests - return transcriptions
      if (route.request().method() === 'GET' && !url.includes('ilike')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'content-range': '0-1/2',
          },
          body: JSON.stringify([
            {
              id: '1',
              created_at: new Date().toISOString(),
              text: 'This is a test transcription.',
              audio_duration: 5.2,
              language: 'en',
            },
            {
              id: '2',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              text: 'This is an older transcription.',
              audio_duration: 3.7,
              language: 'en',
            },
          ]),
        })
        return
      }
      
      route.continue()
    })

    await page.goto('/history')
    await page.waitForLoadState('networkidle')

    // Wait for transcriptions to load
    await expect(page.getByText('This is a test transcription.', { exact: false })).toBeVisible({ timeout: 5000 })

    // Find delete button using aria-label
    const deleteButton = page.getByRole('button', { name: /delete transcription/i }).first()
    
    await expect(deleteButton).toBeVisible({ timeout: 5000 })
    
    // Click delete button
    await deleteButton.click()

    // Wait for dialog and confirm deletion
    const deleteConfirmButton = page.getByRole('button', { name: /delete/i }).filter({ hasText: /delete/i })
    await expect(deleteConfirmButton).toBeVisible({ timeout: 3000 })
    await deleteConfirmButton.click()

    // Verify delete request was made
    await page.waitForTimeout(1000)
    expect(deleteRequestMade).toBeTruthy()
  })
})

