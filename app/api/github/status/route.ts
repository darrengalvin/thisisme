import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GitHubClient } from '@/lib/github/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const refresh = searchParams.get('refresh') === 'true'
  const analyzeRepo = searchParams.get('analyze')
  
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    console.log('GitHub Status - Checking connection for user:', user.id)

    // Get GitHub connection
    const { data: connection, error: connectionError } = await supabase
      .from('github_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      console.log('GitHub Status - No connection found:', connectionError?.message)
      return NextResponse.json({ 
        connected: false,
        error: 'GitHub not connected'
      })
    }

    console.log('GitHub Status - Connection found for:', connection.github_username)

    // Validate the connection with GitHub API
    const github = new GitHubClient(connection.access_token)
    const validation = await github.validateConnection()

    if (!validation.valid) {
      console.log('GitHub Status - Connection validation failed:', validation.error)
      
      // Mark connection as invalid but don't delete it yet
      await supabase
        .from('github_connections')
        .update({ 
          last_error: validation.error,
          last_validated: new Date().toISOString()
        })
        .eq('user_id', user.id)

      return NextResponse.json({ 
        connected: false,
        error: validation.error,
        needsReauth: true
      })
    }

    console.log('GitHub Status - Connection validated successfully')

    // Update last validation time
    await supabase
      .from('github_connections')
      .update({ 
        last_validated: new Date().toISOString(),
        last_error: null
      })
      .eq('user_id', user.id)

    // Get repositories (with optional refresh)
    let repositories = []
    
    if (refresh) {
      console.log('GitHub Status - Refreshing repositories from GitHub API...')
      
      // Fetch fresh data from GitHub
      try {
        let allRepos = []
        let page = 1
        const perPage = 100

        while (true) {
          const reposResponse = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&type=all`, {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'AI-Support-System/1.0'
            }
          })

          if (!reposResponse.ok) {
            throw new Error(`Failed to fetch repositories: ${reposResponse.status}`)
          }

          const repos = await reposResponse.json()
          
          if (!Array.isArray(repos) || repos.length === 0) {
            break
          }

          allRepos.push(...repos)
          
          if (repos.length < perPage) {
            break
          }
          
          page++
        }

        // Update database with fresh repository data
        if (allRepos.length > 0) {
          // Clear existing repositories
          await supabase.from('github_repositories').delete().eq('user_id', user.id)

          // Filter and store active repositories
          const reposToStore = allRepos
            .filter(repo => !repo.archived && !repo.disabled)
            .map(repo => ({
              user_id: user.id,
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

          await supabase.from('github_repositories').insert(reposToStore)
          repositories = reposToStore
          
          console.log(`GitHub Status - Refreshed ${repositories.length} repositories`)
        }
      } catch (error) {
        console.error('GitHub Status - Failed to refresh repositories:', error)
        // Fall back to cached data
      }
    }

    // Get repositories from database if not refreshed
    if (repositories.length === 0) {
      const { data: dbRepos } = await supabase
        .from('github_repositories')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      repositories = dbRepos || []
    }

    // If specific repository analysis is requested
    let codebaseAnalysis = null
    if (analyzeRepo && repositories.length > 0) {
      const targetRepo = repositories.find(repo => 
        repo.full_name === analyzeRepo || repo.name === analyzeRepo
      )
      
      if (targetRepo) {
        console.log(`GitHub Status - Analyzing codebase for ${targetRepo.full_name}...`)
        
        try {
          const [owner, repo] = targetRepo.full_name.split('/')
          codebaseAnalysis = await github.analyzeCodebase(owner, repo, 50)
          
          console.log(`GitHub Status - Codebase analysis complete: ${codebaseAnalysis.totalFiles} files`)
        } catch (error) {
          console.error('GitHub Status - Codebase analysis failed:', error)
          codebaseAnalysis = { error: error instanceof Error ? error.message : 'Analysis failed' }
        }
      }
    }

    const response = {
      connected: true,
      user: {
        login: validation.user.login,
        id: validation.user.id,
        avatar_url: validation.user.avatar_url,
        name: validation.user.name,
        email: validation.user.email
      },
      rateLimit: validation.rateLimit,
      repositories: repositories.map(repo => ({
        id: repo.repo_id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner,
        private: repo.private,
        default_branch: repo.default_branch,
        url: repo.url,
        language: repo.language,
        size: repo.size,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        has_issues: repo.has_issues,
        permissions: repo.permissions,
        updated_at: repo.updated_at
      })),
      stats: {
        totalRepositories: repositories.length,
        privateRepos: repositories.filter(r => r.private).length,
        publicRepos: repositories.filter(r => !r.private).length,
        languages: repositories.reduce((acc, repo) => {
          if (repo.language) {
            acc[repo.language] = (acc[repo.language] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>),
        writableRepos: repositories.filter(r => 
          r.permissions.admin || r.permissions.maintain || r.permissions.push
        ).length
      },
      codebaseAnalysis,
      lastValidated: new Date().toISOString()
    }

    // Set cache headers for non-refresh requests
    const headers = new Headers()
    if (!refresh && !analyzeRepo) {
      headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600') // 5 minutes cache
    } else {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    }

    return NextResponse.json(response, { headers })

  } catch (error) {
    console.error('GitHub Status - Unexpected error:', error)
    return NextResponse.json({ 
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}