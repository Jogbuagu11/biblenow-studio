const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBalanceCalculation() {
  console.log('🔍 Testing Balance Calculation...\n');

  try {
    const userId = '29a4414e-d60f-42c1-bbfd-9166f17211a0';
    console.log('Testing balance for user:', userId);

    // 1. Get current balance from database
    console.log('\n1. Current balance in database:');
    const { data: verifiedData, error: verifiedError } = await supabase
      .from('verified_profiles')
      .select('shekel_balance, ministry_name')
      .eq('id', userId)
      .single();

    if (verifiedError) {
      console.error('Error fetching verified user:', verifiedError);
    } else {
      console.log('✅ Verified user balance:', verifiedData.shekel_balance);
      console.log('✅ Ministry name:', verifiedData.ministry_name);
    }

    // 2. Calculate what the balance should be based on gifts
    console.log('\n2. Calculating expected balance from gifts:');
    
    // Get all received gifts
    const { data: receivedGifts, error: receivedError } = await supabase
      .from('shekel_gifts')
      .select('amount')
      .eq('recipient_id', userId)
      .eq('status', 'completed');

    if (receivedError) {
      console.error('Error fetching received gifts:', receivedError);
    } else {
      const totalReceived = receivedGifts.reduce((sum, gift) => sum + gift.amount, 0);
      console.log('✅ Total received:', totalReceived);
    }

    // Get all sent gifts
    const { data: sentGifts, error: sentError } = await supabase
      .from('shekel_gifts')
      .select('amount')
      .eq('sender_id', userId)
      .eq('status', 'completed');

    if (sentError) {
      console.error('Error fetching sent gifts:', sentError);
    } else {
      const totalSent = sentGifts.reduce((sum, gift) => sum + gift.amount, 0);
      console.log('✅ Total sent:', totalSent);
    }

    // Calculate expected balance
    const totalReceived = receivedGifts?.reduce((sum, gift) => sum + gift.amount, 0) || 0;
    const totalSent = sentGifts?.reduce((sum, gift) => sum + gift.amount, 0) || 0;
    const expectedBalance = totalReceived - totalSent;

    console.log('\n3. Balance Analysis:');
    console.log('📊 Current balance in database:', verifiedData?.shekel_balance || 0);
    console.log('📊 Total received from gifts:', totalReceived);
    console.log('📊 Total sent in gifts:', totalSent);
    console.log('📊 Expected balance (received - sent):', expectedBalance);
    console.log('📊 Difference (expected - current):', expectedBalance - (verifiedData?.shekel_balance || 0));

    // 4. Check if there are any triggers or functions that should update balance
    console.log('\n4. Checking for balance update triggers:');
    
    // Check if handle_shekel_gift_activity function exists
    try {
      const { data: triggerResult, error: triggerError } = await supabase
        .rpc('handle_shekel_gift_activity');
      
      if (triggerError) {
        console.log('❌ handle_shekel_gift_activity function error:', triggerError.message);
      } else {
        console.log('✅ handle_shekel_gift_activity function exists');
      }
    } catch (e) {
      console.log('❌ handle_shekel_gift_activity function not found');
    }

    // 5. Check if balance should be updated manually
    console.log('\n5. Recommendation:');
    if (expectedBalance !== (verifiedData?.shekel_balance || 0)) {
      console.log('⚠️ Balance mismatch detected!');
      console.log('The user should have a balance of', expectedBalance, 'but currently has', verifiedData?.shekel_balance || 0);
      console.log('This suggests that the balance is not being automatically updated when gifts are received.');
      
      // Option to update the balance
      console.log('\nWould you like to update the balance to the correct amount?');
      console.log('This would set the balance to:', expectedBalance);
    } else {
      console.log('✅ Balance is correct!');
    }

  } catch (error) {
    console.error('Error testing balance calculation:', error);
  }
}

// Run the test
testBalanceCalculation().then(() => {
  console.log('\n✅ Balance calculation testing complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Balance calculation testing failed:', error);
  process.exit(1);
}); 