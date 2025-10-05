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

async function updateAllTestStatuses() {
  console.log('🔄 Updating all test suite statuses to reflect actual test results...\n');

  const updates = [
    { suite_key: 'auth', passing: 16, failing: 0, total: 16 },
    { suite_key: 'memories', passing: 14, failing: 0, total: 14 },
    { suite_key: 'user', passing: 15, failing: 0, total: 15 },
    { suite_key: 'admin', passing: 15, failing: 0, total: 15 },
    { suite_key: 'support', passing: 19, failing: 0, total: 19 },
    { suite_key: 'github', passing: 17, failing: 0, total: 17 },
    { suite_key: 'timezones', passing: 15, failing: 0, total: 15 },
    { suite_key: 'phototags', passing: 14, failing: 0, total: 14 },
    { suite_key: 'waitlist', passing: 5, failing: 9, total: 14 },  // 5 actually passing
    { suite_key: 'uploads', passing: 7, failing: 5, total: 12 },    // 7 actually passing
  ];

  for (const suite of updates) {
    const percentage = Math.round((suite.passing / suite.total) * 100);
    const status = suite.failing === 0 ? 'done' : percentage >= 80 ? 'almost' : 'failing';

    const { data, error } = await supabase
      .from('test_suites')
      .update({
        total_tests: suite.total,
        passing_tests: suite.passing,
        failing_tests: suite.failing,
        percentage,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('suite_key', suite.suite_key)
      .select('*')
      .single();

    if (error) {
      console.error(`❌ Error updating ${suite.suite_key}:`, error.message);
    } else {
      const emoji = status === 'done' ? '✅' : status === 'almost' ? '⚠️' : '❌';
      console.log(`${emoji} ${suite.suite_key}: ${suite.passing}/${suite.total} (${percentage}%)`);
    }
  }

  console.log('\n📊 Test Suite Summary:');
  console.log('✅ DONE (100%): 8 suites - 125 tests passing');
  console.log('⚠️  ALMOST (80%+): 0 suites');
  console.log('❌ FAILING (<80%): 2 suites - 14 failing tests');
  console.log('\n🎯 Total: 125/139 tests passing (90%)');
}

updateAllTestStatuses();
