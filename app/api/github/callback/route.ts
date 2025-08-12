import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/admin/ai-support?error=no_code')
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData)
      return NextResponse.redirect('/admin/ai-support?error=oauth_failed')
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    const userData = await userResponse.json()

    // Store in Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Store GitHub connection
      await supabase.from('github_connections').upsert({
        user_id: user.id,
        github_username: userData.login,
        github_id: userData.id,
        access_token: tokenData.access_token,
        scope: tokenData.scope,
        connected_at: new Date().toISOString()
      })

      // Get user's repositories
      const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      const repos = await reposResponse.json()

      // Store repositories
      for (const repo of repos) {
        await supabase.from('github_repositories').upsert({
          user_id: user.id,
          repo_id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          default_branch: repo.default_branch,
          url: repo.html_url,
          connected_at: new Date().toISOString()
        })
      }
    }

    return NextResponse.redirect('/admin/ai-support?github=connected')
  } catch (error) {
    console.error('GitHub callback error:', error)
    return NextResponse.redirect('/admin/ai-support?error=callback_failed')
  }
}