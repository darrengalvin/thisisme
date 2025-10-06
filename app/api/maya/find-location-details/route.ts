import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Extract and verify token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { location_name, include_images = true, include_history = true } = body

    if (!location_name) {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      )
    }

    // Use Google Places API or OpenStreetMap Nominatim for location details
    const results: any = {
      location: location_name,
      found: false
    }

    // Try Nominatim first (free, open source)
    try {
      const nominatimResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location_name)}&format=json&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ThisIsMe Memory App'
          }
        }
      )

      const nominatimData = await nominatimResponse.json()
      
      if (nominatimData && nominatimData.length > 0) {
        const place = nominatimData[0]
        results.found = true
        results.formatted_address = place.display_name
        results.coordinates = {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        }
        results.place_type = place.type
        results.country = place.address?.country
        results.city = place.address?.city || place.address?.town || place.address?.village
      }
    } catch (error) {
      console.error('Nominatim error:', error)
    }

    // If we want images, search for them
    if (include_images && results.found) {
      try {
        // Use Unsplash or Pexels API for location images
        const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY
        
        if (unsplashAccessKey) {
          const unsplashResponse = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(location_name)}&per_page=3&orientation=landscape`,
            {
              headers: {
                'Authorization': `Client-ID ${unsplashAccessKey}`
              }
            }
          )

          const unsplashData = await unsplashResponse.json()
          
          results.images = unsplashData.results?.map((img: any) => ({
            url: img.urls.regular,
            thumbnail: img.urls.thumb,
            photographer: img.user.name,
            source: 'Unsplash'
          })) || []
        }
      } catch (error) {
        console.error('Image search error:', error)
        results.images = []
      }
    }

    // Get historical/contextual information using web search
    if (include_history && results.found) {
      try {
        const tavilyApiKey = process.env.TAVILY_API_KEY
        
        if (tavilyApiKey) {
          const searchResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: `${location_name} history facts information`,
              search_depth: 'basic',
              include_answer: true,
              max_results: 2
            })
          })

          const searchData = await searchResponse.json()
          results.historical_info = searchData.answer || ''
          results.historical_sources = searchData.results?.slice(0, 2).map((r: any) => ({
            title: r.title,
            snippet: r.content,
            url: r.url
          })) || []
        }
      } catch (error) {
        console.error('Historical info error:', error)
      }
    }

    if (!results.found) {
      return NextResponse.json({
        success: false,
        error: 'Location not found',
        data: results
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error: any) {
    console.error('Find location details error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to find location details' },
      { status: 500 }
    )
  }
}
