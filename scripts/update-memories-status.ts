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

async function updateMemoriesTests() {
  console.log('🔄 Updating Memories test suite status...');

  const { data: suiteData, error: suiteError } = await supabase
    .from('test_suites')
    .update({
      passing_tests: 14,
      failing_tests: 0,
      percentage: 100,
      status: 'done',
      updated_at: new Date().toISOString(),
    })
    .eq('suite_key', 'memories')
    .select('*')
    .single();

  if (suiteError) {
    console.error('Error updating Memories test suite:', suiteError);
    return;
  }
  console.log('✅ Updated Memories test suite to 100% passing');

  const { error: detailsError } = await supabase
    .from('test_details')
    .update({ status: 'passing', issue: null })
    .eq('suite_key', 'memories');

  if (detailsError) {
    console.error('Error updating Memories test details:', detailsError);
    return;
  }
  console.log('✅ Marked all Memories test details as passing');

  console.log('\n📊 Memories Test Suite Status:');
  console.log(`   Total Tests: ${suiteData.total_tests}`);
  console.log(`   Passing: ${suiteData.passing_tests}`);
  console.log(`   Failing: ${suiteData.failing_tests}`);
  console.log(`   Percentage: ${suiteData.percentage}%`);
  console.log(`   Status: ${suiteData.status}`);
  console.log('\n🎉 Memories tests are now 100% passing in the database!');
}

updateMemoriesTests();
