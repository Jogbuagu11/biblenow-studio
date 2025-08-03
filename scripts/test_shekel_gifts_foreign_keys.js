const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testForeignKeys() {
  console.log('🔍 Testing Foreign Key Relationships...\n');

  try {
    // First, let's create some test users
    console.log('1. Creating test users...');
    
    // Create a test verified profile
    const testVerifiedUser = {
      id: '11111111-1111-1111-1111-111111111111',
      first_name: 'Test',
      last_name: 'Verified',
      email: 'test.verified@example.com',
      ministry_name: 'Test Ministry',
      shekel_balance: 1000
    };

    const { data: verifiedUser, error: verifiedError } = await supabase
      .from('verified_profiles')
      .upsert(testVerifiedUser)
      .select()
      .single();

    if (verifiedError) {
      console.error('Error creating verified user:', verifiedError);
    } else {
      console.log('✅ Created verified user:', verifiedUser.id);
    }

    // Create a test regular profile
    const testRegularUser = {
      id: '22222222-2222-2222-2222-222222222222',
      first_name: 'Test',
      last_name: 'Regular',
      email: 'test.regular@example.com',
      shekel_balance: 500
    };

    const { data: regularUser, error: regularError } = await supabase
      .from('profiles')
      .upsert(testRegularUser)
      .select()
      .single();

    if (regularError) {
      console.error('Error creating regular user:', regularError);
    } else {
      console.log('✅ Created regular user:', regularUser.id);
    }

    // Now test shekel_gifts foreign keys
    console.log('\n2. Testing shekel_gifts foreign keys...');

    // Test 1: Verified user sending to regular user
    const testGift1 = {
      sender_id: testVerifiedUser.id,
      recipient_id: testRegularUser.id,
      amount: 100,
      message: 'Test gift from verified to regular',
      is_anonymous: false,
      gift_type: 'donation',
      status: 'completed',
      total_amount: 100
    };

    const { data: gift1, error: gift1Error } = await supabase
      .from('shekel_gifts')
      .insert(testGift1)
      .select()
      .single();

    if (gift1Error) {
      console.error('❌ Error with verified→regular gift:', gift1Error);
    } else {
      console.log('✅ Verified→Regular gift created:', gift1.id);
    }

    // Test 2: Regular user sending to verified user
    const testGift2 = {
      sender_id: testRegularUser.id,
      recipient_id: testVerifiedUser.id,
      amount: 50,
      message: 'Test gift from regular to verified',
      is_anonymous: false,
      gift_type: 'donation',
      status: 'completed',
      total_amount: 50
    };

    const { data: gift2, error: gift2Error } = await supabase
      .from('shekel_gifts')
      .insert(testGift2)
      .select()
      .single();

    if (gift2Error) {
      console.error('❌ Error with regular→verified gift:', gift2Error);
    } else {
      console.log('✅ Regular→Verified gift created:', gift2.id);
    }

    // Test 3: Both verified users
    const testGift3 = {
      sender_id: testVerifiedUser.id,
      recipient_id: testVerifiedUser.id, // Self-gift for testing
      amount: 25,
      message: 'Test gift between verified users',
      is_anonymous: false,
      gift_type: 'donation',
      status: 'completed',
      total_amount: 25
    };

    const { data: gift3, error: gift3Error } = await supabase
      .from('shekel_gifts')
      .insert(testGift3)
      .select()
      .single();

    if (gift3Error) {
      console.error('❌ Error with verified→verified gift:', gift3Error);
    } else {
      console.log('✅ Verified→Verified gift created:', gift3.id);
    }

    // Test 4: Both regular users
    const testGift4 = {
      sender_id: testRegularUser.id,
      recipient_id: testRegularUser.id, // Self-gift for testing
      amount: 75,
      message: 'Test gift between regular users',
      is_anonymous: false,
      gift_type: 'donation',
      status: 'completed',
      total_amount: 75
    };

    const { data: gift4, error: gift4Error } = await supabase
      .from('shekel_gifts')
      .insert(testGift4)
      .select()
      .single();

    if (gift4Error) {
      console.error('❌ Error with regular→regular gift:', gift4Error);
    } else {
      console.log('✅ Regular→Regular gift created:', gift4.id);
    }

    // Now test the shekel service
    console.log('\n3. Testing shekel service...');
    
    // Import the shekel service
    const { ShekelService } = require('../src/services/shekelService');
    const shekelService = new ShekelService();

    // Test getting user balance
    console.log('\nTesting getUserBalance...');
    const balance1 = await shekelService.getUserBalance(testVerifiedUser.id);
    console.log('Verified user balance:', balance1);

    const balance2 = await shekelService.getUserBalance(testRegularUser.id);
    console.log('Regular user balance:', balance2);

    // Test getting received gifts
    console.log('\nTesting getReceivedGifts...');
    const receivedGifts1 = await shekelService.getReceivedGifts(testVerifiedUser.id);
    console.log('Verified user received gifts:', receivedGifts1.length);

    const receivedGifts2 = await shekelService.getReceivedGifts(testRegularUser.id);
    console.log('Regular user received gifts:', receivedGifts2.length);

    // Test getting sent gifts
    console.log('\nTesting getSentGifts...');
    const sentGifts1 = await shekelService.getSentGifts(testVerifiedUser.id);
    console.log('Verified user sent gifts:', sentGifts1.length);

    const sentGifts2 = await shekelService.getSentGifts(testRegularUser.id);
    console.log('Regular user sent gifts:', sentGifts2.length);

    // Clean up test data
    console.log('\n4. Cleaning up test data...');
    
    const { error: deleteGiftsError } = await supabase
      .from('shekel_gifts')
      .delete()
      .in('id', [gift1?.id, gift2?.id, gift3?.id, gift4?.id].filter(Boolean));

    if (deleteGiftsError) {
      console.error('Error deleting test gifts:', deleteGiftsError);
    } else {
      console.log('✅ Test gifts deleted');
    }

    const { error: deleteUsersError } = await supabase
      .from('verified_profiles')
      .delete()
      .eq('id', testVerifiedUser.id);

    if (deleteUsersError) {
      console.error('Error deleting test verified user:', deleteUsersError);
    } else {
      console.log('✅ Test verified user deleted');
    }

    const { error: deleteRegularError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', testRegularUser.id);

    if (deleteRegularError) {
      console.error('Error deleting test regular user:', deleteRegularError);
    } else {
      console.log('✅ Test regular user deleted');
    }

  } catch (error) {
    console.error('Error testing foreign keys:', error);
  }
}

// Run the test
testForeignKeys().then(() => {
  console.log('\n✅ Foreign key testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Foreign key testing failed:', error);
  process.exit(1);
}); 