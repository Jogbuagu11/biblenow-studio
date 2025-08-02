const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testShieldFunctions() {
  try {
    console.log('Testing shield and unshield functions...');
    
    // Test shield user function
    console.log('\n1. Testing shield-user function...');
    const shieldResult = await supabase.functions.invoke('shield-user', {
      body: { shieldedUserId: 'test-user-id' }
    });
    
    console.log('Shield result:', shieldResult);
    
    // Test unshield user function
    console.log('\n2. Testing unshield-user function...');
    const unshieldResult = await supabase.functions.invoke('unshield-user', {
      body: { shieldedUserId: 'test-user-id' }
    });
    
    console.log('Unshield result:', unshieldResult);
    
  } catch (error) {
    console.error('Error testing functions:', error);
  }
}

testShieldFunctions(); 