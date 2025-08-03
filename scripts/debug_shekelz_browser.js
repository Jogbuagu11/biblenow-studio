const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugShekelzBrowser() {
  console.log('🔍 Debugging Shekelz Browser Issues...\n');

  try {
    // Check if there are any users in the system
    console.log('1. Checking existing users...');
    
    const { data: verifiedUsers, error: verifiedError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email, ministry_name, shekel_balance')
      .limit(5);

    if (verifiedError) {
      console.error('Error fetching verified users:', verifiedError);
    } else {
      console.log('✅ Verified users found:', verifiedUsers?.length || 0);
      if (verifiedUsers && verifiedUsers.length > 0) {
        console.log('Sample verified user:', verifiedUsers[0]);
      }
    }

    const { data: regularUsers, error: regularError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, shekel_balance')
      .limit(5);

    if (regularError) {
      console.error('Error fetching regular users:', regularError);
    } else {
      console.log('✅ Regular users found:', regularUsers?.length || 0);
      if (regularUsers && regularUsers.length > 0) {
        console.log('Sample regular user:', regularUsers[0]);
      }
    }

    // Check if there are any shekel gifts
    console.log('\n2. Checking shekel gifts...');
    
    const { data: gifts, error: giftsError } = await supabase
      .from('shekel_gifts')
      .select('*')
      .limit(5);

    if (giftsError) {
      console.error('Error fetching shekel gifts:', giftsError);
    } else {
      console.log('✅ Shekel gifts found:', gifts?.length || 0);
      if (gifts && gifts.length > 0) {
        console.log('Sample gift:', gifts[0]);
      }
    }

    // Test with a specific user ID (you can replace this with a real user ID from your system)
    console.log('\n3. Testing with specific user ID...');
    
    // Try with the first verified user if available
    if (verifiedUsers && verifiedUsers.length > 0) {
      const testUserId = verifiedUsers[0].id;
      console.log('Testing with user ID:', testUserId);

      // Test the exact queries that the frontend would make
      console.log('\n4. Testing frontend queries...');

      // Test getShekelSummary logic
      const { data: verifiedData, error: verifiedDataError } = await supabase
        .from('verified_profiles')
        .select('shekel_balance, ministry_name')
        .eq('id', testUserId)
        .single();

      if (verifiedDataError) {
        console.error('Error fetching verified user data:', verifiedDataError);
      } else {
        console.log('✅ Verified user data:', verifiedData);
        const isVerifiedUser = !!verifiedData.ministry_name;
        console.log('✅ Is verified user:', isVerifiedUser);
      }

      // Test getReceivedGifts
      const { data: receivedGifts, error: receivedError } = await supabase
        .from('shekel_gifts')
        .select('*')
        .eq('recipient_id', testUserId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('Error fetching received gifts:', receivedError);
      } else {
        console.log('✅ Received gifts count:', receivedGifts?.length || 0);
      }

      // Test getSentGifts
      const { data: sentGifts, error: sentError } = await supabase
        .from('shekel_gifts')
        .select('*')
        .eq('sender_id', testUserId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error('Error fetching sent gifts:', sentError);
      } else {
        console.log('✅ Sent gifts count:', sentGifts?.length || 0);
      }

      // Test getUserProfilesByIds
      const allGiftIds = [
        ...(receivedGifts?.map(g => g.sender_id) || []),
        ...(sentGifts?.map(g => g.recipient_id) || [])
      ];
      const uniqueIds = [...new Set(allGiftIds)];

      if (uniqueIds.length > 0) {
        console.log('Testing getUserProfilesByIds with IDs:', uniqueIds);

        const { data: verifiedProfiles, error: verifiedProfilesError } = await supabase
          .from('verified_profiles')
          .select('id, first_name, last_name, email, ministry_name')
          .in('id', uniqueIds);

        const { data: regularProfiles, error: regularProfilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', uniqueIds);

        console.log('✅ Verified profiles found:', verifiedProfiles?.length || 0);
        console.log('✅ Regular profiles found:', regularProfiles?.length || 0);
      }
    } else {
      console.log('❌ No verified users found to test with');
    }

    // Check RLS policies
    console.log('\n5. Checking RLS policies...');
    
    // Try to query without service role key to see if RLS is blocking
    const supabaseAnon = createClient(supabaseUrl, process.env.REACT_APP_SUPABASE_ANON_KEY);
    
    const { data: anonGifts, error: anonError } = await supabaseAnon
      .from('shekel_gifts')
      .select('*')
      .limit(1);

    if (anonError) {
      console.log('❌ RLS blocking anonymous access (expected):', anonError.message);
    } else {
      console.log('⚠️ RLS might not be properly configured');
    }

  } catch (error) {
    console.error('Error debugging shekelz browser:', error);
  }
}

// Run the debug
debugShekelzBrowser().then(() => {
  console.log('\n✅ Shekelz browser debugging complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Shekelz browser debugging failed:', error);
  process.exit(1);
}); 