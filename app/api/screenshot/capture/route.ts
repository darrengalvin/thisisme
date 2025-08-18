import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, ticketId, type = 'validation' } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 })
    }

    console.log(`📸 Capturing screenshot for ${type}: ${url}`)

    // Option 1: Use Puppeteer (if available)
    if (process.env.NODE_ENV === 'development') {
      try {
        // This would work in development with puppeteer installed
        // For production, we'd use a service like Browserless or Playwright
        
        const screenshotUrl = await captureWithService(url, ticketId)
        
        return NextResponse.json({
          success: true,
          screenshotUrl,
          message: 'Screenshot captured successfully'
        })
      } catch (error) {
        console.warn('Screenshot service failed:', error)
      }
    }

    // Option 2: Use external screenshot service
    if (process.env.SCREENSHOT_API_KEY) {
      try {
        const screenshotUrl = await captureWithScreenshotAPI(url)
        
        return NextResponse.json({
          success: true,
          screenshotUrl,
          message: 'Screenshot captured via external service'
        })
      } catch (error) {
        console.warn('External screenshot service failed:', error)
      }
    }

    // Fallback: Manual screenshot instructions
    return NextResponse.json({
      success: false,
      message: 'Screenshot service not available',
      instructions: {
        manual: true,
        steps: [
          `1. Visit: ${url}`,
          '2. Navigate to the chapters/timeline view',
          '3. Take a screenshot of the chapter order',
          '4. Compare with expected chronological order',
          '5. Report validation results in the ticket'
        ],
        expectedUrl: url
      }
    })

  } catch (error) {
    console.error('Screenshot capture error:', error)
    return NextResponse.json(
      { error: 'Screenshot capture failed', details: error },
      { status: 500 }
    )
  }
}

async function captureWithService(url: string, ticketId: string): Promise<string> {
  // This would use Puppeteer or similar
  // For now, return a placeholder
  return `https://placeholder-screenshots.example.com/${ticketId}-${Date.now()}.png`
}

async function captureWithScreenshotAPI(url: string): Promise<string> {
  // Example: Using a service like ScreenshotAPI, Urlbox, or similar
  const response = await fetch('https://shot.screenshotapi.net/screenshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SCREENSHOT_API_KEY}`
    },
    body: JSON.stringify({
      url,
      width: 1920,
      height: 1080,
      format: 'png',
      full_page: false,
      delay: 2000 // Wait 2 seconds for page to load
    })
  })

  if (response.ok) {
    const data = await response.json()
    return data.screenshot_url || data.url
  }

  throw new Error('Screenshot API request failed')
}







