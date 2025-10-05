import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

async function updateSupportTests() {
  console.log('🔄 Updating Support Tickets test suite status...');

  // First, check what suites exist
  const { data: allSuites } = await supabase
    .from('test_suites')
    .select('suite_key')
    .ilike('suite_key', '%support%');
  
  console.log('Found suites with "support":', allSuites);

  // Try common variations
  const possibleKeys = ['support_tickets', 'support-tickets', 'tickets', 'support'];
  
  for (const key of possibleKeys) {
    const { data: suiteData, error: suiteError } = await supabase
      .from('test_suites')
      .update({
        passing_tests: 10,
        failing_tests: 9,
        percentage: 53,
        status: 'almost',
        updated_at: new Date().toISOString(),
      })
      .eq('suite_key', key)
      .select('*')
      .single();

    if (!suiteError && suiteData) {
      console.log(`✅ Updated ${key} test suite to 10/19 passing (53%)`);
      console.log('\n📊 Support Tickets Test Suite Status:');
      console.log(`   Total Tests: ${suiteData.total_tests}`);
      console.log(`   Passing: ${suiteData.passing_tests}`);
      console.log(`   Failing: ${suiteData.failing_tests}`);
      console.log(`   Percentage: ${suiteData.percentage}%`);
      console.log(`   Status: ${suiteData.status}`);
      console.log('\n🎯 10 tests passing - progress made but 9 still need module-level mocking fixes!');
      return;
    }
  }

  console.error('❌ Could not find Support Tickets test suite with any key variation');
}

updateSupportTests();
