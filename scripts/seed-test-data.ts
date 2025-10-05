/**
 * Script to seed test suite data into the database
 * Run with: npx tsx scripts/seed-test-data.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const testSuites = [
  { suite_key: 'auth', label: 'API Integration - Auth', total_tests: 16, passing_tests: 12, failing_tests: 4, percentage: 75, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'memories', label: 'API Integration - Memories', total_tests: 14, passing_tests: 10, failing_tests: 4, percentage: 71, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'user', label: 'API Integration - User', total_tests: 15, passing_tests: 9, failing_tests: 6, percentage: 60, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'uploads', label: 'API Integration - Uploads', total_tests: 12, passing_tests: 7, failing_tests: 5, percentage: 58, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'waitlist', label: 'API Integration - Waitlist', total_tests: 14, passing_tests: 5, failing_tests: 9, percentage: 36, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'timezones', label: 'API Integration - Timezones', total_tests: 15, passing_tests: 14, failing_tests: 1, percentage: 93, status: 'almost', phase: 'Phase 2' },
  { suite_key: 'support', label: 'API Integration - Support Tickets', total_tests: 19, passing_tests: 10, failing_tests: 9, percentage: 53, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'admin', label: 'API Integration - Admin', total_tests: 15, passing_tests: 7, failing_tests: 8, percentage: 47, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'github', label: 'API Integration - GitHub OAuth', total_tests: 17, passing_tests: 9, failing_tests: 8, percentage: 53, status: 'failing', phase: 'Phase 2' },
  { suite_key: 'phototags', label: 'API Integration - Photo Tags', total_tests: 14, passing_tests: 9, failing_tests: 5, percentage: 64, status: 'almost', phase: 'Phase 2' },
];

const testDetails = {
  auth: {
    passing: [
      { name: 'Registration validation', description: 'Validates email format, password strength, required fields' },
      { name: 'Duplicate email prevention', description: 'Returns 409 for already registered emails' },
      { name: 'Login invalid credentials', description: 'Returns 401 for wrong password' },
      { name: 'Login missing credentials', description: 'Returns 400 when email/password missing' },
      { name: 'Password hashing', description: 'Securely hashes passwords with bcrypt' },
      { name: 'JWT token generation', description: 'Creates valid JWT tokens on successful login' },
      { name: 'Email normalization', description: 'Converts emails to lowercase' },
      { name: 'Session management', description: 'Creates user sessions properly' },
      { name: 'Error handling', description: 'Returns proper error messages' },
      { name: 'Input sanitization', description: 'Sanitizes user inputs' },
      { name: 'Rate limiting', description: 'Enforces rate limits on auth endpoints' },
      { name: 'Token expiration', description: 'JWT tokens expire correctly' },
    ],
    failing: [
      { name: 'User creation with valid data', description: 'Create new user account', issue: 'Mock returns undefined for new user ID' },
      { name: 'Login with correct credentials', description: 'Authenticate existing user', issue: 'Returns 401 instead of 200 - auth mock issue' },
      { name: 'Login email normalization', description: 'Accept uppercase emails', issue: 'Returns 401 - email case handling in mock' },
      { name: 'Timing attack prevention', description: 'Consistent response times', issue: 'Test assertion too strict for simulated delay' },
    ]
  },
  memories: {
    passing: [
      { name: 'Authentication required', description: 'Returns 401 without valid token' },
      { name: 'Create memory validation', description: 'Validates title, content, date fields' },
      { name: 'Invalid token handling', description: 'Rejects malformed JWT tokens' },
      { name: 'Delete own memory', description: 'Users can delete their own memories' },
      { name: 'Update own memory', description: 'Users can update their own memories' },
      { name: 'Access control', description: 'Prevents access to other users memories' },
      { name: 'Media attachment', description: 'Supports attaching images/videos' },
      { name: 'Tag filtering', description: 'Filter memories by tags' },
      { name: 'Date sorting', description: 'Sort memories by creation date' },
      { name: 'Pagination', description: 'Paginate large memory lists' },
    ],
    failing: [
      { name: 'Fetch user memories', description: 'Get all memories for authenticated user', issue: 'Returns 500 instead of 200 - Supabase mock chain broken' },
      { name: 'Database error handling', description: 'Handle DB connection errors', issue: 'Returns "Internal server error" instead of "Database error"' },
      { name: 'Public shared memory access', description: 'Allow access to shared memories', issue: 'Returns 500 - public access not mocked correctly' },
      { name: 'Return memory for owner', description: 'Fetch specific memory by ID', issue: 'Returns undefined memoryId - mock data structure issue' },
    ]
  },
  user: {
    passing: [
      { name: 'Authentication required', description: 'Returns 401 without token' },
      { name: 'Invalid token rejection', description: 'Rejects malformed tokens' },
      { name: 'Profile update validation', description: 'Validates profile fields' },
      { name: 'Privacy settings', description: 'Update user privacy preferences' },
      { name: 'Email verification', description: 'Verify email addresses' },
      { name: 'Avatar upload', description: 'Upload profile pictures' },
      { name: 'Account deletion', description: 'Delete user accounts' },
      { name: 'Password change', description: 'Update user passwords' },
      { name: 'Security events', description: 'Log security-related events' },
    ],
    failing: [
      { name: 'Fetch user profile', description: 'Get profile with valid token', issue: 'Returns 500 - Supabase mock not returning user data' },
      { name: 'Return basic info when no profile', description: 'Handle users without profiles', issue: 'Returns 500 - mock expects profile to exist' },
      { name: 'Premium status auth required', description: 'Check auth for premium status', issue: 'data.success is undefined - mock response missing field' },
      { name: 'Return premium status', description: 'Get user premium subscription', issue: 'data.success is undefined - mock missing success flag' },
      { name: 'Handle non-premium users', description: 'Return false for free users', issue: 'data.success is undefined - mock structure issue' },
      { name: 'Security - prevent access to others', description: 'Block access to other user profiles', issue: 'Returns 500 instead of 403/404 - error handling issue' },
    ]
  },
  uploads: {
    passing: [
      { name: 'Authentication required', description: 'Returns 401 without token' },
      { name: 'File type validation', description: 'Validates allowed file types' },
      { name: 'File size limits', description: 'Enforces max file size' },
      { name: 'Invalid token rejection', description: 'Rejects malformed tokens' },
      { name: 'Virus scanning', description: 'Scans uploads for malware' },
      { name: 'CDN integration', description: 'Uploads to CDN correctly' },
      { name: 'Thumbnail generation', description: 'Creates image thumbnails' },
    ],
    failing: [
      { name: 'Upload with valid file', description: 'Upload image/video file', issue: 'Mock FormData not parsing correctly' },
      { name: 'Return upload URL', description: 'Get public URL for uploaded file', issue: 'Supabase storage mock not returning URL' },
      { name: 'Handle upload errors', description: 'Return proper error messages', issue: 'Returns 500 - error handling in mock broken' },
      { name: 'Delete own file', description: 'Users can delete their uploads', issue: 'Mock not filtering by user' },
      { name: 'Prevent deleting others files', description: 'Block access to other users files', issue: 'Returns 500 instead of 403' },
    ]
  },
  waitlist: {
    passing: [
      { name: 'Email validation', description: 'Validates email format' },
      { name: 'Duplicate prevention', description: 'Prevents duplicate waitlist entries' },
      { name: 'Name validation', description: 'Validates name fields' },
      { name: 'Referral code tracking', description: 'Tracks referral sources' },
      { name: 'Confirmation email', description: 'Sends confirmation emails' },
    ],
    failing: [
      { name: 'Join waitlist with valid email', description: 'Add user to waitlist', issue: 'Supabase client mock not initialized in beforeEach' },
      { name: 'Return waitlist position', description: 'Get position in queue', issue: 'Mock returning undefined for position' },
      { name: 'Handle invalid email', description: 'Reject malformed emails', issue: 'Returns 500 instead of 400 - validation issue' },
      { name: 'Check waitlist status', description: 'Get status for email', issue: 'Mock not returning status data' },
      { name: 'Move to active users', description: 'Promote from waitlist', issue: 'Mock not updating status' },
      { name: 'Priority queue handling', description: 'Handle VIP/priority members', issue: 'Priority field not in mock' },
      { name: 'Email notifications', description: 'Send status update emails', issue: 'Email service mock not called' },
      { name: 'Analytics tracking', description: 'Track waitlist metrics', issue: 'Analytics mock not implemented' },
      { name: 'Bulk operations', description: 'Handle batch updates', issue: 'Batch mock not working' },
    ]
  },
  timezones: {
    passing: [
      { name: 'Authentication required', description: 'Returns 401 without token' },
      { name: 'Create timezone validation', description: 'Validates timezone fields' },
      { name: 'List user timezones', description: 'Get all timezones for user' },
      { name: 'Update timezone', description: 'Modify timezone details' },
      { name: 'Delete timezone', description: 'Remove timezone' },
      { name: 'Add timezone members', description: 'Share timezone with others' },
      { name: 'Remove timezone members', description: 'Revoke access' },
      { name: 'Timezone types', description: 'Support private/shared/public types' },
      { name: 'Member roles', description: 'Support owner/admin/member roles' },
      { name: 'Access control', description: 'Enforce permission checks' },
      { name: 'Invite codes', description: 'Generate invite codes' },
      { name: 'Timezone settings', description: 'Store user preferences' },
      { name: 'Notification settings', description: 'Configure notifications' },
      { name: 'Timezone search', description: 'Search/filter timezones' },
    ],
    failing: [
      { name: 'Handle duplicate members', description: 'Prevent adding same member twice', issue: 'Returns 500 instead of 409 - unique constraint not in mock' },
    ]
  },
  support: {
    passing: [
      { name: 'Authentication required', description: 'Returns 401 without token' },
      { name: 'Create ticket validation', description: 'Validates ticket fields' },
      { name: 'Priority validation', description: 'Validates priority levels' },
      { name: 'Category validation', description: 'Validates ticket categories' },
      { name: 'List user tickets', description: 'Get tickets for user' },
      { name: 'Ticket search', description: 'Search tickets by keywords' },
      { name: 'Status filtering', description: 'Filter by ticket status' },
      { name: 'Email notifications', description: 'Send ticket updates via email' },
      { name: 'File attachments', description: 'Support ticket attachments' },
      { name: 'Auto-assignment', description: 'Auto-assign to support staff' },
    ],
    failing: [
      { name: 'Create support ticket', description: 'Create new ticket', issue: 'Mock not returning ticket ID' },
      { name: 'Return ticket ID', description: 'Get created ticket details', issue: 'insertMock not returning data correctly' },
      { name: 'Update ticket status', description: 'Change ticket status', issue: 'Mock not updating status field' },
      { name: 'Add ticket comment', description: 'Add comments to ticket', issue: 'Comment mock not implemented' },
      { name: 'Get ticket by ID', description: 'Fetch specific ticket', issue: 'Returns undefined - single() mock broken' },
      { name: 'Admin access all tickets', description: 'Admins can see all tickets', issue: 'Admin check not in mock' },
      { name: 'User access own tickets', description: 'Users only see their tickets', issue: 'Filter by user not working' },
      { name: 'Close ticket', description: 'Mark ticket as closed', issue: 'Status update mock not working' },
      { name: 'Reopen ticket', description: 'Reopen closed ticket', issue: 'Status transition not mocked' },
    ]
  },
  admin: {
    passing: [
      { name: 'Admin authentication required', description: 'Returns 401 without admin token' },
      { name: 'Regular user blocked', description: 'Non-admins get 403' },
      { name: 'List all users', description: 'Get paginated user list' },
      { name: 'User search', description: 'Search users by email/name' },
      { name: 'Ban user', description: 'Ban/suspend user accounts' },
      { name: 'Unban user', description: 'Restore banned accounts' },
      { name: 'Activity logs', description: 'Track admin actions' },
    ],
    failing: [
      { name: 'Update user premium status', description: 'Grant/revoke premium access', issue: 'Mock not updating is_premium field' },
      { name: 'Return success flag', description: 'Confirm premium status update', issue: 'success flag not in mock response' },
      { name: 'Verify premium status change', description: 'Check premium was applied', issue: 'Mock not persisting changes' },
      { name: 'Get user statistics', description: 'Get user count/metrics', issue: 'Statistics mock not implemented' },
      { name: 'Delete user account', description: 'Permanently delete user', issue: 'Delete cascade not in mock' },
      { name: 'Impersonate user', description: 'Login as user for support', issue: 'Impersonation mock not implemented' },
      { name: 'Bulk user operations', description: 'Handle batch updates', issue: 'Batch operations not mocked' },
      { name: 'Export user data', description: 'GDPR data export', issue: 'Export function not implemented' },
    ]
  },
  github: {
    passing: [
      { name: 'OAuth redirect', description: 'Redirect to GitHub OAuth' },
      { name: 'State parameter validation', description: 'Validates CSRF state token' },
      { name: 'Missing code handling', description: 'Returns error for missing code' },
      { name: 'Token exchange error', description: 'Handles failed token exchange' },
      { name: 'User creation', description: 'Creates user from GitHub data' },
      { name: 'Scope validation', description: 'Validates OAuth scopes' },
      { name: 'Email requirement', description: 'Requires email from GitHub' },
      { name: 'Link existing account', description: 'Links GitHub to existing user' },
      { name: 'Security logging', description: 'Logs OAuth events' },
    ],
    failing: [
      { name: 'OAuth callback success', description: 'Handle GitHub OAuth callback', issue: 'fetch mock not returning access_token' },
      { name: 'Exchange code for token', description: 'Exchange auth code for access token', issue: 'Token exchange mock not properly configured' },
      { name: 'Fetch GitHub user', description: 'Get user info from GitHub API', issue: 'User fetch mock returning undefined' },
      { name: 'Fetch GitHub repos', description: 'Get user repositories', issue: 'Repos fetch mock not implemented' },
      { name: 'Store access token', description: 'Save GitHub token for future use', issue: 'Token storage mock not persisting' },
      { name: 'Invalid state rejection', description: 'Reject mismatched state', issue: 'Returns 500 instead of 400' },
      { name: 'Rate limiting', description: 'Handle GitHub API rate limits', issue: 'Rate limit mock not implemented' },
      { name: 'Token refresh', description: 'Refresh expired tokens', issue: 'Refresh logic not mocked' },
    ]
  },
  phototags: {
    passing: [
      { name: 'Authentication required', description: 'Returns 401 without token' },
      { name: 'Tag validation', description: 'Validates tag format' },
      { name: 'List photo tags', description: 'Get all tags for photo' },
      { name: 'Search tags', description: 'Search photos by tags' },
      { name: 'Tag suggestions', description: 'Suggest related tags' },
      { name: 'Tag privacy', description: 'Respect photo privacy settings' },
      { name: 'Bulk tagging', description: 'Tag multiple photos at once' },
      { name: 'Tag hierarchy', description: 'Support parent/child tags' },
      { name: 'Auto-tagging', description: 'AI-powered tag suggestions' },
    ],
    failing: [
      { name: 'Create photo tag', description: 'Add tag to photo', issue: 'Mock not returning tag ID' },
      { name: 'Return tag ID', description: 'Get created tag details', issue: 'insertMock returning undefined' },
      { name: 'Delete photo tag', description: 'Remove tag from photo', issue: 'Delete mock not confirming deletion' },
      { name: 'Update tag', description: 'Modify tag details', issue: 'Update mock not working' },
      { name: 'Delete only own tags', description: 'Users can only delete their tags', issue: 'Mock not filtering by user' },
    ]
  },
};

async function seed() {
  console.log('🌱 Seeding test suites...');
  
  // Clear existing data
  await supabase.from('test_details').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('test_suites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Insert test suites
  const { error: suitesError } = await supabase.from('test_suites').insert(testSuites);
  if (suitesError) {
    console.error('Error inserting test suites:', suitesError);
    return;
  }
  console.log(`✅ Inserted ${testSuites.length} test suites`);
  
  // Insert test details
  let totalDetails = 0;
  for (const [suiteKey, tests] of Object.entries(testDetails)) {
    const details = [
      ...tests.passing.map(t => ({ suite_key: suiteKey, status: 'passing', test_name: t.name, description: t.description, issue: null })),
      ...tests.failing.map(t => ({ suite_key: suiteKey, status: 'failing', test_name: t.name, description: t.description, issue: t.issue })),
    ];
    
    const { error } = await supabase.from('test_details').insert(details);
    if (error) {
      console.error(`Error inserting details for ${suiteKey}:`, error);
    } else {
      totalDetails += details.length;
      console.log(`✅ Inserted ${details.length} tests for ${suiteKey}`);
    }
  }
  
  console.log(`\n🎉 Seed complete! ${testSuites.length} suites, ${totalDetails} test details`);
}

seed().catch(console.error);
