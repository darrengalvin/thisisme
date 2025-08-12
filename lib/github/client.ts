import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

export class GitHubClient {
  private octokit: Octokit

  constructor(token?: string) {
    if (token) {
      // User token from OAuth
      this.octokit = new Octokit({ auth: token })
    } else if (process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) {
      // GitHub App authentication
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: process.env.GITHUB_APP_ID,
          privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
          installationId: process.env.GITHUB_APP_INSTALLATION_ID
        }
      })
    } else {
      throw new Error('No GitHub authentication configured')
    }
  }

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.repos.get({ owner, repo })
    return data
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string) {
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
          path: data.path
        }
      }
      return null
    } catch (error) {
      console.error(`Error fetching file ${path}:`, error)
      return null
    }
  }

  async createBranch(owner: string, repo: string, branchName: string, baseBranch: string = 'main') {
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

    return branchName
  }

  async updateFile(
    owner: string, 
    repo: string, 
    path: string, 
    content: string, 
    message: string,
    branch: string,
    sha: string
  ) {
    const { data } = await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
      branch
    })

    return data
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ) {
    const { data } = await this.octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base
    })

    return data
  }

  async getIssue(owner: string, repo: string, issueNumber: number) {
    const { data } = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    })
    return data
  }

  async searchCode(owner: string, repo: string, query: string) {
    const { data } = await this.octokit.search.code({
      q: `${query} repo:${owner}/${repo}`,
      per_page: 10
    })
    return data.items
  }

  async analyzePullRequest(owner: string, repo: string, pullNumber: number) {
    const [pr, files, reviews, checks] = await Promise.all([
      this.octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
      this.octokit.pulls.listFiles({ owner, repo, pull_number: pullNumber }),
      this.octokit.pulls.listReviews({ owner, repo, pull_number: pullNumber }),
      this.octokit.checks.listForRef({ owner, repo, ref: `pull/${pullNumber}/head` })
    ])

    return {
      pr: pr.data,
      files: files.data,
      reviews: reviews.data,
      checks: checks.data
    }
  }
}