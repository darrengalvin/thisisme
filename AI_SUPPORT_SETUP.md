# 🤖 AI-Powered Self-Healing Support System Setup

This guide will help you set up the revolutionary AI Support System that uses Claude AI to automatically analyze and fix bugs in your codebase.

## 🚀 Features

- **Intelligent Code Analysis**: Claude AI examines your code to understand issues
- **Automated Fix Generation**: Creates precise code changes to solve problems
- **GitHub Integration**: Direct repository access and PR creation
- **Safety First**: All changes require review before merging
- **Superior to GPT**: Uses Claude 3.5 Sonnet for better code understanding

## 📋 Prerequisites

1. **Anthropic Claude API Key** (Required)
2. **GitHub Account** with repository access
3. **Supabase Project** (already configured)
4. **Node.js 18+** and npm/yarn

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install @anthropic-ai/sdk @octokit/rest @octokit/auth-app
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.ai.example .env.local
```

2. Add these variables to your `.env.local`:

```env
# Anthropic Claude API (Required)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# GitHub OAuth App
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Your app URL
NEXT_PUBLIC_URL=https://thisisme-three.vercel.app
```

### Step 3: Create GitHub OAuth App

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: AI Support System
   - **Homepage URL**: https://thisisme-three.vercel.app
   - **Authorization callback URL**: https://thisisme-three.vercel.app/api/github/callback
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add them to your `.env.local`

### Step 4: Get Anthropic API Key

1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Go to [API Keys](https://console.anthropic.com/settings/keys)
3. Create a new API key
4. Add it to your `.env.local` as `ANTHROPIC_API_KEY`

### Step 5: Run Database Migrations

Execute this SQL in your Supabase SQL editor:

```sql
-- Run the migration file
-- Copy contents from: supabase/migrations/005_github_ai_system.sql
```

### Step 6: Deploy to Vercel

1. Push your changes to GitHub
2. In Vercel dashboard, add the environment variables:
   - `ANTHROPIC_API_KEY`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `NEXT_PUBLIC_URL`

### Step 7: Test the System

1. Visit: https://thisisme-three.vercel.app/admin/ai-support
2. Click "Connect GitHub" to authorize repository access
3. Select a support ticket
4. Click "Analyze with AI" to see Claude's analysis
5. Click "Create Fix Pull Request" to generate a PR

## 🎯 How It Works

### For Your Chronological Bug Example:

1. **Ticket Analysis**:
   - AI reads your ticket about chronological sorting
   - Searches your repository for timeline-related code
   - Identifies `ChronologicalTimelineView.tsx` and `TimelineView.tsx`

2. **Code Understanding**:
   - Claude analyzes the current implementation
   - Identifies missing sort logic
   - Determines exact fix needed

3. **Fix Generation**:
   - Creates a new branch: `ai-fix/[ticket-id]-[timestamp]`
   - Applies the fix: `.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))`
   - Opens a PR with detailed explanation

4. **Review & Merge**:
   - You review the PR on GitHub
   - Run tests to verify the fix
   - Merge when satisfied

## 🛡️ Security & Safety

- **Read-Only by Default**: AI only suggests changes, never auto-merges
- **Scoped Permissions**: Only accesses repositories you authorize
- **API Key Security**: Keys are encrypted and never exposed to client
- **Audit Trail**: All AI actions are logged in database
- **Rollback Support**: Database tracks changes for easy reversal

## 📊 API Endpoints

- `GET /api/github/auth?action=connect` - Start GitHub OAuth flow
- `GET /api/github/callback` - OAuth callback handler
- `GET /api/github/status` - Check connection status
- `POST /api/ai/analyze-issue` - Analyze a support ticket
- `POST /api/ai/create-fix-pr` - Generate fix and create PR
- `GET /api/ai/analyses` - List all analyses and fixes

## 🔍 Troubleshooting

### GitHub Connection Issues
- Ensure OAuth callback URL matches exactly
- Check GitHub app permissions include `repo` scope
- Verify environment variables are set correctly

### Claude API Issues
- Verify API key is active and has credits
- Check rate limits (default: 40,000 tokens/min)
- Ensure you're using the correct model: `claude-3-5-sonnet-20241022`

### Pull Request Creation Fails
- Verify GitHub token has `repo` and `workflow` permissions
- Check if default branch protection rules allow PR creation
- Ensure repository exists and is accessible

## 📈 Advanced Features

### Custom Analysis Patterns
Edit `lib/ai/claude-client.ts` to customize:
- Analysis prompts
- Code style preferences
- Risk assessment criteria
- Testing requirements

### Webhook Integration
Add GitHub webhooks to:
- Auto-analyze new issues
- Update ticket status on PR merge
- Notify team of AI-generated fixes

## 🚀 Next Steps

1. **Monitor Performance**: Track fix success rate in dashboard
2. **Train Patterns**: Add common issue templates
3. **Expand Coverage**: Add more file types and languages
4. **Integrate CI/CD**: Auto-run tests on AI PRs

## 📝 License & Support

This system is built for your internal use. For issues or questions:
- Check logs in Vercel dashboard
- Review Supabase logs for database issues
- Contact Anthropic support for API issues

---

**Built with ❤️ using Claude AI and Next.js**