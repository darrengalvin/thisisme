import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

export interface GitHubFile {
  content: string
  sha: string
  path: string
  size: number
  encoding: string
  url: string
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  owner: string
  default_branch: string
  private: boolean
  archived: boolean
  disabled: boolean
  permissions: {
    admin: boolean
    maintain: boolean
    push: boolean
    triage: boolean
    pull: boolean
  }
}

export interface CodebaseStructure {
  files: Array<{
    path: string
    type: 'file' | 'dir'
    size: number
    language?: string
  }>
  languages: Record<string, number>
  totalFiles: number
  totalSize: number
}

export class GitHubClient {
  private octokit: Octokit
  private readonly maxRetries = 3
  private readonly retryDelay = 1000

  constructor(token?: string) {
    if (token) {
      // User token from OAuth
      this.octokit = new Octokit({ 
        auth: token,
        userAgent: 'AI-Support-System/1.0',
        baseUrl: 'https://api.github.com',
        log: {
          debug: () => {},
          info: () => {},
          warn: console.warn,
          error: console.error,
        }
      })
    } else if (process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) {
      // GitHub App authentication
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: process.env.GITHUB_APP_ID,
          privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
          installationId: process.env.GITHUB_APP_INSTALLATION_ID
        },
        userAgent: 'AI-Support-System/1.0'
      })
    } else {
      throw new Error('No GitHub authentication configured')
    }
  }

  private async retry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt === this.maxRetries) {
          throw new Error(`${context} failed after ${this.maxRetries} attempts: ${lastError.message}`)
        }
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1)
        console.warn(`${context} attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }

  async validateConnection(): Promise<{ valid: boolean; user?: any; rateLimit?: any; error?: string }> {
    try {
      const [userResponse, rateLimitResponse] = await Promise.all([
        this.octokit.users.getAuthenticated(),
        this.octokit.rateLimit.get()
      ])

      return {
        valid: true,
        user: userResponse.data,
        rateLimit: rateLimitResponse.data.rate
      }
    } catch (error) {
      console.error('GitHub connection validation failed:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return this.retry(async () => {
      const { data } = await this.octokit.repos.get({ owner, repo })
      return {
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        owner: data.owner.login,
        default_branch: data.default_branch,
        private: data.private,
        archived: data.archived,
        disabled: data.disabled,
        permissions: {
          admin: data.permissions?.admin || false,
          maintain: data.permissions?.maintain || false,
          push: data.permissions?.push || false,
          triage: data.permissions?.triage || false,
          pull: data.permissions?.pull || false
        }
      }
    }, `Get repository ${owner}/${repo}`)
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFile | null> {
    return this.retry(async () => {
      try {
        const { data } = await this.octokit.repos.getContent({
          owner,
          repo,
          path,
          ref
        })
        
        if ('content' in data && data.type === 'file') {
          return {
            content: Buffer.from(data.content, 'base64').toString('utf-8'),
            sha: data.sha,
            path: data.path,
            size: data.size,
            encoding: data.encoding,
            url: data.url
          }
        }
        return null
      } catch (error: any) {
        if (error.status === 404) {
          return null // File not found
        }
        throw error
      }
    }, `Get file content ${owner}/${repo}:${path}`)
  }

  async getDirectoryContents(owner: string, repo: string, path: string = '', ref?: string): Promise<Array<{
    name: string
    path: string
    type: 'file' | 'dir'
    size: number
    sha: string
  }>> {
    return this.retry(async () => {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref
      })
      
      if (Array.isArray(data)) {
        return data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type as 'file' | 'dir',
          size: item.size || 0,
          sha: item.sha
        }))
      }
      
      return []
    }, `Get directory contents ${owner}/${repo}:${path}`)
  }

  async analyzeCodebase(owner: string, repo: string, maxFiles: number = 100): Promise<CodebaseStructure> {
    console.log(`Analyzing codebase structure for ${owner}/${repo}...`)
    
    const files: Array<{ path: string; type: 'file' | 'dir'; size: number; language?: string }> = []
    const languages: Record<string, number> = {}
    let totalSize = 0
    let fileCount = 0

    const analyzeDirectory = async (path: string = '', depth: number = 0): Promise<void> => {
      if (depth > 10 || fileCount >= maxFiles) return // Prevent infinite recursion and limit files

      try {
        const contents = await this.getDirectoryContents(owner, repo, path)
        
        for (const item of contents) {
          if (fileCount >= maxFiles) break

          // Skip common non-source directories
          if (item.type === 'dir' && this.shouldSkipDirectory(item.name)) {
            continue
          }

          files.push({
            path: item.path,
            type: item.type,
            size: item.size,
            language: item.type === 'file' ? this.detectLanguage(item.path) : undefined
          })

          if (item.type === 'file') {
            fileCount++
            totalSize += item.size
            
            const language = this.detectLanguage(item.path)
            if (language) {
              languages[language] = (languages[language] || 0) + item.size
            }
          } else if (item.type === 'dir' && depth < 8) {
            await analyzeDirectory(item.path, depth + 1)
          }
        }
      } catch (error) {
        console.warn(`Failed to analyze directory ${path}:`, error)
      }
    }

    await analyzeDirectory()

    console.log(`Codebase analysis complete: ${fileCount} files, ${Object.keys(languages).length} languages`)

    return {
      files,
      languages,
      totalFiles: fileCount,
      totalSize
    }
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = [
      'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
      '.vercel', '.netlify', 'tmp', 'temp', 'cache', '.cache',
      'vendor', 'target', 'out', 'bin', 'obj', '.vscode', '.idea'
    ]
    return skipDirs.includes(name) || name.startsWith('.')
  }

  private detectLanguage(filePath: string): string | undefined {
    const ext = filePath.split('.').pop()?.toLowerCase()
    
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'sql': 'SQL',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'SASS',
      'html': 'HTML',
      'xml': 'XML',
      'json': 'JSON',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
      'sh': 'Shell',
      'bash': 'Shell',
      'zsh': 'Shell'
    }

    return ext ? languageMap[ext] : undefined
  }

  async searchCode(owner: string, repo: string, query: string, language?: string): Promise<Array<{
    name: string
    path: string
    sha: string
    url: string
    score: number
    text_matches?: Array<{
      object_url?: string
      object_type?: string | null
      property?: string
      fragment?: string
      matches?: Array<{ text?: string; indices?: number[] }>
    }>
  }>> {
    return this.retry(async () => {
      let searchQuery = `${query} repo:${owner}/${repo}`
      if (language) {
        searchQuery += ` language:${language}`
      }

      const { data } = await this.octokit.search.code({
        q: searchQuery,
        per_page: 30
      })

      return data.items.map(item => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        url: item.url,
        score: item.score,
        text_matches: item.text_matches
      }))
    }, `Search code in ${owner}/${repo}`)
  }

  async createBranch(owner: string, repo: string, branchName: string, baseBranch?: string): Promise<string> {
    return this.retry(async () => {
      // Auto-detect base branch if not provided
      if (!baseBranch) {
        const repoInfo = await this.getRepository(owner, repo)
        baseBranch = repoInfo.default_branch
      }

      // Check if branch already exists
      try {
        await this.octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branchName}`
        })
        throw new Error(`Branch ${branchName} already exists`)
      } catch (error: any) {
        if (error.status !== 404) {
          throw error
        }
        // Branch doesn't exist, which is what we want
      }

      // Get the SHA of the base branch
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`
      })

      // Create new branch
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha
      })

      console.log(`Created branch ${branchName} from ${baseBranch}`)
      return branchName
    }, `Create branch ${branchName}`)
  }

  async updateFile(
    owner: string, 
    repo: string, 
    path: string, 
    content: string, 
    message: string,
    branch: string,
    sha?: string
  ): Promise<{ sha: string; commit: any }> {
    return this.retry(async () => {
      // Get current file SHA if not provided
      if (!sha) {
        const currentFile = await this.getFileContent(owner, repo, path, branch)
        sha = currentFile?.sha
      }

      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch
      })

      return {
        sha: data.content?.sha || '',
        commit: data.commit
      }
    }, `Update file ${path}`)
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base?: string
  ): Promise<{ number: number; html_url: string; url: string }> {
    return this.retry(async () => {
      // Auto-detect base branch if not provided
      if (!base) {
        const repoInfo = await this.getRepository(owner, repo)
        base = repoInfo.default_branch
      }

      const { data } = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base
      })

      return {
        number: data.number,
        html_url: data.html_url,
        url: data.url
      }
    }, `Create pull request ${title}`)
  }

  async getIssue(owner: string, repo: string, issueNumber: number) {
    return this.retry(async () => {
      const { data } = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      })
      return data
    }, `Get issue #${issueNumber}`)
  }

  async analyzePullRequest(owner: string, repo: string, pullNumber: number) {
    return this.retry(async () => {
      const [pr, files, reviews, checks] = await Promise.all([
        this.octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
        this.octokit.pulls.listFiles({ owner, repo, pull_number: pullNumber }),
        this.octokit.pulls.listReviews({ owner, repo, pull_number: pullNumber }),
        this.octokit.checks.listForRef({ owner, repo, ref: `pull/${pullNumber}/head` }).catch(() => ({ data: { check_runs: [] } }))
      ])

      return {
        pr: pr.data,
        files: files.data,
        reviews: reviews.data,
        checks: checks.data
      }
    }, `Analyze pull request #${pullNumber}`)
  }

  async verifyRepositoryAccess(owner: string, repo: string): Promise<{
    canRead: boolean
    canWrite: boolean
    canAdmin: boolean
    error?: string
  }> {
    try {
      const repoData = await this.getRepository(owner, repo)
      
      return {
        canRead: true,
        canWrite: repoData.permissions.push || repoData.permissions.maintain || repoData.permissions.admin,
        canAdmin: repoData.permissions.admin,
      }
    } catch (error) {
      return {
        canRead: false,
        canWrite: false,
        canAdmin: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}