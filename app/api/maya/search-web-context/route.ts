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
    const { query, context_type, max_results = 5 } = body

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    // Use Tavily API for web search (or fallback to Serper)
    const tavilyApiKey = process.env.TAVILY_API_KEY
    
    if (!tavilyApiKey) {
      return NextResponse.json(
        { success: false, error: 'Search service not configured' },
        { status: 503 }
      )
    }

    // Build search query based on context type
    let enhancedQuery = query
    if (context_type === 'historical_event') {
      enhancedQuery = `${query} history facts when did it happen`
    } else if (context_type === 'location') {
      enhancedQuery = `${query} location place information history`
    } else if (context_type === 'person') {
      enhancedQuery = `${query} person biography information`
    }

    // Call Tavily Search API
    const searchResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tavilyApiKey}`
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: enhancedQuery,
        search_depth: 'basic',
        include_answer: true,
        include_images: true,
        max_results: max_results
      })
    })

    if (!searchResponse.ok) {
      throw new Error('Search service failed')
    }

    const searchData = await searchResponse.json()

    // Format results for Maya
    const results = {
      summary: searchData.answer || '',
      sources: searchData.results?.map((result: any) => ({
        title: result.title,
        snippet: result.content,
        url: result.url,
        relevance_score: result.score
      })) || [],
      images: searchData.images?.slice(0, 3) || [],
      query_used: enhancedQuery
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error: any) {
    console.error('Search web context error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search web context' },
      { status: 500 }
    )
  }
}
