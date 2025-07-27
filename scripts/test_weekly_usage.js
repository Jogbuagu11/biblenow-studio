// Test script to verify weekly usage functionality
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWeeklyUsage() {
  console.log('Testing weekly usage functionality...\n');

  try {
    // 1. Check verified_profiles with subscription plans
    console.log('1. Checking verified_profiles with subscription plans...');
    const { data: profiles, error: profilesError } = await supabase
      .from('verified_profiles')
      .select(`
        id,
        email,
        subscription_plan,
        subscription_plan_id,
        subscription_plans!inner (
          name,
          streaming_minutes_limit,
          price_usd
        )
      `)
      .limit(5);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    console.log('Found profiles with subscription plans:', profiles);
    console.log('');

    // 2. Test with actual user data
    if (profiles && profiles.length > 0) {
      console.log('2. Testing with actual user data...');
      const testUser = profiles[0];
      console.log('Test user:', {
        id: testUser.id,
        email: testUser.email,
        subscription_plan: testUser.subscription_plan,
        subscription_plan_id: testUser.subscription_plan_id,
        plan_details: testUser.subscription_plans
      });
      
      const streamingMinutesLimit = testUser.subscription_plans?.streaming_minutes_limit;
      const hours = streamingMinutesLimit ? streamingMinutesLimit / 60 : 3;
      console.log(`User "${testUser.email}" has plan "${testUser.subscription_plan}" -> ${streamingMinutesLimit} minutes = ${hours} hours`);
      console.log('');

      // 3. Test weekly usage calculation
      console.log('3. Testing weekly usage calculation...');
      const usage = await getWeeklyUsage(testUser.id);
      console.log('Weekly usage for test user:', usage);
      console.log('');

      // 4. Test subscription plans table
      console.log('4. Checking subscription_plans table...');
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_usd');

      if (plansError) {
        console.error('Error fetching subscription plans:', plansError);
      } else {
        console.log('Available subscription plans:', plans);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function getWeeklyUsage(userId) {
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);

  console.log('Weekly usage calculation:', {
    userId,
    startOfWeek: startOfWeek.toISOString(),
    now: now.toISOString(),
    dayOfWeek
  });

  const { data, error } = await supabase
    .from('livestreams')
    .select('started_at, ended_at, title')
    .eq('streamer_id', userId)
    .eq('status', 'ended')
    .not('started_at', 'is', null)
    .not('ended_at', 'is', null)
    .gte('started_at', startOfWeek.toISOString())
    .lte('started_at', now.toISOString());

  if (error) {
    console.error('Error fetching weekly usage:', error);
    return { totalMinutes: 0, totalHours: 0 };
  }

  let totalMinutes = 0;
  if (data && data.length > 0) {
    console.log(`Found ${data.length} completed streams this week:`, data);
    
    totalMinutes = data.reduce((total, stream) => {
      const startTime = new Date(stream.started_at);
      const endTime = new Date(stream.ended_at);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      console.log(`Stream "${stream.title}": ${durationMinutes} minutes`);
      return total + durationMinutes;
    }, 0);
  } else {
    console.log('No completed streams found for this week');
  }

  return { totalMinutes, totalHours: totalMinutes / 60 };
}

// Run the test
testWeeklyUsage().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 