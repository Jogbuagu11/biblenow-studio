const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase URL and anon key here
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testShieldTable() {
  try {
    console.log('Testing user_shields table...');
    
    // Test if table exists by trying to select from it
    const { data, error } = await supabase
      .from('user_shields')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing user_shields table:', error);
      return;
    }
    
    console.log('✅ user_shields table exists and is accessible');
    console.log('Current records:', data);
    
    // Test insert
    const testUserId = 'test-user-id';
    const testShieldedUserId = 'test-shielded-user-id';
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_shields')
      .insert([{
        user_id: testUserId,
        shielded_user_id: testShieldedUserId
      }])
      .select();
    
    if (insertError) {
      console.error('Error inserting test record:', insertError);
      return;
    }
    
    console.log('✅ Insert test successful:', insertData);
    
    // Clean up test record
    const { error: deleteError } = await supabase
      .from('user_shields')
      .delete()
      .eq('user_id', testUserId)
      .eq('shielded_user_id', testShieldedUserId);
    
    if (deleteError) {
      console.error('Error cleaning up test record:', deleteError);
    } else {
      console.log('✅ Cleanup successful');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testShieldTable(); 