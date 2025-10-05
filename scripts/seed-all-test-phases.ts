import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedAllTestPhases() {
  console.log('🌱 Seeding all test phases to database...\n');

  const testSuites = [
    // Phase 3: Component Tests
    { suite_key: 'component_auth', label: 'Component - Auth Forms', phase: 'Phase 3', total_tests: 15, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'component_memories', label: 'Component - Memory Cards', phase: 'Phase 3', total_tests: 20, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'component_timeline', label: 'Component - Timeline View', phase: 'Phase 3', total_tests: 18, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'component_admin', label: 'Component - Admin Dashboard', phase: 'Phase 3', total_tests: 15, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'component_modals', label: 'Component - Modals & Dialogs', phase: 'Phase 3', total_tests: 12, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'component_forms', label: 'Component - Form Validation', phase: 'Phase 3', total_tests: 20, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },

    // Phase 4: E2E Tests
    { suite_key: 'e2e_auth_flow', label: 'E2E - Authentication Flow', phase: 'Phase 4', total_tests: 15, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'e2e_memory_crud', label: 'E2E - Memory CRUD Operations', phase: 'Phase 4', total_tests: 20, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'e2e_collaboration', label: 'E2E - Memory Collaboration', phase: 'Phase 4', total_tests: 18, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'e2e_admin', label: 'E2E - Admin Operations', phase: 'Phase 4', total_tests: 12, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'e2e_support', label: 'E2E - Support Tickets', phase: 'Phase 4', total_tests: 15, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'e2e_mobile', label: 'E2E - Mobile Responsive', phase: 'Phase 4', total_tests: 20, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },

    // Phase 5: Security Tests
    { suite_key: 'security_auth', label: 'Security - Authentication', phase: 'Phase 5', total_tests: 12, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'security_xss', label: 'Security - XSS Prevention', phase: 'Phase 5', total_tests: 10, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'security_csrf', label: 'Security - CSRF Protection', phase: 'Phase 5', total_tests: 8, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'security_injection', label: 'Security - SQL/NoSQL Injection', phase: 'Phase 5', total_tests: 10, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'security_permissions', label: 'Security - Access Control', phase: 'Phase 5', total_tests: 10, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },

    // Phase 6: Performance Tests
    { suite_key: 'perf_api', label: 'Performance - API Response Times', phase: 'Phase 6', total_tests: 15, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'perf_load', label: 'Performance - Load Testing', phase: 'Phase 6', total_tests: 10, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'perf_database', label: 'Performance - Database Queries', phase: 'Phase 6', total_tests: 12, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'perf_frontend', label: 'Performance - Frontend Metrics', phase: 'Phase 6', total_tests: 13, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },

    // Phase 7: Accessibility Tests
    { suite_key: 'a11y_wcag', label: 'A11y - WCAG Compliance', phase: 'Phase 7', total_tests: 20, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'a11y_keyboard', label: 'A11y - Keyboard Navigation', phase: 'Phase 7', total_tests: 15, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
    { suite_key: 'a11y_screen_reader', label: 'A11y - Screen Reader Support', phase: 'Phase 7', total_tests: 15, passing_tests: 0, failing_tests: 0, percentage: 0, status: 'pending' },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const suite of testSuites) {
    const { error } = await supabase
      .from('test_suites')
      .upsert(suite, { onConflict: 'suite_key' });

    if (error) {
      console.error(`❌ Error inserting ${suite.suite_key}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ ${suite.phase}: ${suite.label}`);
      successCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully added: ${successCount} test suites`);
  console.log(`❌ Errors: ${errorCount}`);
  
  console.log('\n📈 Test Phases:');
  console.log('Phase 3: Component Tests - 100 tests');
  console.log('Phase 4: E2E Tests - 100 tests');
  console.log('Phase 5: Security Tests - 50 tests');
  console.log('Phase 6: Performance Tests - 50 tests');
  console.log('Phase 7: Accessibility Tests - 50 tests');
  console.log('\nTotal: 350 additional tests planned');
}

seedAllTestPhases();
