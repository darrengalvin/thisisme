import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  // Use absolute URL with fallback
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app'

  console.log('GitHub Callback - Received parameters:', {
    hasCode: !!code,
    hasState: !!state,
    error: error || 'none',
    baseUrl
  })

  // Handle OAuth errors
  if (error) {
    console.log('GitHub OAuth error:', error)
    return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=oauth_${error}`)
  }

  if (!code) {
    console.log('No authorization code provided')
    return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=no_code`)
  }

  // Verify state parameter for security
  const storedState = request.cookies.get('github_oauth_state')?.value
  if (!state || state !== storedState) {
    console.log('Invalid or missing state parameter:', { received: state, stored: storedState })
    return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=invalid_state`)
  }

  try {
    console.log('Exchanging code for access token...')
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'AI-Support-System/1.0'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    })

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('GitHub token exchange error:', tokenData)
      return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error_description || tokenData.error)}`)
    }

    console.log('Token exchange successful, fetching user data...')

    // Get user info with better error handling
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Support-System/1.0'
      }
    })

    if (!userResponse.ok) {
      throw new Error(`User fetch failed: ${userResponse.status} ${userResponse.statusText}`)
    }

    const userData = await userResponse.json()
    console.log('User data fetched:', { login: userData.login, id: userData.id })

    // Store in Supabase with better error handling
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      console.error('No auth token found in callback')
      return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=auth_required`)
    }

    // Verify JWT token and extract user ID
    const { verifyToken } = await import('@/lib/auth')
    const userInfo = await verifyToken(token)
    
    if (!userInfo) {
      console.error('Invalid auth token in callback')
      return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=auth_required`)
    }

    console.log('Storing GitHub connection for user:', userInfo.userId)

    // Store GitHub connection with enhanced data
    const { error: connectionError } = await supabase.from('github_connections').upsert({
      user_id: userInfo.userId,
      github_username: userData.login,
      github_id: userData.id,
      access_token: tokenData.access_token,
      scope: tokenData.scope,
      token_type: tokenData.token_type || 'bearer',
      avatar_url: userData.avatar_url,
      name: userData.name,
      email: userData.email,
      connected_at: new Date().toISOString()
    })

    if (connectionError) {
      console.error('Failed to store GitHub connection:', connectionError)
      return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=db_connection_failed`)
    }

    console.log('Fetching user repositories...')

    // Get user's repositories with pagination and better filtering
    let allRepos = []
    let page = 1
    const perPage = 100

    while (true) {
      const reposResponse = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&type=all`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Support-System/1.0'
        }
      })

      if (!reposResponse.ok) {
        console.warn(`Failed to fetch repositories page ${page}:`, reposResponse.status)
        break
      }

      const repos = await reposResponse.json()
      
      if (!Array.isArray(repos) || repos.length === 0) {
        break
      }

      allRepos.push(...repos)
      
      if (repos.length < perPage) {
        break // Last page
      }
      
      page++
    }

    console.log(`Found ${allRepos.length} repositories`)

    // Store repositories with enhanced metadata
    if (allRepos.length > 0) {
      // Clear existing repositories first
      await supabase.from('github_repositories').delete().eq('user_id', userInfo.userId)

      // Filter and store relevant repositories
      const reposToStore = allRepos
        .filter(repo => !repo.archived && !repo.disabled) // Only active repos
        .map(repo => ({
          user_id: userInfo.userId,
          repo_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          default_branch: repo.default_branch || 'main',
          url: repo.html_url,
          clone_url: repo.clone_url,
          language: repo.language,
          size: repo.size,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks,
          has_issues: repo.has_issues,
          has_projects: repo.has_projects,
          has_wiki: repo.has_wiki,
          permissions: {
            admin: repo.permissions?.admin || false,
            maintain: repo.permissions?.maintain || false,
            push: repo.permissions?.push || false,
            triage: repo.permissions?.triage || false,
            pull: repo.permissions?.pull || false
          },
          updated_at: repo.updated_at,
          connected_at: new Date().toISOString()
        }))

      // Batch insert repositories
      const { error: reposError } = await supabase
        .from('github_repositories')
        .insert(reposToStore)

      if (reposError) {
        console.error('Failed to store repositories:', reposError)
        // Don't fail the entire flow for this
      } else {
        console.log(`Successfully stored ${reposToStore.length} repositories`)
      }
    }

    console.log('GitHub connection successful, redirecting...')
    
    // Clear the state cookie
    const response = NextResponse.redirect(`${baseUrl}/admin/ai-support?github=connected&repos=${allRepos.length}`)
    response.cookies.delete('github_oauth_state')
    
    return response

  } catch (error) {
    console.error('GitHub callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=callback_failed&details=${encodeURIComponent(errorMessage)}`)
  }
}