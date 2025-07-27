// Debug script to test plan fetch functionality
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPlanFetch() {
  console.log('=== DEBUGGING PLAN FETCH ===\n');

  try {
    // 1. Check if verified_profiles table exists and has data
    console.log('1. Checking verified_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('verified_profiles')
      .select('id, email, subscription_plan, subscription_plan_id')
      .limit(5);

    if (profilesError) {
      console.error('Error fetching verified_profiles:', profilesError);
      return;
    }

    console.log('Verified profiles found:', profiles);
    console.log('');

    // 2. Check if subscription_plans table exists and has data
    console.log('2. Checking subscription_plans table...');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*');

    if (plansError) {
      console.error('Error fetching subscription_plans:', plansError);
      return;
    }

    console.log('Subscription plans found:', plans);
    console.log('');

    // 3. Test the JOIN query that's failing
    console.log('3. Testing JOIN query...');
    if (profiles && profiles.length > 0) {
      const testUserId = profiles[0].id;
      console.log('Testing with user ID:', testUserId);
      
      const { data: joinedData, error: joinError } = await supabase
        .from('verified_profiles')
        .select(`
          id,
          email,
          subscription_plan,
          subscription_plan_id,
          subscription_plans (
            name,
            streaming_minutes_limit,
            price_usd,
            features
          )
        `)
        .eq('id', testUserId)
        .single();

      if (joinError) {
        console.error('JOIN query error:', joinError);
        console.log('This suggests the foreign key relationship might not be set up correctly');
      } else {
        console.log('JOIN query successful:', joinedData);
        console.log('Subscription plan details:', joinedData?.subscription_plans);
      }
    }

    // 4. Check foreign key relationship
    console.log('\n4. Checking foreign key relationship...');
    const { data: fkCheck, error: fkError } = await supabase
      .from('verified_profiles')
      .select('subscription_plan_id')
      .not('subscription_plan_id', 'is', null)
      .limit(5);

    if (fkError) {
      console.error('Error checking foreign keys:', fkError);
    } else {
      console.log('Users with subscription_plan_id:', fkCheck);
      console.log('This shows if the foreign key column exists and has values');
    }

    // 5. Check if RLS is enabled on verified_profiles
    console.log('\n5. Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('get_rls_status', { table_name: 'verified_profiles' })
      .catch(() => ({ data: null, error: 'RPC function not available' }));

    if (rlsError) {
      console.log('Could not check RLS status via RPC, but this is normal');
      console.log('RLS might be enabled on verified_profiles table');
    } else {
      console.log('RLS status:', rlsStatus);
    }

  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugPlanFetch(); 