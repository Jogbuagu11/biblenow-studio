const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testShekelzDashboard() {
  console.log('🔍 Testing Shekelz Dashboard...\n');

  try {
    // Create a test user
    const testUserId = '33333333-3333-3333-3333-333333333333';
    
    // Create a test verified profile
    const testVerifiedUser = {
      id: testUserId,
      first_name: 'Test',
      last_name: 'User',
      email: 'test.user@example.com',
      ministry_name: 'Test Ministry',
      shekel_balance: 1500
    };

    const { data: verifiedUser, error: verifiedError } = await supabase
      .from('verified_profiles')
      .upsert(testVerifiedUser)
      .select()
      .single();

    if (verifiedError) {
      console.error('Error creating test user:', verifiedError);
      return;
    }

    console.log('✅ Created test user:', verifiedUser.id);

    // Create some test gifts
    const testGifts = [
      {
        sender_id: testUserId,
        recipient_id: testUserId, // Self-gift for testing
        amount: 100,
        message: 'Test gift 1',
        is_anonymous: false,
        gift_type: 'donation',
        status: 'completed',
        total_amount: 100
      },
      {
        sender_id: testUserId,
        recipient_id: testUserId,
        amount: 200,
        message: 'Test gift 2',
        is_anonymous: false,
        gift_type: 'tip',
        status: 'completed',
        total_amount: 200
      }
    ];

    const { data: gifts, error: giftsError } = await supabase
      .from('shekel_gifts')
      .insert(testGifts)
      .select();

    if (giftsError) {
      console.error('Error creating test gifts:', giftsError);
      return;
    }

    console.log('✅ Created test gifts:', gifts.length);

    // Now test the shekel service logic directly
    console.log('\n🔧 Testing Shekel Service Logic...');

    // Test 1: Get user balance
    console.log('\n1. Testing getUserBalance...');
    const { data: verifiedData, error: verifiedError2 } = await supabase
      .from('verified_profiles')
      .select('shekel_balance, ministry_name')
      .eq('id', testUserId)
      .single();

    if (verifiedError2) {
      console.error('Error fetching verified user:', verifiedError2);
    } else {
      console.log('✅ Verified user balance:', verifiedData.shekel_balance);
      console.log('✅ Is verified user:', !!verifiedData.ministry_name);
    }

    // Test 2: Get received gifts
    console.log('\n2. Testing getReceivedGifts...');
    const { data: receivedGifts, error: receivedError } = await supabase
      .from('shekel_gifts')
      .select('*')
      .eq('recipient_id', testUserId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (receivedError) {
      console.error('Error fetching received gifts:', receivedError);
    } else {
      console.log('✅ Received gifts count:', receivedGifts.length);
      console.log('✅ Received gifts:', receivedGifts.map(g => ({ id: g.id, amount: g.amount, message: g.message })));
    }

    // Test 3: Get sent gifts
    console.log('\n3. Testing getSentGifts...');
    const { data: sentGifts, error: sentError } = await supabase
      .from('shekel_gifts')
      .select('*')
      .eq('sender_id', testUserId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (sentError) {
      console.error('Error fetching sent gifts:', sentError);
    } else {
      console.log('✅ Sent gifts count:', sentGifts.length);
      console.log('✅ Sent gifts:', sentGifts.map(g => ({ id: g.id, amount: g.amount, message: g.message })));
    }

    // Test 4: Get user profiles by IDs
    console.log('\n4. Testing getUserProfilesByIds...');
    const senderIds = [...new Set(receivedGifts?.map(gift => gift.sender_id) || [])];
    console.log('Sender IDs to fetch:', senderIds);

    if (senderIds.length > 0) {
      // Get verified profiles
      const { data: verifiedProfiles, error: verifiedProfilesError } = await supabase
        .from('verified_profiles')
        .select('id, first_name, last_name, email, ministry_name')
        .in('id', senderIds);

      // Get regular profiles
      const { data: regularProfiles, error: regularProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', senderIds);

      console.log('✅ Verified profiles found:', verifiedProfiles?.length || 0);
      console.log('✅ Regular profiles found:', regularProfiles?.length || 0);

      const profiles = [];
      
      // Process verified profiles
      verifiedProfiles?.forEach(verified => {
        profiles.push({
          id: verified.id,
          name: verified.ministry_name || `${verified.first_name || ''} ${verified.last_name || ''}`.trim() || verified.email,
          email: verified.email
        });
      });

      // Process regular profiles (only if not already added as verified)
      regularProfiles?.forEach(profile => {
        if (!profiles.find(p => p.id === profile.id)) {
          profiles.push({
            id: profile.id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
            email: profile.email
          });
        }
      });

      console.log('✅ Combined profiles:', profiles);
    }

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    
    const { error: deleteGiftsError } = await supabase
      .from('shekel_gifts')
      .delete()
      .in('id', gifts.map(g => g.id));

    if (deleteGiftsError) {
      console.error('Error deleting test gifts:', deleteGiftsError);
    } else {
      console.log('✅ Test gifts deleted');
    }

    const { error: deleteUserError } = await supabase
      .from('verified_profiles')
      .delete()
      .eq('id', testUserId);

    if (deleteUserError) {
      console.error('Error deleting test user:', deleteUserError);
    } else {
      console.log('✅ Test user deleted');
    }

  } catch (error) {
    console.error('Error testing shekelz dashboard:', error);
  }
}

// Run the test
testShekelzDashboard().then(() => {
  console.log('\n✅ Shekelz dashboard testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Shekelz dashboard testing failed:', error);
  process.exit(1);
}); 