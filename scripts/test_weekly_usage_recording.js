const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWeeklyUsageRecording() {
  console.log('=== Testing Weekly Usage Recording ===');
  
  // 1. Check current weekly usage data
  console.log('\n1. Current weekly usage data:');
  const { data: weeklyData, error: weeklyError } = await supabase
    .from('weekly_usage')
    .select(`
      *,
      verified_profiles!user_id (email)
    `)
    .order('week_start_date', { ascending: false });
  
  if (weeklyError) {
    console.error('Error fetching weekly usage:', weeklyError);
  } else {
    console.log('Weekly usage records:', weeklyData);
  }
  
  // 2. Check recent livestreams
  console.log('\n2. Recent livestreams:');
  const { data: streams, error: streamsError } = await supabase
    .from('livestreams')
    .select('id, title, streamer_id, started_at, ended_at, status')
    .order('started_at', { ascending: false })
    .limit(10);
  
  if (streamsError) {
    console.error('Error fetching livestreams:', streamsError);
  } else {
    console.log('Recent livestreams:', streams);
  }
  
  // 3. Check if triggers exist
  console.log('\n3. Checking triggers:');
  const { data: triggers, error: triggersError } = await supabase
    .rpc('get_triggers', { table_name: 'livestreams' })
    .catch(() => {
      // If RPC doesn't exist, try direct query
      return supabase
        .from('information_schema.triggers')
        .select('trigger_name, event_manipulation')
        .eq('event_object_table', 'livestreams')
        .eq('event_object_schema', 'public');
    });
  
  if (triggersError) {
    console.error('Error fetching triggers:', triggersError);
  } else {
    console.log('Triggers on livestreams table:', triggers);
  }
  
  // 4. Test the trigger function manually
  console.log('\n4. Testing trigger function:');
  const { data: functionTest, error: functionError } = await supabase
    .rpc('update_weekly_usage_on_stream_end')
    .catch(() => {
      console.log('Function not accessible via RPC, checking if it exists...');
      return { data: null, error: { message: 'Function exists but not accessible via RPC' } };
    });
  
  if (functionError) {
    console.log('Function test result:', functionError.message);
  } else {
    console.log('Function test result:', functionTest);
  }
  
  // 5. Check current week start date
  console.log('\n5. Current week calculation:');
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);
  
  console.log('Current date:', now.toISOString());
  console.log('Day of week:', dayOfWeek);
  console.log('Days to subtract:', daysToSubtract);
  console.log('Start of week:', startOfWeek.toISOString());
  console.log('Start of week (date only):', startOfWeek.toISOString().split('T')[0]);
  
  // 6. Test weekly usage calculation for a specific user
  if (streams && streams.length > 0) {
    console.log('\n6. Testing weekly usage for a specific user:');
    const testUserId = streams[0].streamer_id;
    console.log('Test user ID:', testUserId);
    
    // Get weekly usage for this user
    const { data: userWeekly, error: userWeeklyError } = await supabase
      .from('weekly_usage')
      .select('*')
      .eq('user_id', testUserId)
      .eq('week_start_date', startOfWeek.toISOString().split('T')[0])
      .single();
    
    if (userWeeklyError && userWeeklyError.code !== 'PGRST116') {
      console.error('Error fetching user weekly usage:', userWeeklyError);
    } else if (userWeekly) {
      console.log('User weekly usage:', userWeekly);
    } else {
      console.log('No weekly usage record found for this user');
    }
  }
}

testWeeklyUsageRecording().catch(console.error); 